const { query } = require("../config/db");

function permissaoMiddleware(permissao) {
  return async (req, res, next) => {
    if (!req.usuario?.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    try {
      const result = await query(
        `
          SELECT 1
          FROM permissoes_usuario
          WHERE usuario_id = $1
            AND permissao = $2
            AND permitido = TRUE
          LIMIT 1;
        `,
        [req.usuario.id, permissao]
      );

      if (!result.rows.length) {
        return res.status(403).json({ message: "Permissão insuficiente." });
      }

      next();
    } catch (error) {
      console.error("Erro ao validar permissão:", error);
      res.status(500).json({ message: "Não foi possível validar a permissão." });
    }
  };
}

module.exports = permissaoMiddleware;
