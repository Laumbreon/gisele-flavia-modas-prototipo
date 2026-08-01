const { pool } = require("../config/db");
const { enviarComprovanteVendaPaga } = require("../services/comprovante.service");

const FORMAS_PAGAMENTO = new Set(["pix", "dinheiro", "cartao"]);
const STATUS_ENTREGA = new Set(["pendente", "separando", "pronto_retirada", "saiu_entrega", "entregue", "cancelado"]);

function idPedido(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Pedido inválido." });
    return null;
  }
  return id;
}

function texto(value) {
  const result = String(value || "").trim();
  return result || null;
}

async function listarPedidosSite(req, res) {
  const filtros = ["v.canal_venda = 'site'"];
  const valores = [];
  const adicionar = (sql, valor) => { valores.push(valor); filtros.push(sql.replace("?", `$${valores.length}`)); };

  if (texto(req.query.status_pagamento)) adicionar("v.status_pagamento = ?", texto(req.query.status_pagamento));
  if (texto(req.query.status_entrega)) adicionar("v.status_entrega = ?", texto(req.query.status_entrega));
  if (texto(req.query.tipo_entrega)) {
    const tipo = texto(req.query.tipo_entrega);
    adicionar("COALESCE(ve.tipo_entrega, 'retirada') = ?", tipo);
  }
  if (texto(req.query.data_inicio)) adicionar("v.created_at >= ?::date", texto(req.query.data_inicio));
  if (texto(req.query.data_fim)) adicionar("v.created_at < (?::date + INTERVAL '1 day')", texto(req.query.data_fim));
  if (texto(req.query.busca)) {
    valores.push(`%${texto(req.query.busca)}%`);
    filtros.push(`(CAST(v.id AS TEXT) ILIKE $${valores.length} OR c.nome ILIKE $${valores.length} OR COALESCE(c.telefone, c.whatsapp, '') ILIKE $${valores.length} OR EXISTS (SELECT 1 FROM itens_venda iv LEFT JOIN produto_variacoes pv ON pv.id=iv.produto_variacao_id WHERE iv.venda_id=v.id AND COALESCE(iv.codigo_ref,pv.codigo_ref,'') ILIKE $${valores.length}))`);
  }

  try {
    const result = await pool.query(
      `SELECT v.id, c.nome AS cliente, COALESCE(c.telefone, c.whatsapp) AS telefone,
              v.total, v.forma_pagamento, v.status_pagamento, v.status_entrega,
              v.canal_venda, v.origem_venda, v.status, v.created_at,
              COALESCE(ve.tipo_entrega, 'retirada') AS tipo_entrega,
              ve.bairro, ve.cidade,
              mp.status AS mercado_pago_status, mp.payment_id AS mercado_pago_payment_id,
              mp.preference_id AS mercado_pago_preference_id, mp.date_approved AS mercado_pago_date_approved,
              mp.resultado_processamento AS mercado_pago_resultado
       FROM vendas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN LATERAL (
         SELECT tipo_entrega, bairro, cidade FROM venda_entregas
         WHERE venda_id = v.id ORDER BY id DESC LIMIT 1
       ) ve ON TRUE
       LEFT JOIN LATERAL (
         SELECT status,payment_id,preference_id,date_approved,resultado_processamento
         FROM mercado_pago_pagamentos WHERE venda_id=v.id ORDER BY created_at DESC LIMIT 1
       ) mp ON TRUE
       WHERE ${filtros.join(" AND ")}
       ORDER BY v.created_at DESC
       LIMIT 200`,
      valores
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar pedidos do site:", error);
    res.status(500).json({ message: "Não foi possível carregar os pedidos do site." });
  }
}

async function buscarPedidoCompleto(executor, id, lock = false) {
  const vendaResult = await executor.query(
    `SELECT v.*, c.nome AS cliente, c.telefone, c.whatsapp, c.email
     FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.id = $1 AND v.canal_venda = 'site' ${lock ? "FOR UPDATE OF v" : ""}`,
    [id]
  );
  if (!vendaResult.rows[0]) return null;
  const [itens, entrega, pagamentos, mercadoPago] = await Promise.all([
    executor.query("SELECT * FROM itens_venda WHERE venda_id = $1 ORDER BY id", [id]),
    executor.query("SELECT * FROM venda_entregas WHERE venda_id = $1 ORDER BY id DESC LIMIT 1", [id]),
    executor.query("SELECT * FROM pagamentos_venda WHERE venda_id = $1 ORDER BY id", [id]),
    executor.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1", [id]),
  ]);
  return { ...vendaResult.rows[0], itens: itens.rows, entrega: entrega.rows[0] || null, pagamentos: pagamentos.rows, mercado_pago: mercadoPago.rows[0] || null };
}

async function detalharPedidoSite(req, res) {
  const id = idPedido(req, res);
  if (!id) return;
  try {
    const pedido = await buscarPedidoCompleto(pool, id);
    if (!pedido) return res.status(404).json({ message: "Pedido do site não encontrado." });
    res.json(pedido);
  } catch (error) {
    console.error("Erro ao detalhar pedido do site:", error);
    res.status(500).json({ message: "Não foi possível detalhar o pedido." });
  }
}

async function confirmarPagamento(req, res) {
  const id = idPedido(req, res);
  if (!id) return;
  const forma = texto(req.body.forma_pagamento_confirmada);
  const observacoes = texto(req.body.observacoes) || "Pagamento confirmado pela loja";
  if (forma && !FORMAS_PAGAMENTO.has(forma)) return res.status(400).json({ message: "Forma de pagamento inválida." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedido = await buscarPedidoCompleto(client, id, true);
    if (!pedido) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Pedido do site não encontrado." }); }
    if (pedido.status === "cancelada" || pedido.status_pagamento === "cancelado") throw Object.assign(new Error("Pedido cancelado não pode receber pagamento."), { statusCode: 409 });
    if (pedido.status_pagamento === "pago") throw Object.assign(new Error("O pagamento deste pedido já foi confirmado."), { statusCode: 409 });
    const formaConfirmada = forma || pedido.forma_pagamento;
    if (!FORMAS_PAGAMENTO.has(formaConfirmada)) throw Object.assign(new Error("Informe uma forma de pagamento válida."), { statusCode: 400 });
    await client.query(
      `UPDATE vendas SET status_pagamento='pago', total_pago=total, valor_faltante=0,
       forma_pagamento=$2, updated_at=NOW() WHERE id=$1`,
      [id, formaConfirmada]
    );
    await client.query(
      `INSERT INTO pagamentos_venda (venda_id, caixa_id, maquininha_id, forma_pagamento, valor, status, observacoes)
       VALUES ($1, NULL, NULL, $2, $3, 'pago', $4)`,
      [id, formaConfirmada, pedido.total, observacoes]
    );
    await client.query("COMMIT");
    await enviarComprovanteVendaPaga(id);
    res.json({ ok: true, message: "Pagamento confirmado.", pedido_id: id });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Erro ao confirmar pagamento do pedido:", error);
    res.status(500).json({ message: "Não foi possível confirmar o pagamento." });
  } finally { client.release(); }
}

async function cancelarPedido(req, res) {
  const id = idPedido(req, res);
  if (!id) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedido = await buscarPedidoCompleto(client, id, true);
    if (!pedido) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Pedido do site não encontrado." }); }
    if (pedido.status === "cancelada" || pedido.status_pagamento === "cancelado") throw Object.assign(new Error("Este pedido já foi cancelado."), { statusCode: 409 });
    for (const item of pedido.itens) {
      if (item.produto_variacao_id) {
        await client.query("UPDATE estoque SET quantidade=quantidade+$1, updated_at=NOW() WHERE produto_variacao_id=$2", [item.quantidade, item.produto_variacao_id]);
      }
      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, produto_variacao_id, tipo, quantidade, motivo, responsavel, observacoes)
         VALUES ($1,$2,'entrada',$3,$4,$5,$6)`,
        [item.produto_id, item.produto_variacao_id, item.quantidade, `Cancelamento pedido site #${id}`, req.usuario?.nome || "Gestão", item.produto_nome]
      );
    }
    await client.query("UPDATE vendas SET status='cancelada', status_pagamento='cancelado', status_entrega='cancelado', updated_at=NOW() WHERE id=$1", [id]);
    await client.query("UPDATE pagamentos_venda SET status='cancelado' WHERE venda_id=$1", [id]);
    await client.query("UPDATE venda_entregas SET status_entrega='cancelado', updated_at=NOW() WHERE venda_id=$1", [id]);
    await client.query("COMMIT");
    res.json({ ok: true, message: "Pedido cancelado e estoque devolvido.", pedido_id: id });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Erro ao cancelar pedido do site:", error);
    res.status(500).json({ message: "Não foi possível cancelar o pedido." });
  } finally { client.release(); }
}

