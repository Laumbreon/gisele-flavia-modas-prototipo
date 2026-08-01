const { pool, query } = require("../config/db");
const bcrypt = require("bcrypt");

const MAX_ADMINISTRADORES = 3;
const EMAIL_ADMIN_PROTEGIDO = "four4code4@gmail.com";
const TIPOS_ADMINISTRADOR = ["dona", "super_admin"];

function texto(value) {
  return String(value || "").trim();
}

function emailNormalizado(value) {
  return texto(value).toLowerCase();
}

async function listarUsuarios(req, res) {
  try {
    const result = await query(`
      SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.created_at,
        (LOWER(u.email) = '${EMAIL_ADMIN_PROTEGIDO}') AS protegido,
        COALESCE(json_agg(json_build_object('permissao', p.permissao, 'permitido', p.permitido)
          ORDER BY p.permissao) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissoes
      FROM usuarios u
      LEFT JOIN permissoes_usuario p ON p.usuario_id = u.id AND p.permitido = TRUE
      WHERE u.ativo = TRUE
      GROUP BY u.id
      ORDER BY CASE u.tipo WHEN 'super_admin' THEN 1 WHEN 'dona' THEN 2 ELSE 3 END, u.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ message: "Não foi possível listar os usuários." });
  }
}

async function criarAdministrador(req, res) {
  const nome = texto(req.body.nome);
  const email = emailNormalizado(req.body.email);
  const senha = String(req.body.senha || "");

  if (nome.length < 2) return res.status(400).json({ message: "Informe o nome do administrador." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Informe um e-mail válido." });
  if (senha.length < 8) return res.status(400).json({ message: "A senha deve ter pelo menos 8 caracteres." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE");

    const existente = await client.query("SELECT id, ativo, tipo FROM usuarios WHERE LOWER(email) = $1", [email]);
    if (existente.rows[0]?.ativo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Já existe um usuário ativo com este e-mail." });
    }

    const total = await client.query(
      "SELECT COUNT(*)::integer AS total FROM usuarios WHERE ativo = TRUE AND tipo = ANY($1::varchar[])",
      [TIPOS_ADMINISTRADOR]
    );
    if (total.rows[0].total >= MAX_ADMINISTRADORES) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "O limite de 3 administradores ativos já foi atingido." });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const result = await client.query(`
      INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
      VALUES ($1, $2, $3, 'super_admin', TRUE)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash,
        tipo = 'super_admin', ativo = TRUE, updated_at = NOW()
      RETURNING id, nome, email, tipo, ativo, created_at
    `, [nome, email, senhaHash]);

    await client.query("COMMIT");
    res.status(201).json({ ...result.rows[0], protegido: email === EMAIL_ADMIN_PROTEGIDO });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar administrador:", error);
    res.status(500).json({ message: "Não foi possível criar o administrador." });
  } finally {
    client.release();
  }
}

async function excluirAdministrador(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Administrador inválido." });
  if (id === Number(req.usuario.id)) return res.status(400).json({ message: "Você não pode excluir a própria conta." });

  try {
    const usuario = await query("SELECT id, email, tipo, ativo FROM usuarios WHERE id = $1", [id]);
    const alvo = usuario.rows[0];
    if (!alvo || !TIPOS_ADMINISTRADOR.includes(alvo.tipo)) return res.status(404).json({ message: "Administrador não encontrado." });
    if (emailNormalizado(alvo.email) === EMAIL_ADMIN_PROTEGIDO) {
      return res.status(403).json({ message: "Este administrador é protegido e não pode ser excluído." });
    }

    await query("UPDATE usuarios SET ativo = FALSE, updated_at = NOW() WHERE id = $1", [id]);
    res.json({ message: "Administrador excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir administrador:", error);
    res.status(500).json({ message: "Não foi possível excluir o administrador." });
  }
}

module.exports = { listarUsuarios, criarAdministrador, excluirAdministrador };
