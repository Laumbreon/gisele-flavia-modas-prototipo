const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_secret_altere_no_env";
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "8h";
}

function sanitizeUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    ativo: usuario.ativo,
    created_at: usuario.created_at,
    updated_at: usuario.updated_at,
  };
}

async function buscarPermissoes(usuarioId) {
  const result = await query(
    `
      SELECT permissao, permitido
      FROM permissoes_usuario
      WHERE usuario_id = $1
      ORDER BY permissao ASC;
    `,
    [usuarioId]
  );

  return result.rows;
}

async function senhaConfere(senha, senhaHash) {
  if (!senhaHash) return false;

  try {
    return await bcrypt.compare(senha, senhaHash);
  } catch (error) {
    return false;
  }
}

async function login(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const result = await query(
      `
        SELECT id, nome, email, senha_hash, tipo, ativo, created_at, updated_at
        FROM usuarios
        WHERE LOWER(email) = $1
        LIMIT 1;
      `,
      [email]
    );

    const usuario = result.rows[0];

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const senhaValida = await senhaConfere(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const usuarioSeguro = sanitizeUsuario(usuario);
    const permissoes = await buscarPermissoes(usuario.id);
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
      },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() }
    );

    res.json({ token, usuario: usuarioSeguro, permissoes });
  } catch (error) {
    console.error("Erro ao autenticar usuário:", error);
    res.status(500).json({ message: "Não foi possível autenticar no momento." });
  }
}

async function me(req, res) {
  try {
    const result = await query(
      `
        SELECT id, nome, email, tipo, ativo, created_at, updated_at
        FROM usuarios
        WHERE id = $1
        LIMIT 1;
      `,
      [req.usuario.id]
    );

    const usuario = result.rows[0];

    if (!usuario || !usuario.ativo) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const permissoes = await buscarPermissoes(usuario.id);
    res.json({ usuario: sanitizeUsuario(usuario), permissoes });
  } catch (error) {
    console.error("Erro ao buscar usuário autenticado:", error);
    res.status(500).json({ message: "Não foi possível buscar o usuário autenticado." });
  }
}

module.exports = {
  login,
  me,
};
