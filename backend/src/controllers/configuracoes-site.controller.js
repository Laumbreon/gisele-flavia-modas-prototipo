const fs = require("fs");
const path = require("path");
const { pool, query } = require("../config/db");
const { uploadsDir } = require("../middlewares/upload-carrossel.middleware");
const { uploadsDir: informativosDir } = require("../middlewares/upload-informativo.middleware");

const CARROSSEL_PADRAO = [
  "https://images.unsplash.com/photo-1664076458686-3449062080ac?w=1400&h=900&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1779398968962-b3ad149b57b6?w=1400&h=900&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1763971922553-c9f37d1fe06f?w=1400&h=900&fit=crop&auto=format",
];

const CONFIGURACOES = {
  faixa_superior: {
    padrao: "Frete grátis em compras acima de R$ 299,00 · Parcele em até 3x sem juros",
    limite: 180,
    descricao: "Mensagem exibida na faixa superior do site",
  },
  instagram_usuario: {
    padrao: "gisele_flavia_modas",
    limite: 80,
    descricao: "Usuário público do Instagram, sem arroba",
  },
  contato_telefone: { padrao: "", limite: 30, descricao: "Telefone público da loja" },
  contato_whatsapp: { padrao: "", limite: 30, descricao: "WhatsApp público da loja" },
  contato_email: { padrao: "", limite: 160, descricao: "E-mail público da loja" },
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
  frete_promocional_minimo: {
    padrao: "300.00",
    limite: 20,
    descricao: "Subtotal mínimo para aplicar o frete promocional",
  },
  frete_promocional_valor: {
    padrao: "19.99",
    limite: 20,
    descricao: "Valor do frete promocional",
  },
  parcelas_sem_juros: {
    padrao: "3",
    limite: 3,
    descricao: "Quantidade máxima de parcelas anunciadas",
  },
  carrossel_imagens: {
    padrao: CARROSSEL_PADRAO,
    limite: 3000,
    descricao: "Imagens do carrossel principal da página inicial",
  },
  imagem_informativa: {
    padrao: "",
    limite: 500,
    descricao: "Imagem informativa exibida abaixo do carrossel principal",
  },
  categorias_titulo: { padrao: "Explore por Categoria", limite: 100, descricao: "Título da seção de categorias" },
  categorias_subtitulo: { padrao: "Descubra peças para cada momento da sua vida", limite: 180, descricao: "Subtítulo da seção de categorias" },
  vendidos_selo: { padrao: "Favoritas", limite: 60, descricao: "Chamada da seção de mais vendidos" },
  vendidos_titulo: { padrao: "Mais Vendidos", limite: 100, descricao: "Título da seção de mais vendidos" },
  campanha_selo: { padrao: "Exclusividade", limite: 60, descricao: "Chamada do banner de campanha" },
  campanha_titulo: { padrao: "Nova Coleção Inverno", limite: 120, descricao: "Título do banner de campanha" },
  campanha_texto: { padrao: "Peças exclusivas com tecidos nobres e cortes impecáveis", limite: 220, descricao: "Texto do banner de campanha" },
  campanha_categoria: { padrao: "Novidades", limite: 120, descricao: "Categoria aberta pelo botão do banner de campanha" },
  campanha_imagem: { padrao: "https://images.unsplash.com/photo-1779398969439-99c38b9df638?w=1400&h=600&fit=crop&auto=format", limite: 500, descricao: "Imagem do banner de campanha" },
  novidades_selo: { padrao: "Recém chegadas", limite: 60, descricao: "Chamada da seção de novidades" },
  novidades_titulo: { padrao: "Novidades", limite: 100, descricao: "Título da seção de novidades" },
  looks_selo: { padrao: "Inspiração", limite: 60, descricao: "Chamada da seção de looks" },
  looks_titulo: { padrao: "Looks em Destaque", limite: 100, descricao: "Título da seção de looks" },
  depoimentos_titulo: { padrao: "O que nossas clientes dizem", limite: 120, descricao: "Título da seção de depoimentos" },
  instagram_selo: { padrao: "Fique por dentro", limite: 60, descricao: "Chamada da seção do Instagram" },
  instagram_titulo: { padrao: "Acompanhe as novidades em primeira mão", limite: 140, descricao: "Título da seção do Instagram" },
  instagram_texto: { padrao: "Lançamentos, combinações e atendimento direto pelo Instagram.", limite: 220, descricao: "Texto da seção do Instagram" },
  politicas_titulo: { padrao: "Atenção", limite: 100, descricao: "Título da seção de políticas" },
  politica_entrega_titulo: { padrao: "Prazo de postagem e entrega", limite: 120, descricao: "Título da política de entrega" },
  politica_entrega_texto: { padrao: "O prazo de entrega começa a contar após a postagem do pedido.\nConsidere até 3 dias para postagem + o prazo de entrega informado na finalização da compra, conforme o frete escolhido.", limite: 1200, descricao: "Texto da política de entrega" },
  politica_trocas_titulo: { padrao: "Trocas e devoluções", limite: 120, descricao: "Título da política de trocas" },
  politica_trocas_texto: { padrao: "Não efetuamos trocas ou devoluções em peças do departamento de Promoções e em casos de avaria ou defeito.\nEsta condição inclui promoções de Black Friday, Bye Bye Verão, Bye Bye Inverno e SOS Jeans, entre outras campanhas promocionais.", limite: 1200, descricao: "Texto da política de trocas e devoluções" },
};

