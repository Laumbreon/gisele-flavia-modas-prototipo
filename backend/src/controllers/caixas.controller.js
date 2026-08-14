const { pool, query } = require("../config/db");
const { importarVendasSitePendentes } = require("../services/caixa-site.service");

const FORMAS_PAGAMENTO = [
  "dinheiro",
  "pix",
  "debito",
  "credito",
  "vale_haver",
  "cartao_solocard",
  "cartao_brasil_card",
  "cartao_asu",
];
const FORMAS_CREDITO_EXTERNAS = ["credito", "vale_haver", "cartao_solocard", "cartao_brasil_card", "cartao_asu"];
const TIPOS_MOVIMENTACAO_MANUAL = ["entrada", "saida", "sangria", "reforco"];
const FORMAS_RELATORIO = [...FORMAS_PAGAMENTO, "mercado_pago", "cartao"];

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

function addReportFilter(filters, params, sql, value) {
  params.push(value);
  filters.push(sql.replace("?", `$${params.length}`));
}

function reportMoney(value) {
  return Number(toMoney(value).toFixed(2));
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

async function resumoPdv(req, res) {
  try {
    const result = await query(`
      SELECT c.id caixa_id,c.status,c.valor_inicial,
        c.valor_inicial + COALESCE(SUM(CASE WHEN cm.tipo IN ('saida','sangria') THEN -cm.valor ELSE cm.valor END)
          FILTER (WHERE COALESCE(v.canal_venda,'') <> 'site'),0) AS total_pdv
      FROM caixas c
      LEFT JOIN caixa_movimentacoes cm ON cm.caixa_id=c.id
      LEFT JOIN vendas v ON v.id=cm.venda_id
      WHERE c.status='aberto'
      GROUP BY c.id
      ORDER BY c.data_abertura DESC LIMIT 1`);
    const caixa = result.rows[0];
    res.json(caixa ? { caixa_id:caixa.caixa_id, status:caixa.status, total:Number(caixa.total_pdv || 0), pagamentos_site_incluidos:false } : { caixa_id:null, status:"fechado", total:0, pagamentos_site_incluidos:false });
  } catch (error) {
    console.error("Erro ao calcular resumo exclusivo do PDV:", error);
    res.status(500).json({ message:"Não foi possível calcular o saldo do PDV." });
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

    await importarVendasSitePendentes(client, result.rows[0].id, usuarioId(req));

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
        COALESCE(SUM(CASE WHEN forma_pagamento = ANY($2::text[]) THEN
          CASE WHEN tipo IN ('saida', 'sangria') THEN -valor ELSE valor END
        ELSE 0 END), 0) AS credito
      FROM caixa_movimentacoes
      WHERE caixa_id = $1;
    `,
    [caixaId, FORMAS_CREDITO_EXTERNAS]
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

async function relatorioCaixa(req, res) {
  const params = [];
  const vendaFilters = ["COALESCE(v.status_pagamento, 'pago') = 'pago'", "COALESCE(v.status, 'finalizada') NOT IN ('cancelada','cancelado')"];
  const pagamentoFilters = ["COALESCE(pb.status, 'pago') <> 'cancelado'"];
  const dataInicio = normalizeOptional(req.query.data_inicio);
  const dataFim = normalizeOptional(req.query.data_fim);
  const caixaId = normalizeOptional(req.query.caixa_id);
  const maquininhaId = normalizeOptional(req.query.maquininha_id);
  const formaPagamento = normalizeOptional(req.query.forma_pagamento);
  const statusCaixa = normalizeOptional(req.query.status);

  if (dataInicio) addReportFilter(vendaFilters, params, "v.created_at >= ?::date", dataInicio);
  if (dataFim) addReportFilter(vendaFilters, params, "v.created_at < (?::date + INTERVAL '1 day')", dataFim);
  if (caixaId && caixaId !== "todas") addReportFilter(vendaFilters, params, "v.caixa_id = ?::int", caixaId);
  if (statusCaixa && statusCaixa !== "todos") addReportFilter(vendaFilters, params, "COALESCE(cx.status, '') = ?", normalizeLower(statusCaixa));
  if (maquininhaId && maquininhaId !== "todas") addReportFilter(pagamentoFilters, params, "COALESCE(pb.maquininha_id, 0) = ?::int", maquininhaId);
  if (formaPagamento && formaPagamento !== "todas") addReportFilter(pagamentoFilters, params, "pb.forma_pagamento = ?", normalizeLower(formaPagamento));

  const vendaWhere = vendaFilters.length ? `WHERE ${vendaFilters.join(" AND ")}` : "";
  const pagamentoWhere = pagamentoFilters.length ? `WHERE ${pagamentoFilters.join(" AND ")}` : "";
  const baseSql = `
    WITH vendas_filtradas AS (
      SELECT v.*, c.nome AS cliente, u.nome AS operador, cx.status AS caixa_status, cx.valor_inicial
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN caixas cx ON cx.id = v.caixa_id
      ${vendaWhere}
    ),
    pagamentos_base AS (
      SELECT pv.venda_id, pv.caixa_id, pv.maquininha_id, pv.forma_pagamento, pv.valor, pv.status
      FROM pagamentos_venda pv
      JOIN vendas_filtradas v ON v.id = pv.venda_id
      WHERE COALESCE(pv.status, 'pago') <> 'cancelado'
      UNION ALL
      SELECT v.id AS venda_id, v.caixa_id, v.maquininha_id, v.forma_pagamento, COALESCE(v.total_pago, v.total, 0) AS valor, v.status_pagamento AS status
      FROM vendas_filtradas v
      WHERE NOT EXISTS (
        SELECT 1 FROM pagamentos_venda pv
        WHERE pv.venda_id = v.id AND COALESCE(pv.status, 'pago') <> 'cancelado'
      )
    ),
    pagamentos_filtrados AS (
      SELECT
        pb.*,
        COALESCE(m.nome, 'Sem maquininha / Manual') AS maquininha,
        m.codigo_externo,
        m.pdv_codigo,
        m.terminal_tipo,
        m.mercado_pago_terminal_id
      FROM pagamentos_base pb
      LEFT JOIN maquininhas m ON m.id = pb.maquininha_id
      ${pagamentoWhere}
    ),
    vendas_relatorio AS (
      SELECT DISTINCT v.*
      FROM vendas_filtradas v
      JOIN pagamentos_filtrados pf ON pf.venda_id = v.id
    )
  `;

  try {
    const [resumoResult, formasResult, maquinasResult, vendasResult, caixasResult] = await Promise.all([
      query(`${baseSql}
        SELECT
          COALESCE(SUM(pf.valor),0) AS total_vendido,
          COUNT(DISTINCT pf.venda_id)::int AS quantidade_vendas,
          COALESCE((SELECT SUM(iv.quantidade)::int FROM itens_venda iv JOIN vendas_relatorio vr ON vr.id = iv.venda_id),0) AS quantidade_itens,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='dinheiro'),0) AS dinheiro,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='pix'),0) AS pix,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='debito'),0) AS debito,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='credito'),0) AS credito,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='vale_haver'),0) AS vale_haver,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='cartao_solocard'),0) AS cartao_solocard,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='cartao_brasil_card'),0) AS cartao_brasil_card,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='cartao_asu'),0) AS cartao_asu,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='mercado_pago'),0) AS mercado_pago,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento='cartao'),0) AS cartao,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento IN ('vale_haver','cartao_solocard','cartao_brasil_card','cartao_asu')),0) AS total_externo,
          COALESCE(SUM(pf.valor) FILTER (WHERE pf.forma_pagamento IN ('debito','credito','cartao','cartao_solocard','cartao_brasil_card','cartao_asu')),0) AS total_cartoes,
          COALESCE((SELECT SUM(DISTINCT vr.valor_inicial) FROM vendas_relatorio vr WHERE vr.caixa_id IS NOT NULL),0) AS valor_inicial
        FROM pagamentos_filtrados pf;`, params),
      query(`${baseSql}
        SELECT pf.forma_pagamento, COUNT(DISTINCT pf.venda_id)::int AS quantidade, COALESCE(SUM(pf.valor),0) AS total
        FROM pagamentos_filtrados pf
        GROUP BY pf.forma_pagamento
        ORDER BY total DESC, pf.forma_pagamento;`, params),
      query(`${baseSql}
        SELECT COALESCE(pf.maquininha_id,0) AS maquininha_id, pf.maquininha, pf.codigo_externo, pf.pdv_codigo, pf.terminal_tipo, pf.mercado_pago_terminal_id, pf.forma_pagamento, COUNT(DISTINCT pf.venda_id)::int AS quantidade, COALESCE(SUM(pf.valor),0) AS total
        FROM pagamentos_filtrados pf
        GROUP BY COALESCE(pf.maquininha_id,0), pf.maquininha, pf.codigo_externo, pf.pdv_codigo, pf.terminal_tipo, pf.mercado_pago_terminal_id, pf.forma_pagamento
        ORDER BY pf.maquininha, pf.forma_pagamento;`, params),
      query(`${baseSql}
        SELECT
          vr.id,
          vr.created_at,
          vr.caixa_id,
          vr.cliente,
          vr.operador,
          pf.forma_pagamento,
          COALESCE(pf.maquininha, 'Sem maquininha / Manual') AS maquininha,
          pf.maquininha_id,
          pf.codigo_externo,
          pf.pdv_codigo,
          pf.mercado_pago_terminal_id,
          pf.valor AS valor_pagamento,
          vr.total AS total_venda,
          vr.status AS status,
          vr.status_pagamento,
          vr.observacoes,
          json_build_array(json_build_object('forma_pagamento',pf.forma_pagamento,'valor',pf.valor,'maquininha',pf.maquininha,'maquininha_id',pf.maquininha_id)) AS pagamentos
        FROM vendas_relatorio vr
        JOIN pagamentos_filtrados pf ON pf.venda_id = vr.id
        ORDER BY vr.created_at DESC, vr.id DESC, pf.forma_pagamento
        LIMIT 300;`, params),
      query(`${baseSql}
        SELECT
          cx.id,
          cx.status,
          ua.nome AS responsavel,
          uf.nome AS responsavel_fechamento,
          cx.data_abertura AS aberto_em,
          cx.data_fechamento AS fechado_em,
          cx.valor_inicial,
          cx.valor_informado_dinheiro,
          cx.valor_informado_pix,
          cx.valor_informado_debito,
          cx.valor_informado_credito,
          cx.total_informado AS valor_informado,
          cx.total_sistema,
          cx.divergencia AS diferenca,
          cx.observacoes_fechamento,
          COUNT(DISTINCT vr.id)::int AS quantidade_vendas
        FROM vendas_relatorio vr
        JOIN caixas cx ON cx.id = vr.caixa_id
        LEFT JOIN usuarios ua ON ua.id = cx.usuario_abertura_id
        LEFT JOIN usuarios uf ON uf.id = cx.usuario_fechamento_id
        GROUP BY cx.id, ua.nome, uf.nome
        ORDER BY cx.data_abertura DESC;`, params),
    ]);

    const caixas = caixasResult.rows.map((caixa) => ({
      ...caixa,
      valor_inicial: reportMoney(caixa.valor_inicial),
      valor_informado: caixa.valor_informado == null ? null : reportMoney(caixa.valor_informado),
      total_sistema: reportMoney(caixa.total_sistema),
      diferenca: reportMoney(caixa.diferenca),
    }));
    const caixaPrincipal = caixas.length === 1 ? caixas[0] : null;
    const alertas = [];
    caixas.forEach((caixa) => {
      if (caixa.status === "aberto") alertas.push({ tipo: "info", mensagem: `Caixa #${caixa.id} ainda está aberto.` });
      if (!caixa.fechado_em) alertas.push({ tipo: "info", mensagem: `Fechamento do caixa #${caixa.id} ainda não realizado.` });
      if (Math.abs(Number(caixa.diferenca || 0)) > 0.009) alertas.push({ tipo: "atencao", mensagem: `Diferença de R$ ${reportMoney(caixa.diferenca).toFixed(2)} no caixa #${caixa.id}.` });
    });
    maquinasResult.rows
      .filter((item) => !Number(item.maquininha_id) && ["pix", "debito", "credito"].includes(item.forma_pagamento))
      .forEach((item) => alertas.push({ tipo: "atencao", mensagem: `${item.quantidade} pagamento(s) em ${item.forma_pagamento} sem maquininha vinculada.` }));
    const externo = formasResult.rows.filter((item) => ["vale_haver", "cartao_solocard", "cartao_brasil_card", "cartao_asu"].includes(item.forma_pagamento));
    if (externo.length) alertas.push({ tipo: "info", mensagem: "Há pagamentos externos/manuais no relatório." });

    const porMaquininha = Object.values(maquinasResult.rows.reduce((map, item) => {
      const key = Number(item.maquininha_id || 0);
      map[key] ||= {
        maquininha_id: key || null,
        maquininha_nome: item.maquininha,
        codigo_externo: item.codigo_externo || item.pdv_codigo || item.mercado_pago_terminal_id || null,
        terminal_tipo: item.terminal_tipo || null,
        total: 0,
        quantidade: 0,
        formas: [],
      };
      const total = reportMoney(item.total);
      map[key].total += total;
      map[key].quantidade += Number(item.quantidade || 0);
      map[key].formas.push({ forma_pagamento: item.forma_pagamento, label: item.forma_pagamento, quantidade: Number(item.quantidade || 0), total });
      return map;
    }, {})).map((item) => ({ ...item, total: reportMoney(item.total) }));

    res.json({
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      filtros: {
        data_inicio: dataInicio,
        data_fim: dataFim,
        caixa_id: caixaId || "todas",
        maquininha_id: maquininhaId || "todas",
        forma_pagamento: formaPagamento || "todas",
        status: statusCaixa || "todos",
      },
      caixa: caixaPrincipal,
      caixas,
      alertas,
      formas_disponiveis: FORMAS_RELATORIO,
      resumo: resumoResult.rows[0] || {},
      por_forma_pagamento: formasResult.rows,
      por_maquininha: porMaquininha,
      vendas: vendasResult.rows,
    });
  } catch (error) {
    console.error("Erro ao gerar relatÃ³rio de caixa:", error);
    res.status(500).json({ message: "NÃ£o foi possÃ­vel gerar o relatÃ³rio de caixa." });
  }
}

