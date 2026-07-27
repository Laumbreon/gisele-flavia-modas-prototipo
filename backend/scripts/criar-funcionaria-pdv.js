const bcrypt = require("bcrypt");
const { pool } = require("../src/config/db");

const PERMISSOES_OPERACIONAIS = ["pdv.acessar", "vendas.criar", "caixa.ver", "caixa.movimentar"];

async function main() {
  const [nome, emailArg, senha] = process.argv.slice(2);
  const email = String(emailArg || "").trim().toLowerCase();
  if (!nome || !email || !senha || senha.length < 8) {
    throw new Error('Uso: node scripts/criar-funcionaria-pdv.js "Nome" "email" "senha com 8+ caracteres"');
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const senhaHash = await bcrypt.hash(senha, 12);
    const result = await client.query(`
      INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
      VALUES ($1, $2, $3, 'funcionario', TRUE)
      ON CONFLICT (email) DO UPDATE SET nome=EXCLUDED.nome, senha_hash=EXCLUDED.senha_hash,
        tipo='funcionario', ativo=TRUE, updated_at=NOW()
      RETURNING id
    `, [nome, email, senhaHash]);

    const usuarioId = result.rows[0].id;
    await client.query("DELETE FROM permissoes_usuario WHERE usuario_id = $1", [usuarioId]);
    for (const permissao of PERMISSOES_OPERACIONAIS) {
      await client.query(`INSERT INTO permissoes_usuario (usuario_id, permissao, permitido)
        VALUES ($1, $2, TRUE)`, [usuarioId, permissao]);
    }
    await client.query("COMMIT");
    console.log("Funcionária de PDV criada/atualizada com sucesso.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
