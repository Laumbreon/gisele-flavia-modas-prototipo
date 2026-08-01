const crypto = require("crypto");

const API_BASE = "https://api.mercadopago.com";

function accessToken() {
  const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token) {
    const error = new Error("Mercado Pago ainda não está configurado.");
    error.statusCode = 503;
    throw error;
  }
  return token;
}

async function chamadaPoint(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalhes = Array.isArray(data.errors)
      ? data.errors
          .map((item) => item?.message || item?.description || item?.code)
          .filter(Boolean)
          .join("; ")
      : "";
    const error = new Error(detalhes || data.message || data.error || "Não foi possível comunicar com o Mercado Pago Point.");
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function criarOrderPoint({ valor, descricao, terminal_id, external_reference, notification_url, forma_pagamento, idempotency_key }) {
  const payload = {
    type: "point",
    external_reference,
    expiration_time: "PT10M",
    description: descricao,
    transactions: { payments: [{ amount: Number(valor).toFixed(2) }] },
    config: { point: { terminal_id, print_on_terminal: "no_ticket" } }
  };
  if (notification_url) payload.notification_url = notification_url;
  const resposta = await chamadaPoint("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotency_key || crypto.randomUUID() },
    body: JSON.stringify(payload)
  });
  return { payload, resposta };
}

async function consultarOrderPoint(orderId) {
  return chamadaPoint(`/v1/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

module.exports = { criarOrderPoint, consultarOrderPoint };
