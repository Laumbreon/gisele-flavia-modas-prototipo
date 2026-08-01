const { pool, query } = require("../config/db");

const CONFIGURACOES = {
  faixa_superior: {
    padrao: "Frete grátis em compras acima de R$ 299,00 · Parcele em até 12x sem juros",
    limite: 180,
    descricao: "Mensagem exibida na faixa superior do site",
  },
  instagram_usuario: {
    padrao: "gisele_flavia_modas",
    limite: 80,
    descricao: "Usuário público do Instagram, sem arroba",
  },
  hero_titulo: {
    padrao: "Vestindo você para o sucesso.",
    limite: 120,
    descricao: "Título principal da página inicial",
  },
  hero_subtitulo: {
    padrao: "Peças que valorizam sua personalidade e acompanham sua rotina.",
    limite: 240,
    descricao: "Texto de apoio da página inicial",
  },
  frete_gratis_minimo: {
    padrao: "299.00",
    limite: 20,
    descricao: "Valor mínimo para comunicação de frete grátis",
  },
  parcelas_sem_juros: {
    padrao: "12",
    limite: 3,
    descricao: "Quantidade máxima de parcelas anunciadas",
  },
};

function normalizarConfiguracoes(rows) {
  const resultado = Object.fromEntries(
    Object.entries(CONFIGURACOES).map(([chave, definicao]) => [chave, definicao.padrao])
  );

  for (const row of rows) {
    if (CONFIGURACOES[row.chave]) resultado[row.chave] = row.valor;
  }

  return resultado;
}

async function listarConfiguracoes(_req, res) {
  try {
    const chaves = Object.keys(CONFIGURACOES);
    const result = await query(
      "SELECT chave, valor FROM configuracoes_loja WHERE chave = ANY($1::varchar[])",
      [chaves]
    );
    res.json(normalizarConfiguracoes(result.rows));
  } catch (error) {
    console.error("Erro ao listar configurações do site:", error);
    res.status(500).json({ message: "Não foi possível carregar as configurações do site." });
  }
}

async function salvarConfiguracoes(req, res) {
  const entradas = Object.entries(req.body || {}).filter(([chave]) => CONFIGURACOES[chave]);
  if (!entradas.length) {
    return res.status(400).json({ message: "Informe ao menos uma configuração válida." });
  }

  const valores = [];
  for (const [chave, valorOriginal] of entradas) {
    const definicao = CONFIGURACOES[chave];
    const valor = String(valorOriginal ?? "").trim().slice(0, definicao.limite);
    if (!valor) return res.status(400).json({ message: `O campo ${chave} não pode ficar vazio.` });

    if (chave === "instagram_usuario" && !/^[a-zA-Z0-9._]+$/.test(valor.replace(/^@/, ""))) {
      return res.status(400).json({ message: "Informe um usuário válido do Instagram." });
    }
    if (chave === "frete_gratis_minimo" && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
      return res.status(400).json({ message: "Informe um valor válido para o frete grátis." });
    }
    if (chave === "parcelas_sem_juros" && (!Number.isInteger(Number(valor)) || Number(valor) < 1 || Number(valor) > 24)) {
      return res.status(400).json({ message: "As parcelas devem estar entre 1 e 24." });
    }

    valores.push([chave, chave === "instagram_usuario" ? valor.replace(/^@/, "") : valor, definicao.descricao]);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [chave, valor, descricao] of valores) {
      await client.query(
        `INSERT INTO configuracoes_loja (chave, valor, descricao)
         VALUES ($1, $2, $3)
         ON CONFLICT (chave) DO UPDATE
         SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW()`,
        [chave, valor, descricao]
      );
    }
    await client.query("COMMIT");

    const result = await client.query(
      "SELECT chave, valor FROM configuracoes_loja WHERE chave = ANY($1::varchar[])",
      [Object.keys(CONFIGURACOES)]
    );
    res.json({ message: "Configurações salvas.", configuracoes: normalizarConfiguracoes(result.rows) });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao salvar configurações do site:", error);
    res.status(500).json({ message: "Não foi possível salvar as configurações do site." });
  } finally {
    client.release();
  }
}

module.exports = { listarConfiguracoes, salvarConfiguracoes };
