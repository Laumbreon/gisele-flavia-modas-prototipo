const https = require("https");

function urlValida(value) {
  if (!value) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}

function postJson(url, payload, headers) {
  if (typeof fetch === "function") {
    return fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
      .then(async response => ({ ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) }));
  }
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: "POST", headers }, response => {
      let raw = "";
      response.on("data", chunk => { raw += chunk; });
      response.on("end", () => {
        let data = {}; try { data = JSON.parse(raw || "{}"); } catch { data = { message: raw }; }
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, data });
      });
    });
    request.on("error", reject); request.end(JSON.stringify(payload));
  });
}

function getJson(url, headers) {
  if (typeof fetch === "function") {
    return fetch(url, { method: "GET", headers })
      .then(async response => ({ ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) }));
  }
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: "GET", headers }, response => {
      let raw = "";
      response.on("data", chunk => { raw += chunk; });
      response.on("end", () => {
        let data = {}; try { data = JSON.parse(raw || "{}"); } catch { data = { message: raw }; }
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, data });
      });
    });
    request.on("error", reject); request.end();
  });
}

async function consultarPagamento(paymentId) {
  const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token) throw Object.assign(new Error("Token Mercado Pago não configurado."), { statusCode: 503, code: "MP_TOKEN_NAO_CONFIGURADO" });
  const id = String(paymentId || "").trim();
  if (!id) throw Object.assign(new Error("ID do pagamento não informado."), { statusCode: 400 });
  const response = await getJson(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  });
  if (!response.ok) {
    const credencialInvalida = [401, 403].includes(response.status);
    const message = credencialInvalida ? "Token Mercado Pago inválido ou sem permissão." : response.status === 404 ? "Pagamento não encontrado no Mercado Pago." : (response.data?.message || response.data?.error || `Mercado Pago respondeu HTTP ${response.status}.`);
    throw Object.assign(new Error(message), { statusCode: response.status === 404 ? 404 : credencialInvalida ? 502 : 502, code: credencialInvalida ? "MP_TOKEN_INVALIDO" : "MP_CONSULTA_ERRO", mercadoPago: response.data });
  }
  const raw = response.data || {};
  return {
    payment_id: String(raw.id || id), id: String(raw.id || id), status: raw.status,
    status_detail: raw.status_detail, transaction_amount: Number(raw.transaction_amount || 0),
    total_paid_amount: Number(raw.transaction_details?.total_paid_amount ?? raw.transaction_amount ?? 0),
    external_reference: raw.external_reference, date_approved: raw.date_approved || null,
    payment_method_id: raw.payment_method_id, payment_type_id: raw.payment_type_id,
    payer: raw.payer || null, preference_id: raw.preference_id || raw.metadata?.preference_id || null,
    order: raw.order || null, raw_response: raw,
  };
}

async function buscarPagamentoPorReferencia(externalReference) {
  const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token) throw Object.assign(new Error("Token Mercado Pago não configurado."), { statusCode: 503, code: "MP_TOKEN_NAO_CONFIGURADO" });
  const referencia = String(externalReference || "").trim();
  if (!referencia) return null;
  const response = await getJson(`https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(referencia)}`, { Authorization: `Bearer ${token}`, Accept: "application/json" });
  if (!response.ok) {
    const credencialInvalida = [401,403].includes(response.status);
    throw Object.assign(new Error(credencialInvalida ? "Token Mercado Pago inválido ou sem permissão." : "Não foi possível localizar o pagamento da preferência."), { statusCode: 502, code: credencialInvalida ? "MP_TOKEN_INVALIDO" : "MP_BUSCA_ERRO" });
  }
  const primeiro = Array.isArray(response.data?.results) ? response.data.results[0] : null;
  return primeiro?.id ? consultarPagamento(primeiro.id) : null;
}

