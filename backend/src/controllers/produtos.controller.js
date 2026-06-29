const { query } = require("../config/db");

async function listarProdutos(req, res) {
  try {
    const result = await query(`
      SELECT
        p.id,
        p.nome,
        p.categoria,
        p.preco,
        p.preco_promocional,
        p.descricao,
        (p.status = 'ativo') AS ativo,
        COALESCE(SUM(e.quantidade), 0)::int AS estoque_total,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id,
              'cor', pv.cor,
              'tamanho', pv.tamanho,
              'sku', pv.sku,
              'quantidade_estoque', COALESCE(e.quantidade, 0)
            )
            ORDER BY pv.cor, pv.tamanho
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) AS variacoes
      FROM produtos p
      LEFT JOIN produto_variacoes pv ON pv.produto_id = p.id
      LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
      GROUP BY p.id
      ORDER BY p.id;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({
      message: "Não foi possível buscar os produtos no momento.",
    });
  }
}

module.exports = {
  listarProdutos,
};
