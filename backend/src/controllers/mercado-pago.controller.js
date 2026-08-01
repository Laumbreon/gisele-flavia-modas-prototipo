const { pool } = require("../config/db");
const { criarPreferenciaPagamentoVenda, criarPagamentoPixVenda, consultarPagamento, buscarPagamentoPorReferencia } = require("../services/mercado-pago.service");
const { validarAssinaturaWebhookMercadoPago } = require("../utils/mercado-pago-webhook");
const { criarOrderPoint, consultarOrderPoint } = require("../services/mercado-pago-point.service");
const { enviarComprovanteVendaPaga } = require("../services/comprovante.service");
const crypto = require("crypto");
const { criptografarSegredo, aplicarConfigMercadoPago } = require("../config/mercado-pago-runtime");
const { registrarVendaSiteNoCaixa, formaCaixa } = require("../services/caixa-site.service");

const idValido = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const texto = value => { const result = String(value || "").trim(); return result || null; };
const webhookAtivo = () => String(process.env.MERCADO_PAGO_WEBHOOK_ENABLED || "true").toLowerCase() !== "false";
const urlWebhookSugerida = () => `${String(process.env.APP_PUBLIC_URL || "http://localhost:5500").replace(/\/+$/, "")}/api/mercado-pago/webhook`;

function chaveCredenciais() {
  const material = String(process.env.MERCADO_PAGO_CREDENTIALS_KEY || process.env.JWT_SECRET || "").trim();
  if (!material) throw Object.assign(new Error("Configure MERCADO_PAGO_CREDENTIALS_KEY ou JWT_SECRET para proteger o Client Secret."), { statusCode: 503 });
  return crypto.createHash("sha256").update(material).digest();
}

function criptografarClientSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveCredenciais(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

function configMercadoPagoSegura(config, extras = {}) {
  const { client_secret_encrypted, client_secret_iv, client_secret_tag, access_token_encrypted, access_token_iv, access_token_tag, webhook_secret_encrypted, webhook_secret_iv, webhook_secret_tag, ...segura } = config || {};
  return { ...segura, client_secret_configurado: Boolean(client_secret_encrypted), access_token_configurado: Boolean(access_token_encrypted || String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim()), webhook_secret_configurado: Boolean(webhook_secret_encrypted || String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "").trim()), webhook_configurado: Boolean(texto(segura.webhook_url)), ...extras };
}

function extrairPaymentId(req) {
  const tipo = String(req.body?.type || req.query?.type || req.query?.topic || "").toLowerCase();
  const action = String(req.body?.action || "").toLowerCase();
  if (tipo && tipo !== "payment" && !action.startsWith("payment.")) return null;
  return texto(req.body?.data?.id ?? req.query?.["data.id"] ?? req.query?.data_id ?? req.query?.data?.id ?? req.query?.id);
}

function extrairVendaId(externalReference) {
  const value = String(externalReference || "").trim();
  const match = value.match(/^(?:venda_site_)?(\d+)$/i);
  return match ? idValido(match[1]) : null;
}

function formaPagamentoMercadoPago() { return "mercado_pago"; }

function ambienteMercadoPagoProducao() {
  return ["production", "producao"].includes(String(process.env.MERCADO_PAGO_ENV || "sandbox").trim().toLowerCase());
}

function headersWebhookSeguros(req) {
  return { "x-request-id": texto(req.headers["x-request-id"]), "user-agent": texto(req.headers["user-agent"]), "content-type": texto(req.headers["content-type"]), assinatura_presente: Boolean(req.headers["x-signature"]) };
}

async function prepararEmissaoFiscalAposPagamento(client, vendaId, contexto = {}) {
  // TODO fiscal: emitir NFC-e/cupom fiscal automaticamente em uma fase futura.
  // Nesta fase não chama SEFAZ, não cria documento e não altera status fiscal.
  await client.query("UPDATE mercado_pago_pagamentos SET fiscal_triggered_at=COALESCE(fiscal_triggered_at,NOW()),updated_at=NOW() WHERE venda_id=$1", [vendaId]);
  console.info(`Gatilho fiscal preparado para venda site #${vendaId}; nenhuma NFC-e emitida. Origem: ${contexto.origem || "mercado_pago"}.`);
}

