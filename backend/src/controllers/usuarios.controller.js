const { query } = require("../config/db");

async function listarUsuarios(req, res) {
  try {
    const result = await query(`
      SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.created_at,
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

module.exports = { listarUsuarios };
