const { pool } = require("../config/db");

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function listarVendas(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.total,
        v.forma_pagamento,
        v.status,
        v.created_at,
        c.nome AS cliente,
        COALESCE(SUM(iv.quantidade), 0)::int AS quantidade_itens
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN itens_venda iv ON iv.venda_id = v.id
      GROUP BY v.id, c.nome
      ORDER BY v.created_at DESC
      LIMIT 50;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({
      message: "Não foi possível buscar as vendas no momento.",
    });
  }
}

async function criarVenda(req, res) {
  const clienteId = req.body.cliente_id ?? null;
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const formaPagamento = req.body.forma_pagamento || null;
  const desconto = toNumber(req.body.desconto);
  const frete = toNumber(req.body.frete);
  const observacoes = req.body.observacoes || null;

  if (!itens.length) {
    return res.status(400).json({ message: "Informe pelo menos um item para a venda." });
  }

  if (desconto < 0 || frete < 0) {
    return res.status(400).json({ message: "Desconto e frete não podem ser negativos." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const produtoId = Number(item.produto_id);
      const variacaoId = Number(item.variacao_id);
      const quantidade = Number(item.quantidade);
      const precoUnitario = toNumber(item.preco_unitario);

      if (!produtoId || !variacaoId) {
        throw validationError("Produto e variação são obrigatórios para todos os itens.");
      }

      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        throw validationError("A quantidade deve ser maior que zero.");
      }

      if (precoUnitario < 0) {
        throw validationError("O preço unitário não pode ser negativo.");
      }

      const estoqueResult = await client.query(
        `
          SELECT
            p.id AS produto_id,
            p.nome AS produto_nome,
            pv.id AS variacao_id,
            pv.tamanho,
            pv.cor,
            e.quantidade AS quantidade_estoque
          FROM produto_variacoes pv
          INNER JOIN produtos p ON p.id = pv.produto_id
          INNER JOIN estoque e ON e.produto_variacao_id = pv.id
          WHERE pv.id = $1 AND p.id = $2
          FOR UPDATE OF e;
        `,
        [variacaoId, produtoId]
      );

      if (!estoqueResult.rows.length) {
        throw validationError("Produto ou variação não encontrados.");
      }

      const estoque = estoqueResult.rows[0];

      if (Number(estoque.quantidade_estoque) < quantidade) {
        throw validationError(`Estoque insuficiente para ${estoque.produto_nome} (${estoque.tamanho}/${estoque.cor}).`);
      }

      const itemSubtotal = quantidade * precoUnitario;
      subtotal += itemSubtotal;

      itensProcessados.push({
        produto_id: estoque.produto_id,
        variacao_id: estoque.variacao_id,
        produto_nome: estoque.produto_nome,
        tamanho: estoque.tamanho,
        cor: estoque.cor,
        quantidade,
        preco_unitario: precoUnitario,
        subtotal: itemSubtotal,
      });
    }

    const total = subtotal - desconto + frete;

    if (total < 0) {
      throw validationError("O total da venda não pode ser negativo.");
    }

    const vendaResult = await client.query(
      `
        INSERT INTO vendas (cliente_id, subtotal, desconto, frete_valor, total, forma_pagamento, status, observacoes)
        VALUES ($1, $2, $3, $4, $5, $6, 'finalizada', $7)
        RETURNING id, cliente_id, subtotal, desconto, frete_valor, total, forma_pagamento, status, observacoes, created_at;
      `,
      [clienteId, subtotal, desconto, frete, total, formaPagamento, observacoes]
    );

    const venda = vendaResult.rows[0];
    const itensCriados = [];

    for (const item of itensProcessados) {
      const itemResult = await client.query(
        `
          INSERT INTO itens_venda (
            venda_id,
            produto_id,
            produto_variacao_id,
            produto_nome,
            tamanho,
            cor,
            quantidade,
            preco_unitario,
            subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, produto_id, produto_variacao_id, produto_nome, tamanho, cor, quantidade, preco_unitario, subtotal;
        `,
        [
          venda.id,
          item.produto_id,
          item.variacao_id,
          item.produto_nome,
          item.tamanho,
          item.cor,
          item.quantidade,
          item.preco_unitario,
          item.subtotal,
        ]
      );

      await client.query(
        `
          UPDATE estoque
          SET quantidade = quantidade - $1,
              updated_at = NOW()
          WHERE produto_variacao_id = $2;
        `,
        [item.quantidade, item.variacao_id]
      );

      await client.query(
        `
          INSERT INTO movimentacoes_estoque (
            produto_id,
            produto_variacao_id,
            tipo,
            quantidade,
            motivo,
            responsavel,
            observacoes
          )
          VALUES ($1, $2, 'saida', $3, 'Venda PDV', 'PDV', $4);
        `,
        [
          item.produto_id,
          item.variacao_id,
          item.quantidade,
          `Venda #${venda.id} - ${item.tamanho}/${item.cor}`,
        ]
      );

      itensCriados.push(itemResult.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      ...venda,
      itens: itensCriados,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Erro ao criar venda:", error);
    res.status(500).json({
      message: "Não foi possível criar a venda no momento.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  listarVendas,
  criarVenda,
};
