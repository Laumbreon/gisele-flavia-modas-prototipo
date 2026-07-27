const bcrypt = require("bcrypt");
const { query } = require("../config/db");

async function adminPinMiddleware(req, res, next) {
  if (!req.usuario?.id) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  const tipo = req.usuario.tipo;
  if (tipo !== "dona" && tipo !== "super_admin") {
    return res.status(403).json({ message: "Acesso administrativo não autorizado." });
  }

  const pin = String(req.get("X-Admin-Pin") || "");
  if (!pin) {
    return res.status(403).json({ message: "PIN administrativo obrigatório." });
  }

  try {
    const result = await query(
      "SELECT pin_hash FROM admin_pins WHERE chave = 'principal' AND ativo = TRUE LIMIT 1"
    );
    const pinHash = result.rows[0]?.pin_hash;
    const valido = pinHash ? await bcrypt.compare(pin, pinHash) : false;
    if (!valido) {
      return res.status(403).json({ message: "PIN administrativo inválido." });
    }
    next();
  } catch (error) {
    console.error("Erro ao validar PIN administrativo:", error);
    res.status(500).json({ message: "Não foi possível validar o PIN administrativo." });
  }
}

module.exports = adminPinMiddleware;
