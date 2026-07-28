const { pool } = require("../config/db");
const { criarPreferenciaPagamentoVenda, consultarPagamento } = require("../services/mercado-pago.service");
const { validarAssinaturaWebhookMercadoPago } = require("../utils/mercado-pago-webhook");

const idValido = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const texto = value => { const result = String(value || "").trim(); return result || null; };
const webhookAtivo = () => String(process.env.MERCADO_PAGO_WEBHOOK_ENABLED || "true").toLowerCase() !== "false";
const urlWebhookSugerida = () => `${String(process.env.APP_PUBLIC_URL || "http://localhost:5500").replace(/\/$/, "")}/api/mercado-pago/webhook`;

function extrairPaymentId(req) {
  const tipo = String(req.body?.type || req.query?.type || req.query?.topic || "").toLowerCase();
  return texto(req.body?.data?.id ?? req.query?.["data.id"] ?? (tipo === "payment" ? req.query?.id : null));
}

function extrairVendaId(externalReference) {
  const value = String(externalReference || "").trim();
  const match = value.match(/^(?:venda_site_)?(\d+)$/i);
  return match ? idValido(match[1]) : null;
}

function formaPagamentoMercadoPago(pagamento) {
  const method = String(pagamento.payment_method_id || "").toLowerCase();
  const type = String(pagamento.payment_type_id || "").toLowerCase();
  if (method === "pix" || type === "bank_transfer") return "pix";
  if (["credit_card", "debit_card", "prepaid_card"].includes(type)) return "cartao";
  return "mercado_pago";
}

function dadosPagamento(pagamento, webhook) {
  return [
    texto(pagamento.id), texto(pagamento.status), texto(pagamento.status_detail),
    texto(pagamento.payment_method_id), texto(pagamento.payment_type_id), texto(pagamento.payer?.email),
    Number(pagamento.transaction_amount || 0), pagamento.date_approved || null,
    texto(webhook?.id), texto(webhook?.type), texto(webhook?.action), webhook ? new Date() : null,
    webhook || null, pagamento,
  ];
}

async function atualizarLog(client, logId, status, mensagem, pagamento, vendaId) {
  if (!logId) return;
  await client.query(
    `UPDATE mercado_pago_webhook_logs SET payment_id=COALESCE($2,payment_id), merchant_order_id=$3,
       external_reference=$4, venda_id=$5, status_processamento=$6, mensagem=$7, processed_at=NOW() WHERE id=$1`,
    [logId, texto(pagamento?.id), texto(pagamento?.order?.id), texto(pagamento?.external_reference), vendaId, status, mensagem]
  );
}