async function atualizarCaixa(req, res) {
  const caixaId = Number(req.params.id);
  const valorInicial = toMoney(req.body.valor_inicial, null);
  if (!Number.isInteger(caixaId) || caixaId <= 0) return res.status(400).json({ message: "Caixa inválido." });
  if (!Number.isFinite(valorInicial) || valorInicial < 0) return res.status(400).json({ message: "Valor inicial inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const atual = (await client.query("SELECT * FROM caixas WHERE id=$1 FOR UPDATE", [caixaId])).rows[0];
    if (!atual) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Caixa não encontrado." }); }
    const sistema = await calcularTotaisSistema(client, caixaId, valorInicial);
    const fechado = atual.status === "fechado";
    const informado = {
      dinheiro: fechado ? toMoney(req.body.dinheiro ?? req.body.valor_informado_dinheiro ?? atual.valor_informado_dinheiro) : null,
      pix: fechado ? toMoney(req.body.pix ?? req.body.valor_informado_pix ?? atual.valor_informado_pix) : null,
      debito: fechado ? toMoney(req.body.debito ?? req.body.valor_informado_debito ?? atual.valor_informado_debito) : null,
      credito: fechado ? toMoney(req.body.credito ?? req.body.valor_informado_credito ?? atual.valor_informado_credito) : null,
    };
    if (fechado && Object.values(informado).some(value => value < 0)) throw Object.assign(new Error("Valores informados não podem ser negativos."), { statusCode: 400 });
    const totalInformado = fechado ? informado.dinheiro + informado.pix + informado.debito + informado.credito : 0;
    const result = await client.query(`UPDATE caixas SET valor_inicial=$2,observacoes_abertura=$3,
      observacoes_fechamento=$4,valor_sistema_dinheiro=$5,valor_sistema_pix=$6,
      valor_sistema_debito=$7,valor_sistema_credito=$8,total_sistema=$9,
      valor_informado_dinheiro=$10,valor_informado_pix=$11,valor_informado_debito=$12,
      valor_informado_credito=$13,total_informado=$14,divergencia=$15,updated_at=NOW()
      WHERE id=$1 RETURNING *`, [caixaId, valorInicial, normalizeOptional(req.body.observacoes_abertura),
      normalizeOptional(req.body.observacoes_fechamento), sistema.dinheiro, sistema.pix, sistema.debito,
      sistema.credito, sistema.total, informado.dinheiro, informado.pix, informado.debito, informado.credito,
      totalInformado, fechado ? totalInformado - sistema.total : 0]);
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar caixa:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Não foi possível atualizar o caixa." });
  } finally { client.release(); }
}

async function excluirCaixa(req, res) {
  const caixaId = Number(req.params.id);
  if (!Number.isInteger(caixaId) || caixaId <= 0) return res.status(400).json({ message: "Caixa inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const caixa = (await client.query("SELECT id,status FROM caixas WHERE id=$1 FOR UPDATE", [caixaId])).rows[0];
    if (!caixa) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Caixa não encontrado." }); }
    const vendas = Number((await client.query("SELECT COUNT(*)::int AS total FROM vendas WHERE caixa_id=$1", [caixaId])).rows[0].total);
    if (vendas > 0) { await client.query("ROLLBACK"); return res.status(409).json({ message: `Este caixa possui ${vendas} venda(s) vinculada(s) e não pode ser excluído. Edite o histórico para preservar a auditoria.` }); }
    await client.query("DELETE FROM caixas WHERE id=$1", [caixaId]);
    await client.query("COMMIT");
    res.json({ ok: true, message: "Histórico de caixa excluído." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao excluir caixa:", error);
    res.status(500).json({ message: "Não foi possível excluir o caixa." });
  } finally { client.release(); }
}

module.exports = {
  buscarCaixaAberto,
  resumoPdv,
  abrirCaixa,
  fecharCaixa,
  listarCaixas,
  relatorioCaixa,
  detalharCaixa,
  atualizarCaixa,
  excluirCaixa,
  criarMovimentacao,
};
