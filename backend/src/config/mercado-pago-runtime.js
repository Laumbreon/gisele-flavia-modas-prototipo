const crypto = require("crypto");
const { pool } = require("./db");

function chaveCredenciais() {
  const material = String(process.env.MERCADO_PAGO_CREDENTIALS_KEY || process.env.JWT_SECRET || "").trim();
  if (!material) throw Object.assign(new Error("Configure MERCADO_PAGO_CREDENTIALS_KEY ou JWT_SECRET para proteger as credenciais."), { statusCode: 503 });
  return crypto.createHash("sha256").update(material).digest();
}

function criptografarSegredo(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveCredenciais(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

function descriptografarSegredo(encrypted, iv, tag) {
  if (!encrypted || !iv || !tag) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", chaveCredenciais(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

function aplicarConfigMercadoPago(config) {
  if (!config) return;
  const accessToken = descriptografarSegredo(config.access_token_encrypted, config.access_token_iv, config.access_token_tag);
  const webhookSecret = descriptografarSegredo(config.webhook_secret_encrypted, config.webhook_secret_iv, config.webhook_secret_tag);
  if (accessToken) process.env.MERCADO_PAGO_ACCESS_TOKEN = accessToken;
  if (webhookSecret) process.env.MERCADO_PAGO_WEBHOOK_SECRET = webhookSecret;
  process.env.MERCADO_PAGO_ENV = config.ambiente === "producao" ? "production" : "sandbox";
  process.env.MERCADO_PAGO_WEBHOOK_ENABLED = config.webhook_enabled === false ? "false" : "true";
}

async function carregarMercadoPagoDoBanco() {
  const result = await pool.query("SELECT * FROM mercado_pago_config ORDER BY id LIMIT 1");
  if (result.rows[0]) aplicarConfigMercadoPago(result.rows[0]);
}

module.exports = { criptografarSegredo, aplicarConfigMercadoPago, carregarMercadoPagoDoBanco };
