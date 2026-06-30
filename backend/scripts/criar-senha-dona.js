const readline = require("readline");
const bcrypt = require("bcrypt");
const { pool, query } = require("../src/config/db");

function perguntar(pergunta, { silent = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  if (silent) {
    rl.stdoutMuted = true;
    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function writeToOutput(text) {
      if (rl.stdoutMuted) {
        rl.output.write(text.replace(/./g, "*"));
      } else {
        originalWrite.call(rl, text);
      }
    };
  }

  return new Promise(resolve => {
    rl.question(pergunta, resposta => {
      rl.close();
      if (silent) process.stdout.write("\n");
      resolve(resposta.trim());
    });
  });
}

async function obterCredenciais() {
  const [, , emailArg, senhaArg] = process.argv;
  const email = emailArg || await perguntar("Email da usuária dona: ");
  const senha = senhaArg || await perguntar("Nova senha: ", { silent: true });

  return {
    email: String(email || "").trim().toLowerCase(),
    senha: String(senha || ""),
  };
}

async function main() {
  const { email, senha } = await obterCredenciais();

  if (!email || !senha) {
    console.error("Informe email e senha.");
    process.exitCode = 1;
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const result = await query(
    `
      UPDATE usuarios
      SET senha_hash = $1,
          updated_at = NOW()
      WHERE LOWER(email) = $2
      RETURNING id, email;
    `,
    [senhaHash, email]
  );

  if (!result.rows.length) {
    console.error("Usuária não encontrada para o email informado.");
    process.exitCode = 1;
    return;
  }

  console.log("Senha atualizada com sucesso.");
}

main()
  .catch(error => {
    console.error("Não foi possível atualizar a senha da usuária.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
