const { query } = require("../config/db");

const { pool } = require("../config/db");
const { gerarCodigoUnico, gerarCodigoVariacao, slugCodigo } = require("../utils/codigos-produto");

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
              'codigo_barras', pv.codigo_barras,
              'codigo_interno', pv.codigo_interno,
              'preco_venda', pv.preco_venda,
              'preco_promocional', pv.preco_promocional,
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

async function listarProdutosPublicos(req, res) {
  try {
    const result = await query(produtosSql("WHERE p.status = 'ativo'"));
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar produtos públicos:", error);
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

async function obterProdutoPublico(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Produto inválido." });
  }

  try {
    const result = await query(produtosSql("WHERE p.id = $1 AND p.status = 'ativo'"), [id]);
    const produto = result.rows[0];

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    res.json(produto);
  } catch (error) {
    console.error("Erro ao buscar produto público:", error);
    res.status(500).json({
      message: "Não foi possível buscar o produto no momento.",
    });
  }
}

async function gerarCodigosVariacoes(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const codigosResult = await client.query(`
      SELECT codigo_barras
      FROM produto_variacoes
      WHERE codigo_barras IS NOT NULL AND codigo_barras <> '';
    `);
    const codigosExistentes = codigosResult.rows.map(row => row.codigo_barras);

    const variacoesResult = await client.query(`
      SELECT
        pv.id,
        pv.sku,
        pv.codigo_barras,
        pv.codigo_interno,
        pv.tamanho,
        pv.cor,
        p.nome AS produto_nome
      FROM produto_variacoes pv
      INNER JOIN produtos p ON p.id = pv.produto_id
      WHERE pv.codigo_barras IS NULL OR pv.codigo_barras = ''
      ORDER BY p.nome ASC, pv.tamanho ASC, pv.cor ASC, pv.id ASC
      FOR UPDATE OF pv;
    `);

    const atualizados = [];

    for (const variacao of variacoesResult.rows) {
      const codigoBase = variacao.sku
        ? slugCodigo(variacao.sku)
        : gerarCodigoVariacao({
            produtoNome: variacao.produto_nome,
            tamanho: variacao.tamanho,
            cor: variacao.cor,
          });
      const codigo = gerarCodigoUnico(codigoBase || `VARIACAO-${variacao.id}`, codigosExistentes);

      const updateResult = await client.query(
        `
          UPDATE produto_variacoes
          SET codigo_barras = $1,
              codigo_interno = COALESCE(NULLIF(codigo_interno, ''), $1),
              sku = COALESCE(NULLIF(sku, ''), $1),
              updated_at = NOW()
          WHERE id = $2
            AND (codigo_barras IS NULL OR codigo_barras = '')
          RETURNING id, produto_id, tamanho, cor, sku, codigo_barras, codigo_interno;
        `,
        [codigo, variacao.id]
      );

      if (updateResult.rows.length) {
        codigosExistentes.push(codigo);
        atualizados.push(updateResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Códigos de variações preenchidos com sucesso.",
      total_encontrado: variacoesResult.rows.length,
      total_preenchido: atualizados.length,
      variacoes: atualizados,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao gerar códigos das variações:", error);
    res.status(500).json({
      message: "Não foi possível gerar os códigos das variações no momento.",
    });
  } finally {
    client.release();
  }
}

async function buscarProdutoPorCodigo(req, res) {
  const codigo = String(req.params.codigo || "").trim();

  if (!codigo) {
    return res.status(400).json({ message: "Código inválido." });
  }

  try {
    const result = await query(
      `
        SELECT
          p.id AS produto_id,
          p.nome AS produto_nome,
          p.categoria,
          p.descricao,
          p.preco AS produto_preco,
          p.preco_promocional AS produto_preco_promocional,
          p.status AS produto_status,
          pv.id AS variacao_id,
          pv.cor,
          pv.tamanho,
          pv.sku,
          pv.codigo_barras,
          pv.codigo_interno,
          pv.preco_venda,
          pv.preco_promocional AS variacao_preco_promocional,
          pv.ativo AS variacao_ativa,
          COALESCE(e.quantidade, 0)::int AS quantidade_estoque
        FROM produto_variacoes pv
        INNER JOIN produtos p ON p.id = pv.produto_id
        LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
        WHERE UPPER(pv.sku) = UPPER($1)
           OR UPPER(pv.codigo_barras) = UPPER($1)
           OR UPPER(pv.codigo_interno) = UPPER($1)
        LIMIT 1;
      `,
      [codigo]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ message: "Produto não encontrado para o código informado." });
    }

    const preco = row.preco_venda ?? row.produto_preco;
    const precoPromocional = row.variacao_preco_promocional ?? row.produto_preco_promocional;

    res.json({
      produto: {
        id: row.produto_id,
        nome: row.produto_nome,
        categoria: row.categoria,
        descricao: row.descricao,
        preco: row.produto_preco,
        preco_promocional: row.produto_preco_promocional,
        status: row.produto_status,
      },
      variacao: {
        id: row.variacao_id,
        cor: row.cor,
        tamanho: row.tamanho,
        sku: row.sku,
        codigo_barras: row.codigo_barras,
        codigo_interno: row.codigo_interno,
        preco_venda: row.preco_venda,
        preco_promocional: row.variacao_preco_promocional,
        ativo: row.variacao_ativa,
      },
      preco,
      preco_promocional: precoPromocional,
      estoque: {
        quantidade: row.quantidade_estoque,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar produto por código:", error);
    res.status(500).json({
      message: "Não foi possível buscar o produto pelo código no momento.",
    });
  }
}

module.exports = {
  listarProdutos,
  listarProdutosPublicos,
  obterProduto,
  obterProdutoPublico,
  gerarCodigosVariacoes,
  buscarProdutoPorCodigo,
};
