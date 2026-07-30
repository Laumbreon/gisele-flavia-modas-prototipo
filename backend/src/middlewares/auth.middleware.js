const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_secret_altere_no_env";
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token não informado." });
  }

  try {
    req.usuario = jwt.verify(token, getJwtSecret());
    if (req.usuario.tipo === "cliente" || req.usuario.cliente_id) {
      return res.status(403).json({ message: "Conta de cliente não possui acesso administrativo." });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = authMiddleware;
