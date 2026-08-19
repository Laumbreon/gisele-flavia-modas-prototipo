const bcrypt = require("bcrypt");
const { query } = require("../config/db");
const { obterStatusConfiguracaoCorreios } = require("../services/correios-token.service");

async function validarPin(req, res) {
  const pin = String(req.body.pin || "");
  if (!pin) return res.status(403).json({ message: "PIN administrativo obrigatório." });
  try {
    const result = await query("SELECT pin_hash FROM admin_pins WHERE chave = 'principal' AND ativo = TRUE LIMIT 1");
    const valido = result.rows[0]?.pin_hash && await bcrypt.compare(pin, result.rows[0].pin_hash);
    if (!valido) return res.status(403).json({ message: "PIN administrativo inválido." });
    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao validar PIN administrativo:", error);
    res.status(500).json({ message: "Não foi possível validar o PIN administrativo." });
  }
}

function statusCorreios(_req, res) {
  res.json(obterStatusConfiguracaoCorreios());
}

module.exports = { validarPin, statusCorreios };
