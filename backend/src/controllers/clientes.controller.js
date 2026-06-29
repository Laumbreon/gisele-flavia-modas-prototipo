const { query } = require("../config/db");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

async function listarClientes(req, res) {
  try {
    const result = await query(`
      SELECT
        id,
        nome,
        telefone,
        email,
        cpf,
        endereco,
        cidade,
        estado,
        cep,
        ativo,
        created_at,
        updated_at
      FROM clientes
      WHERE ativo = TRUE
      ORDER BY nome ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({
      message: "Não foi possível buscar os clientes no momento.",
    });
  }
}

async function criarCliente(req, res) {
  const nome = normalizeOptional(req.body.nome);
  const telefone = normalizeOptional(req.body.telefone);
  const email = normalizeOptional(req.body.email);
  const cpf = normalizeOptional(req.body.cpf);
  const endereco = normalizeOptional(req.body.endereco);
  const cidade = normalizeOptional(req.body.cidade);
  const estado = normalizeOptional(req.body.estado);
  const cep = normalizeOptional(req.body.cep);

  if (!nome) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ message: "E-mail inválido." });
  }

  try {
    const result = await query(
      `
        INSERT INTO clientes (nome, telefone, email, cpf, endereco, cidade, estado, cep)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          nome,
          telefone,
          email,
          cpf,
          endereco,
          cidade,
          estado,
          cep,
          ativo,
          created_at,
          updated_at;
      `,
      [nome, telefone, email, cpf, endereco, cidade, estado, cep]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({
      message: "Não foi possível criar o cliente no momento.",
    });
  }
}

module.exports = {
  listarClientes,
  criarCliente,
};