function normalizarConfiguracoes(rows) {
  const resultado = Object.fromEntries(
    Object.entries(CONFIGURACOES).map(([chave, definicao]) => [chave, definicao.padrao])
  );

  for (const row of rows) {
    if (row.chave === "carrossel_imagens") {
      try {
        const imagens = JSON.parse(row.valor);
        if (Array.isArray(imagens) && imagens.length) resultado[row.chave] = imagens.slice(0, 3);
      } catch { /* Mantém as imagens padrão se o valor salvo estiver inválido. */ }
    } else if (CONFIGURACOES[row.chave]) resultado[row.chave] = row.valor;
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
  const entradas = Object.entries(req.body || {}).filter(([chave]) => CONFIGURACOES[chave] && !["carrossel_imagens", "imagem_informativa", "campanha_imagem"].includes(chave));
  if (!entradas.length) {
    return res.status(400).json({ message: "Informe ao menos uma configuração válida." });
  }

  const valores = [];
  for (const [chave, valorOriginal] of entradas) {
    const definicao = CONFIGURACOES[chave];
    const valor = String(valorOriginal ?? "").trim().slice(0, definicao.limite);
    const contatosOpcionais = ["contato_telefone", "contato_whatsapp", "contato_email"];
    if (!valor && !contatosOpcionais.includes(chave)) return res.status(400).json({ message: `O campo ${chave} não pode ficar vazio.` });

    if (chave === "instagram_usuario" && !/^[a-zA-Z0-9._]+$/.test(valor.replace(/^@/, ""))) {
      return res.status(400).json({ message: "Informe um usuário válido do Instagram." });
    }
    if (chave === "contato_email" && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      return res.status(400).json({ message: "Informe um e-mail de contato válido." });
    }
    if (chave === "contato_whatsapp" && valor && !/^\+?[\d\s().-]{10,30}$/.test(valor)) {
      return res.status(400).json({ message: "Informe um WhatsApp válido, com DDD." });
    }
    if (["frete_gratis_minimo", "frete_promocional_minimo", "frete_promocional_valor"].includes(chave) && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
      return res.status(400).json({ message: "Informe valores válidos para as regras de frete." });
    }
    if (chave === "parcelas_sem_juros" && (!Number.isInteger(Number(valor)) || Number(valor) < 1 || Number(valor) > 3)) {
      return res.status(400).json({ message: "As parcelas devem estar entre 1 e 3." });
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

function excluirUpload(url) {
  if (!String(url || "").startsWith("/uploads/carrossel/")) return;
  const arquivo = path.resolve(uploadsDir, path.basename(url));
  if (path.dirname(arquivo) === uploadsDir) {
    fs.promises.unlink(arquivo).catch(error => { if (error.code !== "ENOENT") console.error("Erro ao excluir imagem antiga do carrossel:", error); });
  }
}

async function uploadCarrossel(req, res) {
  const arquivos = req.files || [];
  if (!arquivos.length) return res.status(400).json({ message: "Selecione de 1 a 3 imagens." });
  const imagens = arquivos.map(file => `/uploads/carrossel/${file.filename}`);
  try {
    const anterior = await query("SELECT valor FROM configuracoes_loja WHERE chave = 'carrossel_imagens'");
    await query(
      `INSERT INTO configuracoes_loja (chave, valor, descricao)
       VALUES ('carrossel_imagens', $1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW()`,
      [JSON.stringify(imagens), CONFIGURACOES.carrossel_imagens.descricao]
    );
    if (anterior.rows[0]?.valor) {
      try { JSON.parse(anterior.rows[0].valor).forEach(excluirUpload); } catch { /* Nada para excluir. */ }
    }
    return res.json({ message: "Imagens do carrossel atualizadas.", imagens });
  } catch (error) {
    imagens.forEach(excluirUpload);
    console.error("Erro ao atualizar carrossel:", error);
    return res.status(500).json({ message: "Não foi possível atualizar as imagens do carrossel." });
  }
}

async function excluirImagemCarrossel(req, res) {
  const indice = Number(req.params.indice);
  if (!Number.isInteger(indice) || indice < 0 || indice > 2) {
    return res.status(400).json({ message: "Imagem inválida." });
  }

  const client = await pool.connect();
  let removida = null;
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT valor FROM configuracoes_loja WHERE chave = 'carrossel_imagens' FOR UPDATE");
    const imagens = result.rows[0]?.valor ? JSON.parse(result.rows[0].valor) : [...CARROSSEL_PADRAO];
    if (!Array.isArray(imagens) || !imagens[indice]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Imagem não encontrada." });
    }
    if (imagens.length <= 1) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "O carrossel precisa manter pelo menos uma imagem." });
    }
    [removida] = imagens.splice(indice, 1);
    await client.query(
      `INSERT INTO configuracoes_loja (chave, valor, descricao)
       VALUES ('carrossel_imagens', $1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW()`,
      [JSON.stringify(imagens), CONFIGURACOES.carrossel_imagens.descricao]
    );
    await client.query("COMMIT");
    excluirUpload(removida);
    return res.json({ message: "Imagem excluída do carrossel.", imagens });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erro ao excluir imagem do carrossel:", error);
    return res.status(500).json({ message: "Não foi possível excluir a imagem do carrossel." });
  } finally {
    client.release();
  }
}

