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

async function criarPreferenciaPagamentoVenda(vendaCompleta) {
  const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token) throw Object.assign(new Error("Access Token do Mercado Pago não configurado no backend."), { statusCode: 503 });
  const config = vendaCompleta.config || {};
  const appUrl = String(process.env.APP_PUBLIC_URL || "http://localhost:5500").replace(/\/$/, "");
  const success = urlValida(config.success_url) || `${appUrl}/?pagamento=sucesso`;
  const failure = urlValida(config.failure_url) || `${appUrl}/?pagamento=falha`;
  const pending = urlValida(config.pending_url) || `${appUrl}/?pagamento=pendente`;
  const payload = {
    items: vendaCompleta.itens.map(item => ({
      id: String(item.produto_variacao_id || item.produto_id || item.id),
      title: String(item.produto_nome || "Produto").slice(0, 256),
      description: [item.tamanho, item.cor].filter(Boolean).join(" / ").slice(0, 256),
      quantity: Number(item.quantidade),
      currency_id: "BRL",
      unit_price: Number(item.preco_unitario),
    })),
    payer: { name: vendaCompleta.cliente || undefined, email: vendaCompleta.email || undefined },
    external_reference: `venda_site_${vendaCompleta.id}`,
    back_urls: { success, failure, pending },
  };
  const successHost = new URL(success).hostname;
  if (!["localhost", "127.0.0.1"].includes(successHost)) payload.auto_return = "approved";
  const notificationUrl = urlValida(config.webhook_url);
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

module.exports = { criarPreferenciaPagamentoVenda };
