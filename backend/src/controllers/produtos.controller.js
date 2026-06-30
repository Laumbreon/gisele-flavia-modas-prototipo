const { query } = require("../config/db");

function produtosSql(whereClause = "") {
  return `
    WITH variacoes AS (
      SELECT
        pv.produto_id,
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
      FROM produto_variacoes pv
      LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
      GROUP BY pv.produto_id
    ),
    midias AS (
      SELECT
        pm.produto_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pm.id,
              'produto_id', pm.produto_id,
              'tipo', pm.tipo,
              'url', pm.url,
              'titulo', pm.titulo,
              'ordem', pm.ordem,
              'principal', pm.principal
            )
            ORDER BY pm.principal DESC, pm.ordem ASC, pm.id ASC
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::json
        ) AS midias
      FROM produto_midias pm
      GROUP BY pm.produto_id
    )
    SELECT
      p.id,
      p.nome,
      p.categoria,
      p.preco,
      p.preco_promocional,
      p.descricao,
      (p.status = 'ativo') AS ativo,
      COALESCE(v.estoque_total, 0)::int AS estoque_total,
      COALESCE(v.variacoes, '[]'::json) AS variacoes,
      COALESCE(m.midias, '[]'::json) AS midias
    FROM produtos p
    LEFT JOIN variacoes v ON v.produto_id = p.id
    LEFT JOIN midias m ON m.produto_id = p.id
    ${whereClause}
    ORDER BY p.id;
  `;
}

async function listarProdutos(req, res) {
  try {
    const result = await query(produtosSql());
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({
      message: "Não foi possível buscar os produtos no momento.",
    });
  }
}

async function obterProduto(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Produto inválido." });
  }

  try {
    const result = await query(produtosSql("WHERE p.id = $1"), [id]);
    const produto = result.rows[0];

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    res.json(produto);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({
      message: "Não foi possível buscar o produto no momento.",
    });
  }
}

module.exports = {
  listarProdutos,
  obterProduto,
};