function excluirImagemInformativa(url) {
  if (!String(url || "").startsWith("/uploads/informativos/")) return;
  const arquivo = path.resolve(informativosDir, path.basename(url));
  if (path.dirname(arquivo) === informativosDir) {
    fs.promises.unlink(arquivo).catch(error => { if (error.code !== "ENOENT") console.error("Erro ao excluir imagem informativa antiga:", error); });
  }
}

async function uploadImagemInformativa(req, res) {
  if (!req.file) return res.status(400).json({ message: "Selecione uma imagem." });
  const novaImagem = `/uploads/informativos/${req.file.filename}`;
  try {
    const anterior = await query("SELECT valor FROM configuracoes_loja WHERE chave = 'imagem_informativa'");
    await query(
      `INSERT INTO configuracoes_loja (chave, valor, descricao)
       VALUES ('imagem_informativa', $1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW()`,
      [novaImagem, CONFIGURACOES.imagem_informativa.descricao]
    );
    excluirImagemInformativa(anterior.rows[0]?.valor);
    return res.json({ message: "Imagem informativa atualizada.", imagem: novaImagem });
  } catch (error) {
    excluirImagemInformativa(novaImagem);
    console.error("Erro ao atualizar imagem informativa:", error);
    return res.status(500).json({ message: "Não foi possível atualizar a imagem informativa." });
  }
}

async function uploadImagemCampanha(req, res) {
  if (!req.file) return res.status(400).json({ message: "Selecione uma imagem." });
  const novaImagem = `/uploads/informativos/${req.file.filename}`;
  try {
    const anterior = await query("SELECT valor FROM configuracoes_loja WHERE chave = 'campanha_imagem'");
    await query(
      `INSERT INTO configuracoes_loja (chave, valor, descricao)
       VALUES ('campanha_imagem', $1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW()`,
      [novaImagem, CONFIGURACOES.campanha_imagem.descricao]
    );
    excluirImagemInformativa(anterior.rows[0]?.valor);
    return res.json({ message: "Imagem da seção atualizada.", imagem: novaImagem });
  } catch (error) {
    excluirImagemInformativa(novaImagem);
    console.error("Erro ao atualizar imagem da campanha:", error);
    return res.status(500).json({ message: "Não foi possível atualizar a imagem da seção." });
  }
}

module.exports = { listarConfiguracoes, salvarConfiguracoes, uploadCarrossel, excluirImagemCarrossel, uploadImagemInformativa, uploadImagemCampanha };
