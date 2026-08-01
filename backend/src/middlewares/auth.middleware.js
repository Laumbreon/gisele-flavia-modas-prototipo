const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_secret_altere_no_env";
}

function cookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const item of cookies) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, bearerToken] = authHeader.split(" ");
  const token = scheme === "Bearer" && bearerToken
    ? bearerToken
    : req.method === "GET" && ["/admin", "/admin-access"].includes(req.path)
      ? cookie(req, "gisele_admin_session")
      : null;

  if (!token) return res.status(401).json({ message: "Token não informado." });

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.tipo === "cliente" || payload.cliente_id) {
      return res.status(403).json({ message: "Conta de cliente não possui acesso administrativo." });
    }

    const result = await query(
      "SELECT id, email, tipo, ativo FROM usuarios WHERE id = $1 AND ativo = TRUE LIMIT 1",
      [payload.id]
    );
    const usuario = result.rows[0];
    if (!usuario || !["dona", "funcionario", "super_admin"].includes(usuario.tipo)) {
      return res.status(401).json({ message: "Sessão administrativa inválida." });
    }

    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = authMiddleware;
