const crypto = require("crypto");

function validarAssinaturaWebhookMercadoPago(req) {
  const secret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "").trim();
  if (!secret) return { valida: true, configurada: false, motivo: "Secret não configurado; validação liberada para sandbox/local." };

  const assinatura = String(req.headers["x-signature"] || "");
  const requestId = String(req.headers["x-request-id"] || "");
  const partes = Object.fromEntries(assinatura.split(",").map(parte => parte.trim().split("=", 2)));
  const ts = partes.ts;
  const v1 = partes.v1;
  const dataId = req.query?.["data.id"] ?? req.query?.data_id ?? req.query?.data?.id ?? req.body?.data?.id ?? (String(req.query?.topic || req.query?.type || "").toLowerCase() === "payment" ? req.query?.id : null);
  if (!ts || !v1 || !dataId || !requestId) return { valida: false, configurada: true, motivo: "Cabeçalhos de assinatura incompletos." };

  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifesto).digest("hex");
  const recebidoBuffer = Buffer.from(v1, "utf8");
  const esperadoBuffer = Buffer.from(esperado, "utf8");
  const valida = recebidoBuffer.length === esperadoBuffer.length && crypto.timingSafeEqual(recebidoBuffer, esperadoBuffer);
  return { valida, configurada: true, motivo: valida ? "Assinatura válida." : "Assinatura inválida." };
}

module.exports = { validarAssinaturaWebhookMercadoPago };
