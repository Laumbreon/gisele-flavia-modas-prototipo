const bcrypt = require("bcrypt");
const { pool, query } = require("../src/config/db");

async function main() {
  const pin = String(process.argv[2] || "");
  if (pin.length < 4) throw new Error("Informe um PIN com pelo menos 4 caracteres.");
  const hash = await bcrypt.hash(pin, 12);
  await query(`INSERT INTO admin_pins (chave, pin_hash, ativo)
    VALUES ('principal', $1, TRUE)
    ON CONFLICT (chave) DO UPDATE SET pin_hash=EXCLUDED.pin_hash, ativo=TRUE, updated_at=NOW()`, [hash]);
  console.log("PIN administrativo definido com sucesso.");
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
