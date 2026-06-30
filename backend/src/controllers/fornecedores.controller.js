const { query } = require("../config/db");

async function listarFornecedores(req, res) {
  try {
    const result = await query(`
      SELECT
        id,
        nome,
        categoria_fornecida,
        contato,
        whatsapp,
        email,
        cidade,
        estado,
        ultima_compra,
        status,
        created_at,
        updated_at
      FROM fornecedores
      ORDER BY nome ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar fornecedores:", error);
    res.status(500).json({
      message: "Não foi possível buscar os fornecedores no momento.",
    });
  }
}

module.exports = {
  listarFornecedores,
};