async function aplicarPagamentoMercadoPago(pagamento, { webhook = null, logId = null } = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let vendaId = extrairVendaId(pagamento.external_reference);
    let registro;
    if (vendaId) {
      registro = (await client.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [vendaId])).rows[0];
    }
    if (!registro) {
      registro = (await client.query("SELECT * FROM mercado_pago_pagamentos WHERE payment_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [String(pagamento.id)])).rows[0];
      vendaId = registro?.venda_id || vendaId;
    }
    if (!registro || !vendaId) {
      await atualizarLog(client, logId, "ignorado", "Pagamento consultado, mas nenhuma preferência/venda correspondente foi encontrada.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "ignorado", message: "Pagamento sem venda correspondente." };
    }

    const venda = (await client.query("SELECT * FROM vendas WHERE id=$1 FOR UPDATE", [vendaId])).rows[0];
    if (!venda || venda.canal_venda !== "site" || venda.origem_venda !== "checkout_publico") {
      await atualizarLog(client, logId, "ignorado", "A confirmação automática é restrita a pedidos do site.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "ignorado", message: "Venda não elegível para confirmação automática." };
    }

    const d = dadosPagamento(pagamento, webhook);
    await client.query(
      `UPDATE mercado_pago_pagamentos SET payment_id=$1,
       status=CASE $2 WHEN 'pending' THEN 'pendente' WHEN 'in_process' THEN 'processando' ELSE $2 END,
       status_detail=$3,payment_status=$2,
       payment_status_detail=$3,payment_method_id=$4,payment_type_id=$5,payer_email=$6,
       transaction_amount=$7,date_approved=$8,webhook_event_id=COALESCE($9,webhook_event_id),
       webhook_type=COALESCE($10,webhook_type),webhook_action=COALESCE($11,webhook_action),
       webhook_received_at=COALESCE($12,webhook_received_at),raw_webhook_json=COALESCE($13,raw_webhook_json),
       raw_payment_json=$14,processado=TRUE,processed_at=NOW(),updated_at=NOW() WHERE id=$15`,
      [...d, registro.id]
    );

    const status = String(pagamento.status || "").toLowerCase();
    if (status !== "approved") {
      const mensagem = ["pending", "in_process"].includes(status)
        ? "Pagamento consultado e ainda pendente/processando; a venda não foi marcada como paga."
        : `Status ${status || "desconhecido"} registrado; nenhuma alteração automática na venda ou no estoque.`;
      await atualizarLog(client, logId, "processado", mensagem, pagamento, vendaId);
      await client.query("COMMIT");
      return { status, venda_id: vendaId, message: mensagem };
    }

    if (venda.status_pagamento === "pago") {
      await atualizarLog(client, logId, "processado", "Venda já paga; webhook processado sem duplicar pagamento.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "approved", venda_id: vendaId, ja_processado: true, message: "Venda já estava paga." };
    }

    const valor = Number(pagamento.transaction_amount || 0);
    const total = Number(venda.total || 0);
    if (Math.abs(valor - total) > 0.01) throw Object.assign(new Error("O valor aprovado no Mercado Pago não corresponde ao total da venda."), { statusCode: 409, vendaId });

    const observacao = "Pagamento confirmado automaticamente pelo Mercado Pago";
    const pagamentoExistente = (await client.query(
      "SELECT id FROM pagamentos_venda WHERE venda_id=$1 AND caixa_id IS NULL AND observacoes=$2 LIMIT 1",
      [vendaId, observacao]
    )).rows[0];
    if (!pagamentoExistente) {
      await client.query(
        `INSERT INTO pagamentos_venda (venda_id,caixa_id,maquininha_id,forma_pagamento,valor,status,observacoes)
         VALUES ($1,NULL,NULL,$2,$3,'pago',$4)`,
        [vendaId, formaPagamentoMercadoPago(pagamento), valor, observacao]
      );
    }
    await client.query(
      `UPDATE vendas SET status_pagamento='pago',total_pago=total,valor_faltante=0,
       forma_pagamento=$2,updated_at=NOW() WHERE id=$1`,
      [vendaId, formaPagamentoMercadoPago(pagamento)]
    );
    await atualizarLog(client, logId, "processado", "Pagamento aprovado e pedido do site confirmado automaticamente.", pagamento, vendaId);
    await client.query("COMMIT");
    return { status: "approved", venda_id: vendaId, message: "Pagamento confirmado automaticamente." };
  } catch (error) {
    await client.query("ROLLBACK");
    if (logId) {
      await pool.query(
        "UPDATE mercado_pago_webhook_logs SET venda_id=COALESCE($2,venda_id),status_processamento='erro',mensagem=$3,processed_at=NOW() WHERE id=$1",
        [logId, error.vendaId || null, error.message]
      ).catch(logError => console.error("Erro ao atualizar log Mercado Pago:", logError));
    }
    throw error;
  } finally { client.release(); }
}

async function receberWebhook(req, res) {
  const paymentId = extrairPaymentId(req);
  let logId;
  try {
    const log = await pool.query(
      `INSERT INTO mercado_pago_webhook_logs (event_id,type,action,payment_id,status_processamento,mensagem,raw_json)
       VALUES ($1,$2,$3,$4,'recebido',$5,$6) RETURNING id`,
      [texto(req.body?.id), texto(req.body?.type || req.query?.type || req.query?.topic), texto(req.body?.action), paymentId, "Notificação recebida.", req.body || {}]
    );
    logId = log.rows[0].id;
    if (!webhookAtivo()) {
      await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='ignorado',mensagem='Webhook desativado por configuração.',processed_at=NOW() WHERE id=$1", [logId]);
      return res.status(200).json({ ok: true, ignored: true });
    }
    const assinatura = validarAssinaturaWebhookMercadoPago(req);
    if (!assinatura.configurada) console.warn("Mercado Pago webhook:", assinatura.motivo);
    if (assinatura.configurada && !assinatura.valida) {
      await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='erro',mensagem=$2,processed_at=NOW() WHERE id=$1", [logId, assinatura.motivo]);
      return res.status(401).json({ message: "Assinatura do webhook inválida." });
    }
    if (!paymentId) {
      await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='ignorado',mensagem='Notificação sem ID de pagamento.',processed_at=NOW() WHERE id=$1", [logId]);
      return res.status(200).json({ ok: true, ignored: true });
    }
    const pagamento = await consultarPagamento(paymentId);
    const resultado = await aplicarPagamentoMercadoPago(pagamento, { webhook: req.body || {}, logId });
    return res.status(200).json({ ok: true, status: resultado.status });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    if (logId) await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='erro',mensagem=$2,processed_at=NOW() WHERE id=$1", [logId, error.message]).catch(() => {});
    return res.status(error.statusCode === 409 ? 409 : 502).json({ message: "Não foi possível processar a notificação agora." });
  }
}

async function sincronizarPagamento(req, res) {
  const vendaId = idValido(req.params.venda_id);
  if (!vendaId) return res.status(400).json({ message: "Venda inválida." });
  try {
    const registro = (await pool.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1", [vendaId])).rows[0];
    if (!registro) return res.status(404).json({ message: "Esta venda ainda não possui pagamento Mercado Pago." });
    if (!registro.payment_id) return res.status(409).json({ message: "O Mercado Pago ainda não informou o ID do pagamento. Aguarde o webhook ou a tentativa de pagamento do cliente." });
    const pagamento = await consultarPagamento(registro.payment_id);
    const resultado = await aplicarPagamentoMercadoPago(pagamento);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 502).json({ message: error.message || "Não foi possível sincronizar o pagamento." });
  }
}

async function listarLogs(req, res) {
  try {
    const result = await pool.query("SELECT * FROM mercado_pago_webhook_logs ORDER BY created_at DESC LIMIT 200");
    res.json(result.rows);
  } catch { res.status(500).json({ message: "Não foi possível carregar os logs de webhook." }); }
}

async function obterConfig(req, res) {
  try {
    const result = await pool.query("SELECT * FROM mercado_pago_config ORDER BY id LIMIT 1");
    const config = result.rows[0] || { ambiente: process.env.MERCADO_PAGO_ENV || "sandbox", ativo: false };
    res.json({ ...config, access_token_configurado: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN), public_key: config.public_key || null, webhook_url_sugerida: urlWebhookSugerida(), webhook_fase_2: true, webhook_ativo: webhookAtivo() });
  } catch { res.status(500).json({ message: "Não foi possível carregar a configuração do Mercado Pago." }); }
}

async function salvarConfig(req, res) {
  const b = req.body || {}, ambiente = ["sandbox", "producao"].includes(b.ambiente) ? b.ambiente : "sandbox";
  try {
    const result = await pool.query(`INSERT INTO mercado_pago_config (id,ambiente,ativo,public_key,access_token_configurado,webhook_url,success_url,failure_url,pending_url) VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET ambiente=$1,ativo=$2,public_key=$3,access_token_configurado=$4,webhook_url=$5,success_url=$6,failure_url=$7,pending_url=$8,updated_at=NOW() RETURNING *`, [ambiente, b.ativo === true, texto(b.public_key), Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN), texto(b.webhook_url), texto(b.success_url), texto(b.failure_url), texto(b.pending_url)]);
    res.json({ ...result.rows[0], access_token_configurado: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN), webhook_url_sugerida: urlWebhookSugerida(), webhook_fase_2: true, webhook_ativo: webhookAtivo() });
  } catch (error) { console.error("Erro ao salvar config Mercado Pago:", error); res.status(500).json({ message: "Não foi possível salvar a configuração do Mercado Pago." }); }
}

