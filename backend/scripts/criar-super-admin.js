const bcrypt = require("bcrypt");
const { pool, query } = require("../src/config/db");

const TODAS_PERMISSOES = [
  "vendas.criar", "vendas.cancelar", "produtos.criar", "produtos.editar",
  "estoque.ver", "estoque.movimentar", "clientes.ver", "clientes.editar",
  "fornecedores.ver", "fornecedores.editar", "relatorios.ver", "configuracoes.editar",
  "funcionarios.gerenciar", "etiquetas.imprimir", "admin.sensivel", "maquininhas.ver",
  "maquininhas.gerenciar", "mercado_pago.configurar"
];

async function main() {
  const [nome, emailArg, senha] = process.argv.slice(2);
  const email = String(emailArg || "").trim().toLowerCase();
  if (!nome || !email || !senha || senha.length < 8) {
    throw new Error('Uso: node scripts/criar-super-admin.js "Nome" "email" "senha com 8+ caracteres"');
  }
  const senhaHash = await bcrypt.hash(senha, 12);
  const result = await query(`INSERT INTO usuarios (nome,email,senha_hash,tipo,ativo)
    VALUES ($1,$2,$3,'super_admin',TRUE)
    ON CONFLICT (email) DO UPDATE SET nome=EXCLUDED.nome,senha_hash=EXCLUDED.senha_hash,
      tipo='super_admin',ativo=TRUE,updated_at=NOW() RETURNING id`, [nome, email, senhaHash]);
  for (const permissao of TODAS_PERMISSOES) {
    await query(`INSERT INTO permissoes_usuario (usuario_id,permissao,permitido) VALUES ($1,$2,TRUE)
      ON CONFLICT (usuario_id,permissao) DO UPDATE SET permitido=TRUE`, [result.rows[0].id, permissao]);
  }
  console.log("Super admin criado/atualizado com sucesso.");
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
