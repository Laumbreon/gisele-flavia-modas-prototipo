const { query } = require("../config/db");

function addFilter(values, conditions, sql, value) {
  values.push(value);
  conditions.push(sql.replace("?", `$${values.length}`));
}

function buildMovimentacoesFilters(filters) {
  const conditions = [];
  const values = [];

  if (filters.tipo) {
    addFilter(values, conditions, "m.tipo = ?", filters.tipo);
  }

  if (filters.produto_id) {
    const produtoId = Number(filters.produto_id);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return { error: "produto_id deve ser um número inteiro positivo." };
    }

    addFilter(values, conditions, "m.produto_id = ?", produtoId);
  }

  if (filters.data_inicio) {
    addFilter(values, conditions, "m.created_at >= ?", filters.data_inicio);
  }

  if (filters.data_fim) {
    addFilter(values, conditions, "m.created_at <= ?", filters.data_fim);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

async function listarMovimentacoes(req, res) {
  const filters = buildMovimentacoesFilters(req.query);

  if (filters.error) {
    return res.status(400).json({ message: filters.error });
  }

  try {
    const result = await query(
      `
        SELECT
          m.id,
          m.tipo,
          m.motivo,
          m.quantidade,
          p.nome AS produto,
          pv.cor,
          pv.tamanho,
          pv.sku,
          NULLIF(SUBSTRING(m.observacoes FROM 'Venda #([0-9]+)'), '')::int AS venda_id,
          m.created_at
        FROM movimentacoes_estoque m
        LEFT JOIN produtos p ON p.id = m.produto_id
        LEFT JOIN produto_variacoes pv ON pv.id = m.produto_variacao_id
        ${filters.where}
        ORDER BY m.created_at DESC
        LIMIT 100;
      `,
      filters.values
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar movimentações:", error);
    res.status(500).json({
      message: "Não foi possível buscar as movimentações no momento.",
    });
  }
}

module.exports = {
  listarMovimentacoes,
};