async function criarPreferenciaPagamentoVenda(vendaCompleta) {
  const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token) throw Object.assign(new Error("Token Mercado Pago não configurado."), { statusCode: 503, code: "MP_TOKEN_NAO_CONFIGURADO" });
  const config = vendaCompleta.config || {};
  const appUrl = String(process.env.APP_PUBLIC_URL || "http://localhost:5500").replace(/\/+$/, "");
  const ambiente = String(process.env.MERCADO_PAGO_ENV || "sandbox").trim().toLowerCase();
  if (!["sandbox","production","producao"].includes(ambiente)) throw Object.assign(new Error("MERCADO_PAGO_ENV deve ser sandbox ou production."), { statusCode: 503, code: "MP_AMBIENTE_INVALIDO" });
  if (["production","producao"].includes(ambiente) && appUrl !== "https://giseleflavia.com") throw Object.assign(new Error("Em produção, APP_PUBLIC_URL deve ser https://giseleflavia.com."), { statusCode: 503, code: "MP_APP_URL_INVALIDA" });
  const success = urlValida(config.success_url) || `${appUrl}/?pagamento=sucesso`;
  const failure = urlValida(config.failure_url) || `${appUrl}/?pagamento=falha`;
  const pending = urlValida(config.pending_url) || `${appUrl}/?pagamento=pendente`;
  const items = vendaCompleta.itens.map(item => ({
      id: String(item.produto_variacao_id || item.produto_id || item.id),
      title: String(item.produto_nome || "Produto").slice(0, 256),
      description: [item.tamanho, item.cor].filter(Boolean).join(" / ").slice(0, 256),
      quantity: Number(item.quantidade),
      currency_id: "BRL",
      unit_price: Number(item.preco_unitario),
    }));
  if (Number(vendaCompleta.frete_valor || 0) > 0) items.push({ id: `frete-${vendaCompleta.id}`, title: "Entrega local", description: "Frete do pedido", quantity: 1, currency_id: "BRL", unit_price: Number(vendaCompleta.frete_valor) });
  const valorItens = items.reduce((total, item) => total + Number(item.unit_price) * Number(item.quantity), 0);
  if (Math.abs(valorItens - Number(vendaCompleta.total || 0)) > 0.01) throw Object.assign(new Error("O total dos itens não corresponde ao total da venda."), { statusCode: 409, code: "MP_TOTAL_INVALIDO" });
  const payload = {
    items,
    payer: { name: vendaCompleta.cliente || undefined, email: vendaCompleta.email || undefined },
    external_reference: `venda_site_${vendaCompleta.id}`,
    back_urls: { success, failure, pending },
  };
  if (vendaCompleta.forma_pagamento === "cartao") {
    const parcelas = Math.min(3, Math.max(1, Number(vendaCompleta.parcelas || 1)));
    payload.payment_methods = { installments: 3, default_installments: parcelas };
    payload.metadata = { parcelas_escolhidas: parcelas };
  }
  const successHost = new URL(success).hostname;
  if (!["localhost", "127.0.0.1"].includes(successHost)) payload.auto_return = "approved";
  const webhookAtivo = String(process.env.MERCADO_PAGO_WEBHOOK_ENABLED || "true").toLowerCase() !== "false";
  const notificationUrl = webhookAtivo ? urlValida(`${appUrl}/api/mercado-pago/webhook`) : null;
  if (notificationUrl) payload.notification_url = notificationUrl;
  const response = await postJson("https://api.mercadopago.com/checkout/preferences", payload, {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": `venda-site-${vendaCompleta.id}`,
  });
  if (!response.ok) {
    const message = response.data?.message || response.data?.error || `Mercado Pago respondeu HTTP ${response.status}.`;
    throw Object.assign(new Error(message), { statusCode: response.status >= 400 && response.status < 500 ? 400 : 502, mercadoPago: response.data });
  }
  return { preference_id: response.data.id, init_point: response.data.init_point, sandbox_init_point: response.data.sandbox_init_point, payload, resposta: response.data };
}

module.exports = { criarPreferenciaPagamentoVenda, consultarPagamento, consultarPagamentoMercadoPago: consultarPagamento, buscarPagamentoPorReferencia };
