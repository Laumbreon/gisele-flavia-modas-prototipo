const { query } = require("../config/db");

function permissoesMiddleware(permissoes) {
  const aceitas = Array.isArray(permissoes) ? permissoes : [permissoes];
  return async (req, res, next) => {
    if (!req.usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });
    if (["dona", "super_admin"].includes(req.usuario.tipo)) return next();

    try {
      const result = await query(
        `SELECT 1 FROM permissoes_usuario
         WHERE usuario_id = $1 AND permissao = ANY($2::varchar[]) AND permitido = TRUE
         LIMIT 1`,
        [req.usuario.id, aceitas]
      );
      if (!result.rows.length) return res.status(403).json({ message: "Permissão insuficiente." });
      next();
    } catch (error) {
      console.error("Erro ao validar permissões:", error);
      res.status(500).json({ message: "Não foi possível validar a permissão." });
    }
  };
}

module.exports = permissoesMiddleware;
