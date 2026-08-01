const { pool } = require("../config/db");

const FORMAS_PAGAMENTO = ["dinheiro", "pix", "debito", "credito"];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
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

function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDate(value) {
  const text = normalizeOptional(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function usuarioId(req) {
  return req.usuario?.id || null;
}

function buildPagamentos(reqBody, totalVenda) {
  if (Array.isArray(reqBody.pagamentos) && reqBody.pagamentos.length) {
    return reqBody.pagamentos.map((pagamento) => ({
      forma_pagamento: normalizeLower(pagamento.forma_pagamento),
      valor: roundMoney(pagamento.valor),
      maquininha_id: pagamento.maquininha_id ? Number(pagamento.maquininha_id) : null,
      observacoes: normalizeOptional(pagamento.observacoes),
    }));
  }

  return [
    {
      forma_pagamento: normalizeLower(reqBody.forma_pagamento || "dinheiro"),
      valor: roundMoney(totalVenda),
      maquininha_id: reqBody.maquininha_id ? Number(reqBody.maquininha_id) : null,
      observacoes: normalizeOptional(reqBody.observacoes),
      legacy: true,
    },
  ];
}

function validarPagamentos(pagamentos, totalVenda) {
  if (!pagamentos.length) {
    throw validationError("Informe ao menos um pagamento.");
  }

  pagamentos.forEach((pagamento) => {
    if (!FORMAS_PAGAMENTO.includes(pagamento.forma_pagamento)) {
      throw validationError("Forma de pagamento inválida.");
    }

    if (!Number.isFinite(pagamento.valor) || pagamento.valor <= 0) {
      throw validationError("Valor do pagamento deve ser maior que zero.");
    }

    if (
      pagamento.maquininha_id !== null
      && (!Number.isInteger(pagamento.maquininha_id) || pagamento.maquininha_id <= 0)
    ) {
      throw validationError("Maquininha inválida.");
    }
  });

  const totalPago = roundMoney(pagamentos.reduce((sum, pagamento) => sum + pagamento.valor, 0));
  const troco = roundMoney(Math.max(totalPago - totalVenda, 0));
  const valorFaltante = roundMoney(Math.max(totalVenda - totalPago, 0));
  const temDinheiro = pagamentos.some((pagamento) => pagamento.forma_pagamento === "dinheiro");
  const totalDinheiro = roundMoney(pagamentos.filter((pagamento) => pagamento.forma_pagamento === "dinheiro").reduce((sum, pagamento) => sum + pagamento.valor, 0));

  if (troco > 0 && !temDinheiro) {
    throw validationError("Troco só pode ser calculado quando há pagamento em dinheiro.");
  }

  if (troco > totalDinheiro) {
    throw validationError("O troco não pode ser maior que o valor recebido em dinheiro.");
  }

  return {
    totalPago,
    troco,
    valorFaltante,
    statusPagamento: valorFaltante > 0 ? "pendente" : "pago",
  };
}

async function validarCaixa(client, caixaId) {
  if (!caixaId) return;

  const caixaResult = await client.query(
    "SELECT id, status FROM caixas WHERE id = $1 FOR UPDATE;",
    [caixaId]
  );

  if (!caixaResult.rows.length) {
    throw validationError("Caixa não encontrado.");
  }

  if (caixaResult.rows[0].status !== "aberto") {
    throw validationError("A venda só pode ser vinculada a um caixa aberto.");
  }
}

async function listarVendas(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.total,
        v.total_pago,
        v.troco,
        v.valor_faltante,
        v.forma_pagamento,
        v.status_pagamento,
        v.caixa_id,
        v.maquininha_id,
        v.status,
        v.created_at,
        c.nome AS cliente,
        COALESCE(SUM(iv.quantidade), 0)::int AS quantidade_itens,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'forma_pagamento', pv.forma_pagamento,
              'valor', pv.valor,
              'status', pv.status,
              'caixa_id', pv.caixa_id,
              'maquininha_id', pv.maquininha_id
            )
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'
        ) AS pagamentos
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN itens_venda iv ON iv.venda_id = v.id
      LEFT JOIN pagamentos_venda pv ON pv.venda_id = v.id
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

async function detalharVenda(req, res) {
  const vendaId = Number(req.params.id);

  if (!Number.isInteger(vendaId) || vendaId <= 0) {
    return res.status(400).json({ message: "Venda inválida." });
  }

  try {
    const vendaResult = await pool.query(
      `
        SELECT
          v.*,
          c.nome AS cliente
        FROM vendas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.id = $1
        LIMIT 1;
      `,
      [vendaId]
    );

    if (!vendaResult.rows.length) {
      return res.status(404).json({ message: "Venda não encontrada." });
    }

    const itensResult = await pool.query(
      `
        SELECT *
        FROM itens_venda
        WHERE venda_id = $1
        ORDER BY id ASC;
      `,
      [vendaId]
    );

    const pagamentosResult = await pool.query(
      `
        SELECT
          pv.*,
          m.nome AS maquininha
        FROM pagamentos_venda pv
        LEFT JOIN maquininhas m ON m.id = pv.maquininha_id
        WHERE pv.venda_id = $1
        ORDER BY pv.id ASC;
      `,
      [vendaId]
    );

    res.json({
      ...vendaResult.rows[0],
      itens: itensResult.rows,
      pagamentos: pagamentosResult.rows,
    });
  } catch (error) {
    console.error("Erro ao detalhar venda:", error);
    res.status(500).json({ message: "Não foi possível detalhar a venda." });
  }
}

async function criarVenda(req, res) {
  const clienteId = req.body.cliente_id ?? null;
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const desconto = roundMoney(req.body.desconto);
  const frete = roundMoney(req.body.frete);
  const observacoes = normalizeOptional(req.body.observacoes);
  const canalVenda = normalizeOptional(req.body.canal_venda) || "loja_fisica";
  const origemVenda = normalizeOptional(req.body.origem_venda);
  const temEntrega = req.body.tem_entrega === true;
  const entrega = req.body.entrega && typeof req.body.entrega === "object" ? req.body.entrega : null;
  const caixaId = req.body.caixa_id ? Number(req.body.caixa_id) : null;
  const pointOrderId = normalizeOptional(req.body.mercado_pago_point_order_id);

  if (!itens.length) {
    return res.status(400).json({ message: "Informe pelo menos um item para a venda." });
  }

  if (desconto < 0 || frete < 0) {
    return res.status(400).json({ message: "Desconto e frete não podem ser negativos." });
  }

  if (caixaId !== null && (!Number.isInteger(caixaId) || caixaId <= 0)) {
    return res.status(400).json({ message: "Caixa inválido." });
  }

  if (temEntrega && !entrega) {
    return res.status(400).json({ message: "Informe os dados da entrega." });
  }

  if (origemVenda === "pdv_admin" && req.body.pagamento_confirmado !== true) {
    return res.status(400).json({ message: "Confirme o recebimento do pagamento antes de finalizar a venda no PDV." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await validarCaixa(client, caixaId);

    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const produtoId = Number(item.produto_id);
      const variacaoId = Number(item.variacao_id);
      const quantidade = Number(item.quantidade);
      const precoUnitario = roundMoney(item.preco_unitario);

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
            pv.codigo_ref,
            pv.sku,
            pv.codigo_interno,
            pv.codigo_barras,
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

      const itemSubtotal = roundMoney(quantidade * precoUnitario);
      subtotal = roundMoney(subtotal + itemSubtotal);

      itensProcessados.push({
        produto_id: estoque.produto_id,
        variacao_id: estoque.variacao_id,
        produto_nome: estoque.produto_nome,
        tamanho: estoque.tamanho,
        cor: estoque.cor,
        codigo_ref: estoque.codigo_ref,
        sku: estoque.sku,
        codigo_interno: estoque.codigo_interno,
        codigo_barras: estoque.codigo_barras,
        quantidade,
        preco_unitario: precoUnitario,
        subtotal: itemSubtotal,
      });
    }

    const total = roundMoney(subtotal - desconto + frete);

    if (total < 0) {
      throw validationError("O total da venda não pode ser negativo.");
    }

    const pagamentos = buildPagamentos(req.body, total);
    const financeiro = validarPagamentos(pagamentos, total);
    const formaPagamentoPrincipal = pagamentos.length === 1
      ? pagamentos[0].forma_pagamento
      : "misto";
    const maquininhaVendaId = pagamentos.length === 1
      ? pagamentos[0].maquininha_id
      : req.body.maquininha_id ? Number(req.body.maquininha_id) : null;
    const statusEntrega = temEntrega ? normalizeOptional(entrega?.status_entrega) || "pendente" : "sem_entrega";
    const idsMaquininhas = [...new Set(pagamentos.map(p => p.maquininha_id).filter(Boolean))];
    let pointOrder = null;
    if (idsMaquininhas.length) {
      const integradas = (await client.query("SELECT id FROM maquininhas WHERE id=ANY($1::int[]) AND ativo=TRUE AND mercado_pago_modo='point' AND mercado_pago_ativo=TRUE", [idsMaquininhas])).rows;
      if (integradas.length) {
        if (!pointOrderId) throw validationError("Envie a cobrança ao Mercado Pago Point e aguarde a aprovação antes de finalizar a venda.");
        pointOrder = (await client.query("SELECT * FROM mercado_pago_point_orders WHERE order_id=$1 FOR UPDATE", [pointOrderId])).rows[0];
        if (!pointOrder) throw validationError("Cobrança Mercado Pago Point não encontrada.");
        if (pointOrder.status !== "approved") throw validationError("A cobrança Mercado Pago Point ainda não foi aprovada.");
        if (pointOrder.venda_id) throw validationError("Esta cobrança Mercado Pago Point já está vinculada a outra venda.");
        if (Number(pointOrder.caixa_id) !== Number(caixaId) || !idsMaquininhas.includes(Number(pointOrder.maquininha_id))) throw validationError("A cobrança Point não corresponde ao caixa e à maquininha selecionados.");
        if (pointOrder.forma_pagamento !== pagamentos[0]?.forma_pagamento || Math.abs(Number(pointOrder.valor) - total) > 0.009) throw validationError("A cobrança Point não corresponde à forma de pagamento ou ao total atual da venda.");
      }
    }

    const vendaResult = await client.query(
      `
        INSERT INTO vendas (
          cliente_id,
          usuario_id,
          subtotal,
          desconto,
          frete_valor,
          total,
          total_pago,
          troco,
          valor_faltante,
          forma_pagamento,
          canal_venda,
          origem_venda,
          tem_entrega,
          status_pagamento,
          status_entrega,
          caixa_id,
          maquininha_id,
          status,
          observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'finalizada', $18)
        RETURNING
          id,
          cliente_id,
          usuario_id,
          subtotal,
          desconto,
          frete_valor,
          total,
          total_pago,
          troco,
          valor_faltante,
          forma_pagamento,
          canal_venda,
          origem_venda,
          tem_entrega,
          status_pagamento,
          status_entrega,
          caixa_id,
          maquininha_id,
          status,
          observacoes,
          created_at;
      `,
      [
        clienteId,
        usuarioId(req),
        subtotal,
        desconto,
        frete,
        total,
        financeiro.totalPago,
        financeiro.troco,
        financeiro.valorFaltante,
        formaPagamentoPrincipal,
        canalVenda,
        origemVenda,
        temEntrega,
        financeiro.statusPagamento,
        statusEntrega,
        caixaId,
        maquininhaVendaId,
        observacoes,
      ]
    );

    const venda = vendaResult.rows[0];
    if (pointOrder) await client.query("UPDATE mercado_pago_point_orders SET venda_id=$2,updated_at=NOW() WHERE id=$1 AND venda_id IS NULL", [pointOrder.id, venda.id]);
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

    const pagamentosCriados = [];

    for (const pagamento of pagamentos) {
      const pagamentoResult = await client.query(
        `
          INSERT INTO pagamentos_venda (
            venda_id,
            caixa_id,
            maquininha_id,
            forma_pagamento,
            valor,
            status,
            observacoes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `,
        [
          venda.id,
          caixaId,
          pagamento.maquininha_id,
          pagamento.forma_pagamento,
          pagamento.valor,
          financeiro.statusPagamento,
          pagamento.observacoes,
        ]
      );

      pagamentosCriados.push(pagamentoResult.rows[0]);

      if (caixaId) {
        await client.query(
          `
            INSERT INTO caixa_movimentacoes (
              caixa_id,
              usuario_id,
              tipo,
              forma_pagamento,
              valor,
              descricao,
              venda_id
            )
            VALUES ($1, $2, 'venda', $3, $4, $5, $6);
          `,
          [
            caixaId,
            usuarioId(req),
            pagamento.forma_pagamento,
            pagamento.valor,
            `Venda #${venda.id}`,
            venda.id,
          ]
        );
      }
    }

    if (caixaId && financeiro.troco > 0) {
      await client.query(
        `
          INSERT INTO caixa_movimentacoes (
            caixa_id,
            usuario_id,
            tipo,
            forma_pagamento,
            valor,
            descricao,
            venda_id
          )
          VALUES ($1, $2, 'saida', 'dinheiro', $3, $4, $5);
        `,
        [
          caixaId,
          usuarioId(req),
          financeiro.troco,
          `Troco da venda #${venda.id}`,
          venda.id,
        ]
      );
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
            codigo_ref,
            codigo_barras,
            quantidade,
            preco_unitario,
            subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, produto_id, produto_variacao_id, produto_nome, tamanho, cor, codigo_ref, codigo_barras, quantidade, preco_unitario, subtotal;
        `,
        [
          venda.id,
          item.produto_id,
          item.variacao_id,
          item.produto_nome,
          item.tamanho,
          item.cor,
          item.codigo_ref,
          item.codigo_barras,
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

      itensCriados.push({ ...itemResult.rows[0], sku:item.sku, codigo_interno:item.codigo_interno, codigo_barras:item.codigo_barras });
    }

    await client.query("COMMIT");

    res.status(201).json({
      ...venda,
      entrega: entregaCriada,
      itens: itensCriados,
      pagamentos: pagamentosCriados,
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
  detalharVenda,
  criarVenda,
};
