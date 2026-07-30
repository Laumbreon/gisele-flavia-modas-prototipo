const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_secret_altere_no_env";
}

function lerToken(req) {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  return scheme === "Bearer" ? token : null;
}

function validarCliente(token) {
  const payload = jwt.verify(token, getJwtSecret());
  if (payload.tipo !== "cliente" || !Number.isInteger(Number(payload.cliente_id))) throw new Error("Token não pertence a um cliente.");
  return payload;
}

function authClienteMiddleware(req, res, next) {
  const token = lerToken(req);
  if (!token) return res.status(401).json({ message: "Token de cliente não informado." });
  try { req.cliente = validarCliente(token); next(); }
  catch { res.status(401).json({ message: "Sessão de cliente inválida ou expirada." }); }
}

function authClienteOpcional(req, res, next) {
  const token = lerToken(req);
  if (!token) return next();
  try { req.cliente = validarCliente(token); next(); }
  catch { res.status(401).json({ message: "Sessão de cliente inválida ou expirada. Entre novamente ou continue como visitante." }); }
}

module.exports = { authClienteMiddleware, authClienteOpcional };
