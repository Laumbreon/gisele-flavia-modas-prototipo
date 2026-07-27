const { pool, query } = require("../config/db");

const FORMAS_PAGAMENTO = ["dinheiro", "pix", "debito", "credito"];
const TIPOS_MOVIMENTACAO_MANUAL = ["entrada", "saida", "sangria", "reforco"];

function toMoney(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function usuarioId(req) {
  return req.usuario?.id || null;
}

function caixaSelectSql(where = "") {
  return `
    SELECT
      c.*,
      ua.nome AS usuario_abertura,
      uf.nome AS usuario_fechamento
    FROM caixas c
    LEFT JOIN usuarios ua ON ua.id = c.usuario_abertura_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    ${where}
  `;
}

async function buscarCaixaAberto(req, res) {
  try {
    const result = await query(
      `${caixaSelectSql("WHERE c.status = 'aberto'")}
       ORDER BY c.data_abertura DESC
       LIMIT 1;`
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error("Erro ao buscar caixa aberto:", error);
    res.status(500).json({ message: "Não foi possível buscar o caixa aberto." });
  }
}

async function abrirCaixa(req, res) {
  const valorInicial = toMoney(req.body.valor_inicial);

  if (valorInicial < 0) {
    return res.status(400).json({ message: "Valor inicial não pode ser negativo." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const aberto = await client.query(
      "SELECT id FROM caixas WHERE status = 'aberto' LIMIT 1 FOR UPDATE;"
    );

    if (aberto.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Já existe um caixa aberto." });
    }

    const result = await client.query(
      `
        INSERT INTO caixas (
          usuario_abertura_id,
          data_abertura,
          valor_inicial,
          valor_sistema_dinheiro,
          total_sistema,
          status,
          observacoes_abertura
        )
        VALUES ($1, NOW(), $2, $2, $2, 'aberto', $3)
        RETURNING *;
      `,
      [usuarioId(req), valorInicial, normalizeOptional(req.body.observacoes_abertura)]
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao abrir caixa:", error);
    res.status(500).json({ message: "Não foi possível abrir o caixa." });
  } finally {
    client.release();
  }
}

async function criarMovimentacao(req, res) {
  const caixaId = Number(req.params.id);
  const tipo = normalizeLower(req.body.tipo);
  const formaPagamento = normalizeLower(req.body.forma_pagamento);
  const valor = toMoney(req.body.valor, null);

  if (!Number.isInteger(caixaId) || caixaId <= 0) {
    return res.status(400).json({ message: "Caixa inválido." });
  }

  if (!TIPOS_MOVIMENTACAO_MANUAL.includes(tipo)) {
    return res.status(400).json({ message: "Tipo de movimentação inválido." });
  }

  if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
    return res.status(400).json({ message: "Forma de pagamento inválida." });
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ message: "Valor deve ser maior que zero." });
  }

  try {
    const caixa = await query("SELECT id, status FROM caixas WHERE id = $1;", [caixaId]);

    if (!caixa.rows.length) {
      return res.status(404).json({ message: "Caixa não encontrado." });
    }

    if (caixa.rows[0].status !== "aberto") {
      return res.status(400).json({ message: "Só é possível movimentar um caixa aberto." });
    }

    const result = await query(
      `
        INSERT INTO caixa_movimentacoes (
          caixa_id,
          usuario_id,
          tipo,
          forma_pagamento,
          valor,
          descricao
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      [
        caixaId,
        usuarioId(req),
        tipo,
        formaPagamento,
        valor,
        normalizeOptional(req.body.descricao),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar movimentação de caixa:", error);
    res.status(500).json({ message: "Não foi possível registrar a movimentação." });
  }
}

async function calcularTotaisSistema(client, caixaId, valorInicial) {
  const result = await client.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN
          CASE WHEN tipo IN ('saida', 'sangria') THEN -valor ELSE valor END
        ELSE 0 END), 0) AS dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN
          CASE WHEN tipo IN ('saida', 'sangria') THEN -valor ELSE valor END
        ELSE 0 END), 0) AS pix,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'debito' THEN
          CASE WHEN tipo IN ('saida', 'sangria') THEN -valor ELSE valor END
        ELSE 0 END), 0) AS debito,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'credito' THEN
          CASE WHEN tipo IN ('saida', 'sangria') THEN -valor ELSE valor END
        ELSE 0 END), 0) AS credito
      FROM caixa_movimentacoes
      WHERE caixa_id = $1;
    `,
    [caixaId]
  );

  const row = result.rows[0] || {};
  const dinheiro = toMoney(row.dinheiro) + valorInicial;
  const pix = toMoney(row.pix);
  const debito = toMoney(row.debito);
  const credito = toMoney(row.credito);

  return {
    dinheiro,
    pix,
    debito,
    credito,
    total: dinheiro + pix + debito + credito,
  };
}

async function fecharCaixa(req, res) {
  const caixaId = Number(req.params.id);

  if (!Number.isInteger(caixaId) || caixaId <= 0) {
    return res.status(400).json({ message: "Caixa inválido." });
  }

  const informado = {
    dinheiro: toMoney(req.body.dinheiro ?? req.body.valor_informado_dinheiro),
    pix: toMoney(req.body.pix ?? req.body.valor_informado_pix),
    debito: toMoney(req.body.debito ?? req.body.valor_informado_debito),
    credito: toMoney(req.body.credito ?? req.body.valor_informado_credito),
  };

  if (Object.values(informado).some(value => value < 0)) {
    return res.status(400).json({ message: "Valores informados não podem ser negativos." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const caixaResult = await client.query(
      "SELECT * FROM caixas WHERE id = $1 FOR UPDATE;",
      [caixaId]
    );

    if (!caixaResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Caixa não encontrado." });
    }

    const caixa = caixaResult.rows[0];

    if (caixa.status !== "aberto") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Este caixa já está fechado." });
    }

    const sistema = await calcularTotaisSistema(client, caixaId, toMoney(caixa.valor_inicial));
    const totalInformado = informado.dinheiro + informado.pix + informado.debito + informado.credito;
    const divergencia = totalInformado - sistema.total;

    const result = await client.query(
      `
        UPDATE caixas
        SET usuario_fechamento_id = $1,
            data_fechamento = NOW(),
            valor_informado_dinheiro = $2,
            valor_informado_pix = $3,
            valor_informado_debito = $4,
            valor_informado_credito = $5,
            valor_sistema_dinheiro = $6,
            valor_sistema_pix = $7,
            valor_sistema_debito = $8,
            valor_sistema_credito = $9,
            total_sistema = $10,
            total_informado = $11,
            divergencia = $12,
            status = 'fechado',
            observacoes_fechamento = $13,
            updated_at = NOW()
        WHERE id = $14
        RETURNING *;
      `,
      [
        usuarioId(req),
        informado.dinheiro,
        informado.pix,
        informado.debito,
        informado.credito,
        sistema.dinheiro,
        sistema.pix,
        sistema.debito,
        sistema.credito,
        sistema.total,
        totalInformado,
        divergencia,
        normalizeOptional(req.body.observacoes_fechamento),
        caixaId,
      ]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao fechar caixa:", error);
    res.status(500).json({ message: "Não foi possível fechar o caixa." });
  } finally {
    client.release();
  }
}

async function listarCaixas(req, res) {
  const filters = [];
  const params = [];

  if (req.query.status) {
    params.push(normalizeLower(req.query.status));
    filters.push(`c.status = $${params.length}`);
  }

  if (req.query.data_inicio) {
    params.push(req.query.data_inicio);
    filters.push(`c.data_abertura >= $${params.length}`);
  }

  if (req.query.data_fim) {
    params.push(req.query.data_fim);
    filters.push(`c.data_abertura <= $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const result = await query(
      `${caixaSelectSql(where)}
       ORDER BY c.data_abertura DESC
       LIMIT 100;`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar caixas:", error);
    res.status(500).json({ message: "Não foi possível listar os caixas." });
  }
}

async function detalharCaixa(req, res) {
  const caixaId = Number(req.params.id);

  if (!Number.isInteger(caixaId) || caixaId <= 0) {
    return res.status(400).json({ message: "Caixa inválido." });
  }

  try {
    const caixaResult = await query(
      `${caixaSelectSql("WHERE c.id = $1")} LIMIT 1;`,
      [caixaId]
    );

    if (!caixaResult.rows.length) {
      return res.status(404).json({ message: "Caixa não encontrado." });
    }

    const movimentacoesResult = await query(
      `
        SELECT
          cm.*,
          u.nome AS usuario
        FROM caixa_movimentacoes cm
        LEFT JOIN usuarios u ON u.id = cm.usuario_id
        WHERE cm.caixa_id = $1
        ORDER BY cm.created_at DESC;
      `,
      [caixaId]
    );

    res.json({
      caixa: caixaResult.rows[0],
      movimentacoes: movimentacoesResult.rows,
      totais: {
        sistema: {
          dinheiro: caixaResult.rows[0].valor_sistema_dinheiro,
          pix: caixaResult.rows[0].valor_sistema_pix,
          debito: caixaResult.rows[0].valor_sistema_debito,
          credito: caixaResult.rows[0].valor_sistema_credito,
          total: caixaResult.rows[0].total_sistema,
        },
        informado: {
          dinheiro: caixaResult.rows[0].valor_informado_dinheiro,
          pix: caixaResult.rows[0].valor_informado_pix,
          debito: caixaResult.rows[0].valor_informado_debito,
          credito: caixaResult.rows[0].valor_informado_credito,
          total: caixaResult.rows[0].total_informado,
        },
        divergencia: caixaResult.rows[0].divergencia,
      },
    });
  } catch (error) {
    console.error("Erro ao detalhar caixa:", error);
    res.status(500).json({ message: "Não foi possível detalhar o caixa." });
  }
}

module.exports = {
  buscarCaixaAberto,
  abrirCaixa,
  fecharCaixa,
  listarCaixas,
  detalharCaixa,
  criarMovimentacao,
};