async function atualizarStatusEntrega(req, res) {
  const id = idPedido(req, res);
  if (!id) return;
  const status = texto(req.body.status_entrega);
  if (!STATUS_ENTREGA.has(status)) return res.status(400).json({ message: "Status de entrega inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedido = await buscarPedidoCompleto(client, id, true);
    if (!pedido) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Pedido do site não encontrado." }); }
    if (pedido.status === "cancelada") throw Object.assign(new Error("Pedido cancelado não pode ser atualizado."), { statusCode: 409 });
    const tipo = pedido.entrega?.tipo_entrega || "retirada";
    const permitidos = tipo === "entrega_local"
      ? new Set(["pendente", "separando", "saiu_entrega", "entregue", "cancelado"])
      : new Set(["sem_entrega", "separando", "pronto_retirada", "entregue", "cancelado"]);
    if (!permitidos.has(status)) throw Object.assign(new Error(`Status incompatível com ${tipo === "entrega_local" ? "entrega local" : "retirada"}.`), { statusCode: 400 });
    await client.query("UPDATE vendas SET status_entrega=$2, updated_at=NOW() WHERE id=$1", [id, status]);
    if (pedido.entrega) await client.query("UPDATE venda_entregas SET status_entrega=$2, updated_at=NOW() WHERE venda_id=$1", [id, status]);
    await client.query("COMMIT");
    res.json({ ok: true, message: "Status de entrega atualizado.", pedido_id: id, status_entrega: status });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Erro ao atualizar entrega do pedido:", error);
    res.status(500).json({ message: "Não foi possível atualizar o status da entrega." });
  } finally { client.release(); }
}

module.exports = { listarPedidosSite, detalharPedidoSite, confirmarPagamento, cancelarPedido, atualizarStatusEntrega };
