const bcrypt = require("bcrypt");
const { query } = require("../config/db");

module.exports = async function fiscalPinMiddleware(req, res, next) {
  if (!req.usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });
  const pin = String(req.get("X-Admin-Pin") || "");
  if (!pin) return res.status(403).json({ message: "PIN administrativo obrigatório." });
  try {
    const result = await query("SELECT pin_hash FROM admin_pins WHERE chave='principal' AND ativo=TRUE LIMIT 1");
    if (!result.rows[0]?.pin_hash || !await bcrypt.compare(pin, result.rows[0].pin_hash)) {
      return res.status(403).json({ message: "PIN administrativo inválido." });
    }
    next();
  } catch (error) {
    console.error("Erro ao validar PIN fiscal:", error);
    res.status(500).json({ message: "Não foi possível validar o PIN administrativo." });
  }
};