function dadosPagamento(pagamento, webhook) {
  return [
    texto(pagamento.id), texto(pagamento.status), texto(pagamento.status_detail),
    texto(pagamento.payment_method_id), texto(pagamento.payment_type_id), texto(pagamento.payer?.email),
    Number(pagamento.transaction_amount || 0), pagamento.date_approved || null,
    texto(webhook?.id), texto(webhook?.type), texto(webhook?.action), webhook ? new Date() : null,
    webhook || null, pagamento.raw_response || pagamento,
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

    const outroRegistro = (await client.query("SELECT id,venda_id FROM mercado_pago_pagamentos WHERE payment_id=$1 AND id<>$2 LIMIT 1 FOR UPDATE", [String(pagamento.id), registro.id])).rows[0];
    if (outroRegistro) {
      await atualizarLog(client, logId, "ignorado", "Payment ID já vinculado a outra venda; processamento bloqueado.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "ignorado", venda_id: vendaId, message: "Pagamento já vinculado a outra venda." };
    }

    const venda = (await client.query("SELECT * FROM vendas WHERE id=$1 FOR UPDATE", [vendaId])).rows[0];
    if (!venda || venda.canal_venda !== "site") {
      await atualizarLog(client, logId, "ignorado", "A confirmação automática é restrita a pedidos do site.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "ignorado", message: "Venda não elegível para confirmação automática." };
    }
    if (["cancelada","cancelado"].includes(String(venda.status).toLowerCase()) || venda.status_pagamento === "cancelado") {
      await atualizarLog(client, logId, "ignorado", "Venda cancelada; pagamento não aplicado automaticamente.", pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "ignorado", venda_id: vendaId, message: "Venda cancelada; revisão manual necessária." };
    }

    const d = dadosPagamento(pagamento, webhook);
    await client.query(
      `UPDATE mercado_pago_pagamentos SET payment_id=$1,
       status=CASE $2 WHEN 'pending' THEN 'pendente' WHEN 'in_process' THEN 'processando' WHEN 'authorized' THEN 'pendente' ELSE $2 END,
       status_detail=$3,payment_status=$2,
       payment_status_detail=$3,payment_method_id=$4,payment_type_id=$5,payer_email=$6,
       transaction_amount=$7,date_approved=$8,webhook_event_id=COALESCE($9,webhook_event_id),
       webhook_type=COALESCE($10,webhook_type),webhook_action=COALESCE($11,webhook_action),
       webhook_received_at=COALESCE($12,webhook_received_at),raw_webhook_json=COALESCE($13,raw_webhook_json),
       raw_payment_json=$14,total_paid_amount=$16,valor_aprovado=CASE WHEN $2='approved' THEN $7 ELSE valor_aprovado END,
       api_consulta_status='sucesso',processado=TRUE,processed_at=NOW(),updated_at=NOW() WHERE id=$15`,
      [...d, registro.id, Number(pagamento.total_paid_amount || pagamento.transaction_amount || 0)]
    );

    const status = String(pagamento.status || "").toLowerCase();
    if (status !== "approved") {
      const aguardando = ["pending", "in_process", "authorized"].includes(status);
      const mensagem = aguardando
        ? "Pagamento consultado e ainda pendente/processando; a venda não foi marcada como paga."
        : `Status ${status || "desconhecido"} registrado; nenhuma alteração automática na venda ou no estoque.`;
      if (["refunded","charged_back"].includes(status) && venda.status_pagamento === "pago") {
        await client.query("UPDATE mercado_pago_pagamentos SET resultado_processamento='alerta_estorno',erro_processamento='Pagamento pago anteriormente recebeu estorno/chargeback; revisão manual necessária.' WHERE id=$1", [registro.id]);
      } else {
        await client.query("UPDATE mercado_pago_pagamentos SET resultado_processamento=$2 WHERE id=$1", [registro.id, aguardando ? "aguardando_pagamento" : status || "status_desconhecido"]);
      }
      await atualizarLog(client, logId, "processado", mensagem, pagamento, vendaId);
      await client.query("COMMIT");
      return { status, venda_id: vendaId, message: mensagem };
    }

    if (venda.forma_pagamento === "pix") {
      const pixConfirmado = String(pagamento.payment_method_id || "").toLowerCase() === "pix"
        && String(pagamento.payment_type_id || "").toLowerCase() === "bank_transfer"
        && Boolean(pagamento.date_approved)
        && Number(pagamento.total_paid_amount || 0) >= Number(venda.total || 0)
        && ambienteMercadoPagoProducao();
      if (!pixConfirmado) {
        const mensagem = ambienteMercadoPagoProducao()
          ? "PIX ainda não consta como depositado integralmente na conta Mercado Pago."
          : "PIX de teste não confirma compra real; ative uma credencial Mercado Pago de produção.";
        await client.query("UPDATE mercado_pago_pagamentos SET resultado_processamento='pix_aguardando_deposito',erro_processamento=$2 WHERE id=$1", [registro.id, mensagem]);
        await atualizarLog(client, logId, "processado", mensagem, pagamento, vendaId);
        await client.query("COMMIT");
        return { status: "pix_aguardando_deposito", venda_id: vendaId, message: mensagem };
      }
    }

    const pagamentoJaRegistrado = (await client.query("SELECT id FROM pagamentos_venda WHERE mercado_pago_payment_id=$1 LIMIT 1", [String(pagamento.id)])).rows[0];
    if (venda.status_pagamento === "pago" || pagamentoJaRegistrado) {
      await registrarVendaSiteNoCaixa(client, { vendaId, formaPagamento: formaCaixa(pagamento.payment_type_id || pagamento.payment_method_id || venda.forma_pagamento), valor: pagamento.total_paid_amount || pagamento.transaction_amount || venda.total });
      await client.query("UPDATE mercado_pago_pagamentos SET resultado_processamento='ja_processado',erro_processamento=NULL WHERE id=$1", [registro.id]);
      await prepararEmissaoFiscalAposPagamento(client, vendaId, { origem: "mercado_pago_approved_idempotente", payment_id: String(pagamento.id) });
      await atualizarLog(client, logId, "processado", "Venda já paga; webhook processado sem duplicar pagamento.", pagamento, vendaId);
      await client.query("COMMIT");
      await enviarComprovanteVendaPaga(vendaId);
      return { status: "approved", venda_id: vendaId, ja_processado: true, message: "Venda já estava paga." };
    }

    const valor = Number(pagamento.transaction_amount || 0);
    const total = Number(venda.total || 0);
    if (Math.abs(valor - total) > 0.01) {
      const mensagem = "Pagamento recebido com divergência. Verifique o valor antes de confirmar.";
      await client.query("UPDATE mercado_pago_pagamentos SET status='erro_valor',resultado_processamento='divergencia_valor',erro_processamento=$2,valor_aprovado=$3 WHERE id=$1", [registro.id, mensagem, valor]);
      await atualizarLog(client, logId, "processado", mensagem, pagamento, vendaId);
      await client.query("COMMIT");
      return { status: "erro_valor", venda_id: vendaId, divergencia_valor: true, message: mensagem };
    }

    const observacao = `Pagamento confirmado automaticamente pelo Mercado Pago · payment_id ${pagamento.id}`;
    const pagamentoExistente = (await client.query(
      "SELECT id FROM pagamentos_venda WHERE mercado_pago_payment_id=$1 OR (venda_id=$2 AND caixa_id IS NULL AND observacoes=$3) LIMIT 1",
      [String(pagamento.id), vendaId, observacao]
    )).rows[0];
    if (!pagamentoExistente) {
      await client.query(
        `INSERT INTO pagamentos_venda (venda_id,caixa_id,maquininha_id,forma_pagamento,valor,status,observacoes,mercado_pago_payment_id)
         VALUES ($1,NULL,NULL,$2,$3,'pago',$4,$5)`,
        [vendaId, formaPagamentoMercadoPago(pagamento), valor, observacao, String(pagamento.id)]
      );
    }
    await client.query(
      `UPDATE vendas SET status_pagamento='pago',total_pago=total,valor_faltante=0,
       forma_pagamento=$2,updated_at=NOW() WHERE id=$1`,
      [vendaId, formaPagamentoMercadoPago(pagamento)]
    );
    await registrarVendaSiteNoCaixa(client, { vendaId, formaPagamento: formaCaixa(pagamento.payment_type_id || pagamento.payment_method_id || venda.forma_pagamento), valor });
    await client.query("UPDATE mercado_pago_pagamentos SET status='approved',resultado_processamento='aprovado_processado',erro_processamento=NULL WHERE id=$1", [registro.id]);
    // O checkout público já baixou o estoque na criação do pedido; não baixar novamente aqui.
    await prepararEmissaoFiscalAposPagamento(client, vendaId, { origem: "mercado_pago_approved", payment_id: String(pagamento.id) });
    await atualizarLog(client, logId, "processado", "Pagamento aprovado e pedido do site confirmado automaticamente.", pagamento, vendaId);
    await client.query("COMMIT");
    await enviarComprovanteVendaPaga(vendaId);
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
      `INSERT INTO mercado_pago_webhook_logs (event_id,type,action,payment_id,status_processamento,mensagem,raw_json,headers_json)
       VALUES ($1,$2,$3,$4,'recebido',$5,$6,$7) RETURNING id`,
      [texto(req.body?.id), texto(req.body?.type || req.query?.type || req.query?.topic), texto(req.body?.action), paymentId, "Notificação recebida.", req.body || {}, headersWebhookSeguros(req)]
    );
    logId = log.rows[0].id;
    if (!webhookAtivo()) {
      await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='ignorado',mensagem='Webhook desativado por configuração.',processed_at=NOW() WHERE id=$1", [logId]);
      return res.status(200).json({ ok: true, ignored: true });
    }
    const assinatura = validarAssinaturaWebhookMercadoPago(req);
    await pool.query("UPDATE mercado_pago_webhook_logs SET assinatura_status=$2,mensagem=$3 WHERE id=$1", [logId, assinatura.configurada ? (assinatura.valida ? "valida" : "invalida") : "desativada", assinatura.motivo]);
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
    await pool.query("UPDATE mercado_pago_webhook_logs SET api_consulta_status='sucesso' WHERE id=$1", [logId]);
    const resultado = await aplicarPagamentoMercadoPago(pagamento, { webhook: req.body || {}, logId });
    await pool.query("UPDATE mercado_pago_webhook_logs SET resultado_json=$2 WHERE id=$1", [logId, resultado]);
    return res.status(200).json({ ok: true, status: resultado.status });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    if (logId) await pool.query("UPDATE mercado_pago_webhook_logs SET status_processamento='erro',api_consulta_status=COALESCE(api_consulta_status,'erro'),mensagem=$2,erro=$2,processed_at=NOW() WHERE id=$1", [logId, error.message]).catch(() => {});
    return res.status(error.statusCode === 409 ? 409 : 502).json({ message: "Não foi possível processar a notificação agora." });
  }
}

async function sincronizarPagamento(req, res) {
  const vendaId = idValido(req.params.venda_id);
  if (!vendaId) return res.status(400).json({ message: "Venda inválida." });
  try {
    const registro = (await pool.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1", [vendaId])).rows[0];
    if (!registro) return res.status(404).json({ message: "Esta venda ainda não possui pagamento Mercado Pago." });
    const pagamento = registro.payment_id ? await consultarPagamento(registro.payment_id) : await buscarPagamentoPorReferencia(registro.external_reference);
    if (!pagamento) return res.status(200).json({ ok: true, status: "pendente", venda_id: vendaId, message: "O pagamento ainda não foi localizado. Ele pode continuar pendente." });
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
    const ambienteEfetivo = ["production", "producao"].includes(String(process.env.MERCADO_PAGO_ENV || "sandbox").toLowerCase()) ? "producao" : "sandbox";
    res.json(configMercadoPagoSegura(config, { ambiente_efetivo:ambienteEfetivo, public_key: config.public_key || null, webhook_url_sugerida: urlWebhookSugerida(), webhook_fase_2: true, webhook_ativo: webhookAtivo() }));
  } catch { res.status(500).json({ message: "Não foi possível carregar a configuração do Mercado Pago." }); }
}

async function salvarConfig(req, res) {
  const b = req.body || {}, ambiente = ["sandbox", "producao"].includes(b.ambiente) ? b.ambiente : "sandbox";
  try {
    const accessToken = texto(b.access_token);
    const webhookSecret = texto(b.webhook_secret);
    if (b.ativo === true && !accessToken && !String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim()) return res.status(409).json({ message: "Informe o Access Token antes de ativar o Mercado Pago." });
    if ((accessToken && accessToken.length > 2000) || (webhookSecret && webhookSecret.length > 2000)) return res.status(400).json({ message: "Uma das credenciais informadas é inválida." });
    const clientId = texto(b.client_id);
    const clientSecret = texto(b.client_secret);
    const webhookUrl = texto(b.webhook_url);
    if (clientId && clientId.length > 255) return res.status(400).json({ message: "O Client ID deve ter no máximo 255 caracteres." });
    if (clientSecret && clientSecret.length > 2000) return res.status(400).json({ message: "O Client Secret é inválido." });
    if (!webhookUrl) return res.status(400).json({ message: "Informe a URL do webhook." });
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error();
    } catch { return res.status(400).json({ message: "Informe uma URL HTTPS válida para o webhook." }); }
    const segredo = clientSecret ? criptografarClientSecret(clientSecret) : {};
    const tokenSeguro = accessToken ? criptografarSegredo(accessToken) : {};
    const webhookSeguro = webhookSecret ? criptografarSegredo(webhookSecret) : {};
    const result = await pool.query(`INSERT INTO mercado_pago_config (id,ambiente,ativo,public_key,access_token_configurado,webhook_url,success_url,failure_url,pending_url,client_id,client_secret_encrypted,client_secret_iv,client_secret_tag,access_token_encrypted,access_token_iv,access_token_tag,webhook_secret_encrypted,webhook_secret_iv,webhook_secret_tag,webhook_enabled) VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT(id) DO UPDATE SET ambiente=$1,ativo=$2,public_key=$3,access_token_configurado=$4,webhook_url=$5,success_url=$6,failure_url=$7,pending_url=$8,client_id=$9,client_secret_encrypted=COALESCE($10,mercado_pago_config.client_secret_encrypted),client_secret_iv=COALESCE($11,mercado_pago_config.client_secret_iv),client_secret_tag=COALESCE($12,mercado_pago_config.client_secret_tag),access_token_encrypted=COALESCE($13,mercado_pago_config.access_token_encrypted),access_token_iv=COALESCE($14,mercado_pago_config.access_token_iv),access_token_tag=COALESCE($15,mercado_pago_config.access_token_tag),webhook_secret_encrypted=COALESCE($16,mercado_pago_config.webhook_secret_encrypted),webhook_secret_iv=COALESCE($17,mercado_pago_config.webhook_secret_iv),webhook_secret_tag=COALESCE($18,mercado_pago_config.webhook_secret_tag),webhook_enabled=$19,updated_at=NOW() RETURNING *`, [ambiente, b.ativo === true, texto(b.public_key), Boolean(accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN), webhookUrl, texto(b.success_url), texto(b.failure_url), texto(b.pending_url), clientId, segredo.encrypted || null, segredo.iv || null, segredo.tag || null, tokenSeguro.encrypted || null, tokenSeguro.iv || null, tokenSeguro.tag || null, webhookSeguro.encrypted || null, webhookSeguro.iv || null, webhookSeguro.tag || null, b.webhook_enabled !== false]);
    aplicarConfigMercadoPago(result.rows[0]);
    const ambienteEfetivo = ambiente;
    res.json(configMercadoPagoSegura(result.rows[0], { ambiente_efetivo:ambienteEfetivo, webhook_url_sugerida: urlWebhookSugerida(), webhook_fase_2: true, webhook_ativo: webhookAtivo() }));
  } catch (error) { console.error("Erro ao salvar config Mercado Pago:", error); res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Não foi possível salvar a configuração do Mercado Pago." }); }
}

async function buscarPagamentoVenda(req, res) {
  const id = idValido(req.params.venda_id); if (!id) return res.status(400).json({ message: "Venda inválida." });
  try { const result = await pool.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1", [id]); res.json(result.rows[0] || null); }
  catch { res.status(500).json({ message: "Não foi possível buscar o link de pagamento." }); }
}

async function criarOuObterPreferenciaVenda(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = (await client.query(`SELECT v.*,c.nome cliente,c.email,c.telefone,c.cpf FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.id=$1 FOR UPDATE OF v`, [id])).rows[0];
    if (!venda) throw Object.assign(new Error("Venda não encontrada."), { statusCode: 404 });
    if (venda.canal_venda !== "site") throw Object.assign(new Error("A preferência só pode ser criada para pedidos do site."), { statusCode: 400 });
    if (venda.status_pagamento === "pago") throw Object.assign(new Error("Este pedido já está pago."), { statusCode: 409 });
    if (["cancelada", "cancelado"].includes(venda.status) || venda.status_pagamento === "cancelado") throw Object.assign(new Error("Pedido cancelado não pode receber link de pagamento."), { statusCode: 409 });
    const existente = (await client.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 AND status IN ('criado','pending','pendente','in_process','processando','authorized') ORDER BY id DESC LIMIT 1", [id])).rows[0];
    if (existente) { await client.query("COMMIT"); return formatarPreferencia(existente); }
    const config = (await client.query("SELECT * FROM mercado_pago_config ORDER BY id LIMIT 1")).rows[0] || { ambiente: process.env.MERCADO_PAGO_ENV || "sandbox", ativo: false };
    if (!config.ativo) throw Object.assign(new Error("A integração Mercado Pago está desativada na configuração."), { statusCode: 409 });
    const itens = (await client.query("SELECT * FROM itens_venda WHERE venda_id=$1 ORDER BY id", [id])).rows;
    if (!itens.length) throw Object.assign(new Error("A venda não possui itens para pagamento."), { statusCode: 400 });
    const mp = venda.forma_pagamento === "pix"
      ? await criarPagamentoPixVenda({ ...venda, itens, config })
      : await criarPreferenciaPagamentoVenda({ ...venda, itens, config });
    const preferenceId = mp.preference_id || `pix_${mp.payment_id}`;
    const saved = await client.query(`INSERT INTO mercado_pago_pagamentos (venda_id,preference_id,payment_id,init_point,sandbox_init_point,external_reference,status,status_detail,payment_status,payment_status_detail,payment_method_id,payment_type_id,valor,transaction_amount,payload_json,resposta_json,resultado_processamento) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7,$8,$9,$10,$11,$11,$12,$13,$14) RETURNING *`, [id, preferenceId, mp.payment_id || null, mp.init_point || mp.ticket_url || null, mp.sandbox_init_point || null, mp.external_reference || mp.payload.external_reference, mp.status || "pending", mp.status_detail || null, venda.forma_pagamento === "pix" ? "pix" : null, venda.forma_pagamento === "pix" ? "bank_transfer" : null, venda.total, mp.payload, mp.resposta, venda.forma_pagamento === "pix" ? "pix_qr_gerado" : "link_gerado"]);
    await client.query("COMMIT"); return formatarPreferencia(saved.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

function formatarPreferencia(row) {
  const ambiente = String(process.env.MERCADO_PAGO_ENV || "sandbox").toLowerCase();
  const url = ["production","producao"].includes(ambiente) ? row.init_point : (row.sandbox_init_point || row.init_point);
  const transaction = row.resposta_json?.point_of_interaction?.transaction_data || {};
  return { ok: true, venda_id: row.venda_id, preference_id: row.preference_id, payment_id: row.payment_id, payment_status: row.payment_status || row.status, init_point: row.init_point, sandbox_init_point: row.sandbox_init_point, url_pagamento: transaction.ticket_url || url, qr_code: transaction.qr_code || null, qr_code_base64: transaction.qr_code_base64 || null, status: row.status, ambiente };
}

async function criarPreferencia(req, res) {
  const id = idValido(req.params.venda_id); if (!id) return res.status(400).json({ message: "Venda inválida." });
  try { res.json(await criarOuObterPreferenciaVenda(id)); }
  catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Erro ao criar preferência Mercado Pago:", error); res.status(500).json({ message: "Não foi possível gerar o link Mercado Pago." });
  }
}

function statusOrderPoint(raw = {}) {
  const status = String(raw.transactions?.payments?.[0]?.status || raw.status || "pending").toLowerCase();
  if (["approved", "processed"].includes(status)) return "approved";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["failed", "declined", "rejected"].includes(status)) return "rejected";
  if (status === "expired") return "expired";
  return "pending";
}

function resumoOrderPoint(row) {
  return { id: row.id, order_id: row.order_id, venda_id: row.venda_id, caixa_id: row.caixa_id, maquininha_id: row.maquininha_id, terminal_id: row.terminal_id, external_reference: row.external_reference, status: row.status, status_detail: row.status_detail, valor: Number(row.valor), forma_pagamento: row.forma_pagamento, erro: row.erro, approved_at: row.approved_at, created_at: row.created_at, updated_at: row.updated_at };
}

async function criarOrderPointPdv(req, res) {
  const caixaId = idValido(req.body?.caixa_id), maquininhaId = idValido(req.body?.maquininha_id);
  const valor = Number(req.body?.valor), forma = String(req.body?.forma_pagamento || "").toLowerCase();
  if (!caixaId || !maquininhaId || !Number.isFinite(valor) || valor <= 0 || !["pix", "debito", "credito"].includes(forma)) return res.status(400).json({ message: "Caixa, maquininha, valor e forma de pagamento são obrigatórios." });
  try {
    const caixa = (await pool.query("SELECT id FROM caixas WHERE id=$1 AND status='aberto'", [caixaId])).rows[0];
    if (!caixa) return res.status(409).json({ message: "O caixa informado não está aberto." });
    const maquina = (await pool.query("SELECT * FROM maquininhas WHERE id=$1 AND ativo=TRUE", [maquininhaId])).rows[0];
    if (!maquina) return res.status(404).json({ message: "Maquininha não encontrada." });
    if (maquina.mercado_pago_modo !== "point" || !maquina.mercado_pago_ativo || !maquina.mercado_pago_integrada || !maquina.mercado_pago_terminal_id) return res.status(409).json({ message: "Esta maquininha não está configurada como Point integrada." });
    const nonce = crypto.randomUUID(), externalReference = `pdv_${caixaId}_${Date.now()}_${nonce.slice(0, 8)}`;
    const local = (await pool.query(`INSERT INTO mercado_pago_point_orders (caixa_id,maquininha_id,terminal_id,external_reference,status,valor,forma_pagamento) VALUES ($1,$2,$3,$4,'creating',$5,$6) RETURNING *`, [caixaId, maquininhaId, maquina.mercado_pago_terminal_id, externalReference, valor, forma])).rows[0];
    try {
      const mp = await criarOrderPoint({ valor, descricao: texto(req.body?.descricao) || "Venda no PDV Gisele Flávia Modas", terminal_id: maquina.mercado_pago_terminal_id, external_reference: externalReference, forma_pagamento: forma, idempotency_key: nonce });
      const status = statusOrderPoint(mp.resposta);
      const row = (await pool.query(`UPDATE mercado_pago_point_orders SET order_id=$2,status=$3,status_detail=$4,request_payload=$5,response_payload=$6,last_response_payload=$6,approved_at=CASE WHEN $3='approved' THEN NOW() ELSE NULL END,erro=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`, [local.id, texto(mp.resposta?.id), status, texto(mp.resposta?.status_detail), mp.payload, mp.resposta])).rows[0];
      return res.status(201).json(resumoOrderPoint(row));
    } catch (error) {
      await pool.query("UPDATE mercado_pago_point_orders SET status='error',erro=$2,updated_at=NOW() WHERE id=$1", [local.id, error.message]);
      throw error;
    }
  } catch (error) { console.error("Erro ao criar order Point:", error); res.status(error.statusCode || 500).json({ message: error.message || "Não foi possível enviar a cobrança ao Point." }); }
}

async function sincronizarOrderPointPdv(req, res) {
  try {
    const row = (await pool.query("SELECT * FROM mercado_pago_point_orders WHERE order_id=$1", [req.params.order_id])).rows[0];
    if (!row) return res.status(404).json({ message: "Cobrança Point não encontrada." });
    const raw = await consultarOrderPoint(row.order_id), status = statusOrderPoint(raw);
    const atualizado = (await pool.query(`UPDATE mercado_pago_point_orders SET status=$2,status_detail=$3,last_response_payload=$4,approved_at=CASE WHEN $2='approved' THEN COALESCE(approved_at,NOW()) ELSE approved_at END,cancelled_at=CASE WHEN $2 IN ('cancelled','expired') THEN COALESCE(cancelled_at,NOW()) ELSE cancelled_at END,erro=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`, [row.id, status, texto(raw.status_detail || raw.transactions?.payments?.[0]?.status_detail), raw])).rows[0];
    res.json(resumoOrderPoint(atualizado));
  } catch (error) { console.error("Erro ao sincronizar Point:", error); res.status(error.statusCode || 500).json({ message: error.message || "Não foi possível consultar a cobrança Point." }); }
}

async function obterOrderPointPdv(req, res) {
  try { const row = (await pool.query("SELECT * FROM mercado_pago_point_orders WHERE order_id=$1", [req.params.order_id])).rows[0]; if (!row) return res.status(404).json({ message: "Cobrança Point não encontrada." }); res.json(resumoOrderPoint(row)); }
  catch (error) { res.status(500).json({ message: "Não foi possível carregar a cobrança Point." }); }
}

module.exports = { obterConfig, salvarConfig, buscarPagamentoVenda, criarPreferencia, criarOuObterPreferenciaVenda, receberWebhook, sincronizarPagamento, listarLogs, aplicarPagamentoMercadoPago, criarOrderPointPdv, obterOrderPointPdv, sincronizarOrderPointPdv };
