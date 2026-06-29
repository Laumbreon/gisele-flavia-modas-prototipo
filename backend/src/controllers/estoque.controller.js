const { query } = require("../config/db");

async function listarEstoque(req, res) {
  try {
    const result = await query(`
      SELECT
        p.id AS produto_id,
        p.nome AS produto_nome,
        p.categoria,
        pv.id AS variacao_id,
        pv.cor,
        pv.tamanho,
        pv.sku,
        e.quantidade,
        e.quantidade_minima AS estoque_minimo,
        CASE
          WHEN e.quantidade <= 0 THEN 'zerado'
          WHEN e.quantidade <= e.quantidade_minima THEN 'baixo'
          ELSE 'normal'
        END AS status
      FROM estoque e
      INNER JOIN produto_variacoes pv ON pv.id = e.produto_variacao_id
      INNER JOIN produtos p ON p.id = pv.produto_id
      ORDER BY p.nome ASC, pv.cor ASC, pv.tamanho ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    res.status(500).json({
      message: "Não foi possível buscar o estoque no momento.",
    });
  }
}

module.exports = {
  listarEstoque,
};