async function buscarPagamentoVenda(req, res) {
  const id = idValido(req.params.venda_id); if (!id) return res.status(400).json({ message: "Venda inválida." });
  try { const result = await pool.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1", [id]); res.json(result.rows[0] || null); }
  catch { res.status(500).json({ message: "Não foi possível buscar o link de pagamento." }); }
}

async function criarPreferencia(req, res) {
  const id = idValido(req.params.venda_id); if (!id) return res.status(400).json({ message: "Venda inválida." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = (await client.query(`SELECT v.*,c.nome cliente,c.email,c.telefone FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.id=$1 FOR UPDATE OF v`, [id])).rows[0];
    if (!venda) throw Object.assign(new Error("Venda não encontrada."), { statusCode: 404 });
    if (venda.canal_venda !== "site") throw Object.assign(new Error("A preferência só pode ser criada para pedidos do site."), { statusCode: 400 });
    if (venda.status_pagamento === "pago") throw Object.assign(new Error("Este pedido já está pago."), { statusCode: 409 });
    if (["cancelada", "cancelado"].includes(venda.status) || venda.status_pagamento === "cancelado") throw Object.assign(new Error("Pedido cancelado não pode receber link de pagamento."), { statusCode: 409 });
    const existente = (await client.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 AND status='criado' ORDER BY id DESC LIMIT 1", [id])).rows[0];
    if (existente) { await client.query("COMMIT"); return responderPreferencia(res, existente); }
    const config = (await client.query("SELECT * FROM mercado_pago_config ORDER BY id LIMIT 1")).rows[0] || { ambiente: process.env.MERCADO_PAGO_ENV || "sandbox", ativo: false };
    if (!config.ativo) throw Object.assign(new Error("A integração Mercado Pago está desativada na configuração."), { statusCode: 409 });
    const itens = (await client.query("SELECT * FROM itens_venda WHERE venda_id=$1 ORDER BY id", [id])).rows;
    if (!itens.length) throw Object.assign(new Error("A venda não possui itens para pagamento."), { statusCode: 400 });
    const mp = await criarPreferenciaPagamentoVenda({ ...venda, itens, config });
    const saved = await client.query(`INSERT INTO mercado_pago_pagamentos (venda_id,preference_id,init_point,sandbox_init_point,external_reference,status,payload_json,resposta_json) VALUES ($1,$2,$3,$4,$5,'criado',$6,$7) RETURNING *`, [id, mp.preference_id, mp.init_point, mp.sandbox_init_point, mp.payload.external_reference, mp.payload, mp.resposta]);
    await client.query("COMMIT"); responderPreferencia(res, saved.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, details: error.mercadoPago || undefined });
    console.error("Erro ao criar preferência Mercado Pago:", error); res.status(500).json({ message: "Não foi possível gerar o link Mercado Pago." });
  } finally { client.release(); }
}

function responderPreferencia(res, row) {
  const ambiente = process.env.MERCADO_PAGO_ENV || "sandbox";
  const url = ambiente === "producao" ? row.init_point : (row.sandbox_init_point || row.init_point);
  return res.json({ ok: true, venda_id: row.venda_id, preference_id: row.preference_id, payment_id: row.payment_id, payment_status: row.payment_status || row.status, init_point: row.init_point, sandbox_init_point: row.sandbox_init_point, url_pagamento: url, status: row.status });
}

module.exports = { obterConfig, salvarConfig, buscarPagamentoVenda, criarPreferencia, receberWebhook, sincronizarPagamento, listarLogs, aplicarPagamentoMercadoPago };
