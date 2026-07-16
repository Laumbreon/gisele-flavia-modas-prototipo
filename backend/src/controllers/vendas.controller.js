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

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeDate(value) {
  const text = normalizeOptional(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const canalVenda = normalizeOptional(req.body.canal_venda) || "loja_fisica";
  const origemVenda = normalizeOptional(req.body.origem_venda);
  const temEntrega = req.body.tem_entrega === true;
  const entrega = req.body.entrega && typeof req.body.entrega === "object" ? req.body.entrega : null;
  const statusPagamento = normalizeOptional(req.body.status_pagamento) || "pago";
  const statusEntrega = temEntrega ? normalizeOptional(entrega?.status_entrega) || "pendente" : "sem_entrega";

  if (!itens.length) {
    return res.status(400).json({ message: "Informe pelo menos um item para a venda." });
  }

  if (desconto < 0 || frete < 0) {
    return res.status(400).json({ message: "Desconto e frete não podem ser negativos." });
  }

  if (temEntrega && !entrega) {
    return res.status(400).json({ message: "Informe os dados da entrega." });
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
        INSERT INTO vendas (
          cliente_id,
          subtotal,
          desconto,
          frete_valor,
          total,
          forma_pagamento,
          canal_venda,
          origem_venda,
          tem_entrega,
          status_pagamento,
          status_entrega,
          status,
          observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'finalizada', $12)
        RETURNING
          id,
          cliente_id,
          subtotal,
          desconto,
          frete_valor,
          total,
          forma_pagamento,
          canal_venda,
          origem_venda,
          tem_entrega,
          status_pagamento,
          status_entrega,
          status,
          observacoes,
          created_at;
      `,
      [
        clienteId,
        subtotal,
        desconto,
        frete,
        total,
        formaPagamento,
        canalVenda,
        origemVenda,
        temEntrega,
        statusPagamento,
        statusEntrega,
        observacoes,
      ]
    );

    const venda = vendaResult.rows[0];
    let entregaCriada = null;

    if (temEntrega && entrega) {
      const entregaResult = await client.query(
        `
          INSERT INTO venda_entregas (
            venda_id,
            tipo_entrega,
            status_entrega,
            valor_frete,
            destinatario_nome,
            destinatario_telefone,
            cep,
            estado,
            cidade,
            bairro,
            endereco,
            numero,
            complemento,
            referencia,
            transportadora,
            codigo_rastreio,
            motoboy_nome,
            data_prevista,
            data_entrega,
            observacoes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *;
        `,
        [
          venda.id,
          normalizeOptional(entrega.tipo_entrega) || "entrega_local",
          statusEntrega,
          toNumber(entrega.valor_frete, frete),
          normalizeOptional(entrega.destinatario_nome),
          normalizeOptional(entrega.destinatario_telefone),
          normalizeOptional(entrega.cep),
          normalizeOptional(entrega.estado),
          normalizeOptional(entrega.cidade),
          normalizeOptional(entrega.bairro),
          normalizeOptional(entrega.endereco),
          normalizeOptional(entrega.numero),
          normalizeOptional(entrega.complemento),
          normalizeOptional(entrega.referencia),
          normalizeOptional(entrega.transportadora),
          normalizeOptional(entrega.codigo_rastreio),
          normalizeOptional(entrega.motoboy_nome),
          normalizeDate(entrega.data_prevista),
          normalizeDate(entrega.data_entrega),
          normalizeOptional(entrega.observacoes),
        ]
      );

      entregaCriada = entregaResult.rows[0];
    }

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
      entrega: entregaCriada,
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
