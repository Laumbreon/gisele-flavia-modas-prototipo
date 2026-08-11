const { query } = require("../config/db");

const { pool } = require("../config/db");
const fs = require("fs");
const path = require("path");
const { uploadsDir } = require("../middlewares/upload-produtos.middleware");
const { gerarCodigoUnico, gerarCodigoVariacao, slugCodigo } = require("../utils/codigos-produto");

function produtosSql(whereClause = "", somenteVariacoesAtivas = false) {
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
              'codigo_ref', pv.codigo_ref,
              'preco_venda', pv.preco_venda,
              'preco_promocional', pv.preco_promocional,
              'ativo', pv.ativo,
              'quantidade_estoque', COALESCE(e.quantidade, 0),
              'estoque_minimo', COALESCE(e.quantidade_minima, 0)
            )
            ORDER BY pv.cor, pv.tamanho
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) AS variacoes
      FROM produto_variacoes pv
      LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
      ${somenteVariacoesAtivas ? "WHERE pv.ativo = TRUE" : ""}
      GROUP BY pv.produto_id
    ),
    medidas AS (
      SELECT produto_id, COALESCE(json_agg(json_build_object('id',id,'produto_id',produto_id,'tamanho',tamanho,'busto',busto,'cintura',cintura,'quadril',quadril,'comprimento',comprimento,'observacao',observacao,'ordem',ordem) ORDER BY ordem,id),'[]'::json) medidas
      FROM produto_medidas GROUP BY produto_id
    ), midias AS (
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
              'alt_text', pm.alt_text,
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
      COALESCE(m.midias, '[]'::json) AS midias,
      COALESCE(md.medidas, '[]'::json) AS medidas
    FROM produtos p
    LEFT JOIN variacoes v ON v.produto_id = p.id
    LEFT JOIN midias m ON m.produto_id = p.id
    LEFT JOIN medidas md ON md.produto_id = p.id
    ${whereClause}
    ORDER BY p.id;
  `;
}

async function listarProdutos(req, res) {
  const status = String(req.query.status || "ativos").toLowerCase();
  const filtros = {
    ativos: "WHERE p.status = 'ativo'",
    arquivados: "WHERE p.status <> 'ativo'",
    todos: "",
  };
  if (!Object.prototype.hasOwnProperty.call(filtros, status)) {
    return res.status(400).json({ message: "Filtro de produtos inválido." });
  }
  try {
    const result = await query(produtosSql(filtros[status]));
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
    const result = await query(produtosSql(`
      WHERE p.status = 'ativo'
        AND EXISTS (
          SELECT 1
          FROM produto_variacoes pv_disponivel
          INNER JOIN estoque e_disponivel
            ON e_disponivel.produto_variacao_id = pv_disponivel.id
          WHERE pv_disponivel.produto_id = p.id
            AND pv_disponivel.ativo = TRUE
            AND e_disponivel.quantidade > 0
        )
    `, true));
    res.json(result.rows.map(aplicarCategoriaPublica));
  } catch (error) {
    console.error("Erro ao listar produtos públicos:", error);
    res.status(500).json({
      message: "Não foi possível buscar os produtos no momento.",
    });
  }
}

async function listarCategoriasPublicas(req, res) {
  try {
    const result = await query(`
      WITH categorias_disponiveis AS (
        SELECT
          c.id,
          CASE WHEN LOWER(c.slug) = 'calcados' THEN 'T-shirts' ELSE c.nome END AS nome,
          CASE WHEN LOWER(c.slug) = 'calcados' THEN 't-shirts' ELSE c.slug END AS slug,
          c.descricao,
          c.ordem,
          p.id AS produto_id
        FROM categorias_produtos c
        INNER JOIN produtos p
          ON LOWER(p.categoria) = LOWER(c.nome)
         AND p.status = 'ativo'
        WHERE c.ativo = TRUE
          AND EXISTS (
            SELECT 1
            FROM produto_variacoes pv
            INNER JOIN estoque e ON e.produto_variacao_id = pv.id
            WHERE pv.produto_id = p.id
              AND pv.ativo = TRUE
              AND e.quantidade > 0
          )
      )
      SELECT
        MIN(cd.id)::int AS id,
        cd.nome,
        cd.slug,
        MAX(cd.descricao) AS descricao,
        MIN(cd.ordem)::int AS ordem,
        COUNT(DISTINCT cd.produto_id)::int AS quantidade_produtos,
        (
          ARRAY_AGG(pm.url ORDER BY pm.principal DESC, pm.ordem ASC, pm.id ASC)
          FILTER (WHERE pm.id IS NOT NULL)
        )[1] AS imagem
      FROM categorias_disponiveis cd
      LEFT JOIN produto_midias pm
        ON pm.produto_id = cd.produto_id
       AND pm.tipo = 'imagem'
      GROUP BY cd.nome, cd.slug
      ORDER BY MIN(cd.ordem) ASC, cd.nome ASC;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar categorias públicas:", error);
    res.status(500).json({ message: "Não foi possível carregar as categorias." });
  }
}

function aplicarCategoriaPublica(produto) {
  const categoria = String(produto.categoria || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return categoria === "calcados" ? { ...produto, categoria: "T-shirts" } : produto;
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
    const result = await query(produtosSql("WHERE p.id = $1 AND p.status = 'ativo'", true), [id]);
    const produto = result.rows[0];

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    res.json(aplicarCategoriaPublica(produto));
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
      WHERE pv.codigo_barras IS NULL
         OR pv.codigo_barras = ''
         OR LENGTH(pv.codigo_barras) > 18
      ORDER BY p.nome ASC, pv.tamanho ASC, pv.cor ASC, pv.id ASC
      FOR UPDATE OF pv;
    `);

    const atualizados = [];

    for (const variacao of variacoesResult.rows) {
      const codigo = `GF${String(variacao.id).padStart(6, "0")}`;
      if (codigosExistentes.some(existente => String(existente).toUpperCase() === codigo)) continue;

      const updateResult = await client.query(
        `
          UPDATE produto_variacoes
          SET codigo_barras = $1,
              codigo_interno = COALESCE(NULLIF(codigo_interno, ''), sku, $1),
              updated_at = NOW()
          WHERE id = $2
            AND (codigo_barras IS NULL OR codigo_barras = '' OR LENGTH(codigo_barras) > 18)
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

async function gerarCodigoCurtoVariacao(req, res) {
  const produtoId = inteiroPositivo(req.params.id);
  const variacaoId = inteiroPositivo(req.params.variacao_id);
  if (!produtoId || !variacaoId) return res.status(400).json({ message: "Variação inválida." });
  const codigo = `GF${String(variacaoId).padStart(6, "0")}`;
  try {
    const result = await query(
      `UPDATE produto_variacoes
       SET codigo_barras=$3, updated_at=NOW()
       WHERE id=$1 AND produto_id=$2
       RETURNING id,produto_id,sku,codigo_barras,codigo_interno,tamanho,cor`,
      [variacaoId, produtoId, codigo]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Variação não encontrada." });
    res.json({ message: "Código curto gerado com sucesso.", variacao: result.rows[0] });
  } catch (error) {
    res.status(error.code === "23505" ? 409 : 500).json({
      message: error.code === "23505" ? "Esse código curto já está sendo usado por outra variação." : "Não foi possível gerar o código curto.",
    });
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
          pv.codigo_ref,
          pv.preco_venda,
          pv.preco_promocional AS variacao_preco_promocional,
          pv.ativo AS variacao_ativa,
          COALESCE(e.quantidade, 0)::int AS quantidade_estoque
        FROM produto_variacoes pv
        INNER JOIN produtos p ON p.id = pv.produto_id
        LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
        WHERE p.status = 'ativo'
          AND pv.ativo = TRUE
          AND (UPPER(pv.sku) = UPPER($1)
           OR UPPER(pv.codigo_barras) = UPPER($1)
           OR UPPER(pv.codigo_interno) = UPPER($1)
           OR UPPER(pv.codigo_ref) = UPPER($1))
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
        codigo_ref: row.codigo_ref,
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

const inteiroPositivo = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const textoV2 = (value, limite = 5000) => String(value ?? "").trim().slice(0, limite);
const numeroNaoNegativo = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

function validarProduto(body) {
  const nome = textoV2(body.nome, 140), categoria = textoV2(body.categoria, 80);
  const preco = numeroNaoNegativo(body.preco);
  const promocional = body.preco_promocional === null || body.preco_promocional === "" || body.preco_promocional === undefined ? null : numeroNaoNegativo(body.preco_promocional);
  if (!nome || !categoria) return { erro: "Nome e categoria são obrigatórios." };
  if (preco === null || promocional === null && body.preco_promocional !== null && body.preco_promocional !== "" && body.preco_promocional !== undefined) return { erro: "Informe preços válidos e não negativos." };
  return { nome, categoria, preco, promocional, descricao: textoV2(body.descricao), status: body.ativo === false || body.status === "inativo" ? "inativo" : "ativo" };
}

async function codigoUnicoParaVariacao(client, produtoNome, produtoCategoria, variacao, ignorarId = null) {
  const informado = textoV2(variacao.sku || variacao.codigo_interno, 80);
  const categoriaSlug=slugCodigo(produtoCategoria);const prefixos={VESTIDOS:"VEST",BLUSAS:"BLUSA",CALCAS:"CALCA",SAIAS:"SAIA",CONJUNTOS:"CONJ"};const prefixo=prefixos[categoriaSlug]||categoriaSlug.slice(0,8);const nomeLimpo=slugCodigo(produtoNome).replace(/^(VESTIDO|BLUSA|CALCA|SAIA|CONJUNTO)-?/,"");
  const base = slugCodigo(informado || [prefixo,nomeLimpo,variacao.tamanho,variacao.cor].filter(Boolean).join("-"));
  const result = await client.query("SELECT sku,codigo_barras,codigo_interno FROM produto_variacoes WHERE ($1::int IS NULL OR id<>$1)", [ignorarId]);
  const usados = result.rows.flatMap(row => [row.sku, row.codigo_barras, row.codigo_interno]).filter(Boolean);
  return gerarCodigoUnico(base || `PRODUTO-${Date.now()}`, usados);
}

async function inserirVariacao(client, produtoId, produtoNome, produtoCategoria, body) {
  const tamanho = textoV2(body.tamanho, 30), cor = textoV2(body.cor, 60);
  if (!tamanho || !cor) throw Object.assign(new Error("Tamanho e cor são obrigatórios em cada variação."), { statusCode: 400 });
  const preco = body.preco_venda === "" || body.preco_venda == null ? null : numeroNaoNegativo(body.preco_venda);
  const promocional = body.preco_promocional === "" || body.preco_promocional == null ? null : numeroNaoNegativo(body.preco_promocional);
  const quantidade = numeroNaoNegativo(body.quantidade_inicial ?? body.quantidade ?? 0);
  const minimo = numeroNaoNegativo(body.estoque_minimo ?? 0);
  if (preco === null && body.preco_venda !== "" && body.preco_venda != null || promocional === null && body.preco_promocional !== "" && body.preco_promocional != null || quantidade === null || minimo === null || !Number.isInteger(quantidade) || !Number.isInteger(minimo)) throw Object.assign(new Error("Preço e estoque da variação são inválidos."), { statusCode: 400 });
  const gerado = await codigoUnicoParaVariacao(client, produtoNome, produtoCategoria, { ...body, tamanho, cor });
  const sku = textoV2(body.sku, 80) || gerado;
  const codigoBarrasInformado = textoV2(body.codigo_barras, 80) || null;
  const codigoInterno = textoV2(body.codigo_interno, 80) || sku;
  const codigoRef = textoV2(body.codigo_ref, 80) || null;
  const row = (await client.query(`INSERT INTO produto_variacoes (produto_id,tamanho,cor,sku,codigo_barras,codigo_interno,codigo_ref,preco_venda,preco_promocional,ativo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [produtoId, tamanho, cor, sku, codigoBarrasInformado, codigoInterno, codigoRef, preco, promocional, body.ativo !== false])).rows[0];
  if (!codigoBarrasInformado) {
    row.codigo_barras = `GF${String(row.id).padStart(6, "0")}`;
    await client.query("UPDATE produto_variacoes SET codigo_barras=$2,updated_at=NOW() WHERE id=$1", [row.id, row.codigo_barras]);
  }
  await client.query("INSERT INTO estoque (produto_variacao_id,quantidade,quantidade_minima) VALUES ($1,$2,$3)", [row.id, quantidade, minimo]);
  if (quantidade > 0) await client.query(`INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes)
    VALUES ($1,$2,'entrada',$3,'Estoque inicial',$4,'Cadastro de Produtos e Estoque V2')`, [produtoId, row.id, quantidade, "Cadastro administrativo"]);
  return row;
}

async function criarProduto(req, res) {
  const dados = validarProduto(req.body || {}); if (dados.erro) return res.status(400).json({ message: dados.erro });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const produto = (await client.query(`INSERT INTO produtos (nome,categoria,descricao,preco,preco_promocional,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [dados.nome, dados.categoria, dados.descricao || null, dados.preco, dados.promocional, dados.status])).rows[0];
    for (const variacao of Array.isArray(req.body.variacoes) ? req.body.variacoes : []) await inserirVariacao(client, produto.id, produto.nome, produto.categoria, variacao);
    await client.query("COMMIT");
    const completo = await query(produtosSql("WHERE p.id=$1"), [produto.id]); res.status(201).json(completo.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); console.error("Erro ao criar produto:", error); res.status(error.statusCode || (error.code === "23505" ? 409 : 500)).json({ message: error.code === "23505" ? "Já existe uma variação com esse tamanho, cor ou código." : error.message || "Não foi possível criar o produto." }); }
  finally { client.release(); }
}

async function atualizarProduto(req, res) {
  const id = inteiroPositivo(req.params.id), dados = validarProduto(req.body || {}); if (!id) return res.status(400).json({ message: "Produto inválido." }); if (dados.erro) return res.status(400).json({ message: dados.erro });
  try { const result = await query(`UPDATE produtos SET nome=$2,categoria=$3,descricao=$4,preco=$5,preco_promocional=$6,status=$7,updated_at=NOW() WHERE id=$1 RETURNING *`, [id, dados.nome, dados.categoria, dados.descricao || null, dados.preco, dados.promocional, dados.status]); if (!result.rows[0]) return res.status(404).json({ message: "Produto não encontrado." }); res.json(result.rows[0]); }
  catch (error) { res.status(500).json({ message: "Não foi possível atualizar o produto." }); }
}

async function criarVariacao(req, res) {
  const id = inteiroPositivo(req.params.id); if (!id) return res.status(400).json({ message: "Produto inválido." }); const client = await pool.connect();
  try { await client.query("BEGIN"); const produto = (await client.query("SELECT * FROM produtos WHERE id=$1 FOR UPDATE", [id])).rows[0]; if (!produto) throw Object.assign(new Error("Produto não encontrado."), { statusCode: 404 }); const row = await inserirVariacao(client, id, produto.nome, produto.categoria, req.body || {}); await client.query("COMMIT"); res.status(201).json(row); }
  catch (error) { await client.query("ROLLBACK"); res.status(error.statusCode || (error.code === "23505" ? 409 : 500)).json({ message: error.code === "23505" ? "Tamanho, cor ou código já cadastrado." : error.message }); } finally { client.release(); }
}

async function atualizarVariacao(req, res) {
  const produtoId = inteiroPositivo(req.params.id), id = inteiroPositivo(req.params.variacao_id); if (!produtoId || !id) return res.status(400).json({ message: "Variação inválida." });
  const b = req.body || {}, tamanho = textoV2(b.tamanho, 30), cor = textoV2(b.cor, 60); if (!tamanho || !cor) return res.status(400).json({ message: "Tamanho e cor são obrigatórios." });
  if (b.preco_venda !== "" && b.preco_venda != null && numeroNaoNegativo(b.preco_venda) === null || b.preco_promocional !== "" && b.preco_promocional != null && numeroNaoNegativo(b.preco_promocional) === null) return res.status(400).json({ message: "Informe preços válidos e não negativos." });
  const minimo=numeroNaoNegativo(b.estoque_minimo??0);
  const estoqueInformado=b.quantidade_estoque??b.quantidade_atual;
  const novoEstoque=estoqueInformado===undefined?null:numeroNaoNegativo(estoqueInformado);
  if(minimo===null||!Number.isInteger(minimo)||novoEstoque!==null&&!Number.isInteger(novoEstoque))return res.status(400).json({message:"Informe estoques inteiros e não negativos."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const atual=(await client.query(`SELECT pv.*,e.quantidade FROM produto_variacoes pv INNER JOIN estoque e ON e.produto_variacao_id=pv.id WHERE pv.id=$1 AND pv.produto_id=$2 FOR UPDATE OF pv,e`,[id,produtoId])).rows[0];
    if(!atual)throw Object.assign(new Error("Variação não encontrada."),{statusCode:404});
    const result=await client.query(`UPDATE produto_variacoes SET tamanho=$3,cor=$4,sku=COALESCE(NULLIF($5,''),sku),codigo_barras=COALESCE(NULLIF($6,''),codigo_barras),codigo_interno=COALESCE(NULLIF($7,''),codigo_interno),codigo_ref=NULLIF($8,''),preco_venda=$9,preco_promocional=$10,ativo=$11,updated_at=NOW() WHERE id=$1 AND produto_id=$2 RETURNING *`,[id,produtoId,tamanho,cor,textoV2(b.sku,80),textoV2(b.codigo_barras,80),textoV2(b.codigo_interno,80),textoV2(b.codigo_ref,80),b.preco_venda===""||b.preco_venda==null?null:numeroNaoNegativo(b.preco_venda),b.preco_promocional===""||b.preco_promocional==null?null:numeroNaoNegativo(b.preco_promocional),b.ativo!==false]);
    const saldoAnterior=Number(atual.quantidade||0),saldoFinal=novoEstoque===null?saldoAnterior:novoEstoque;
    await client.query(`INSERT INTO estoque (produto_variacao_id,quantidade,quantidade_minima) VALUES ($1,$2,$3) ON CONFLICT (produto_variacao_id) DO UPDATE SET quantidade=EXCLUDED.quantidade,quantidade_minima=EXCLUDED.quantidade_minima,updated_at=NOW()`,[id,saldoFinal,minimo]);
    if(saldoFinal!==saldoAnterior)await client.query(`INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes) VALUES ($1,$2,'ajuste',$3,'Ajuste no cadastro do produto',$4,$5)`,[produtoId,id,Math.abs(saldoFinal-saldoAnterior),req.usuario?.nome||"Gestão",`Saldo anterior: ${saldoAnterior}. Novo saldo: ${saldoFinal}.`]);
    await client.query("COMMIT");
    res.json({...result.rows[0],quantidade_estoque:saldoFinal,estoque_minimo:minimo,estoque_alterado:saldoFinal!==saldoAnterior});
  } catch(error) { await client.query("ROLLBACK");res.status(error.statusCode||(error.code==="23505"?409:500)).json({message:error.code==="23505"?"Código ou combinação tamanho/cor já cadastrada.":error.message||"Não foi possível atualizar a variação."}); }
  finally { client.release(); }
}

async function alterarStatusProduto(req,res,status,mensagem){
  const id=inteiroPositivo(req.params.id);if(!id)return res.status(400).json({message:"Produto inválido."});
  const client=await pool.connect();try{await client.query("BEGIN");const row=(await client.query("SELECT id,nome,status FROM produtos WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!row)throw Object.assign(new Error("Produto não encontrado."),{statusCode:404});const produto=(await client.query("UPDATE produtos SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,nome,status",[id,status])).rows[0];await client.query("COMMIT");res.json({ok:true,message:mensagem,produto});}catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível atualizar o produto."});}finally{client.release();}
}
const arquivarProduto=(req,res)=>alterarStatusProduto(req,res,"inativo","Produto arquivado. Ele não aparece mais na loja nem no PDV.");
const restaurarProduto=(req,res)=>alterarStatusProduto(req,res,"ativo","Produto restaurado e disponível novamente.");

async function excluirProduto(req,res){
  const id=inteiroPositivo(req.params.id);if(!id)return res.status(400).json({message:"Produto inválido."});
  const client=await pool.connect();try{await client.query("BEGIN");const produto=(await client.query("SELECT id,nome FROM produtos WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!produto)throw Object.assign(new Error("Produto não encontrado."),{statusCode:404});
    const vinculos=(await client.query(`SELECT EXISTS(SELECT 1 FROM itens_venda WHERE produto_id=$1 OR produto_variacao_id IN (SELECT id FROM produto_variacoes WHERE produto_id=$1)) AS vendas,EXISTS(SELECT 1 FROM movimentacoes_estoque WHERE produto_id=$1 OR produto_variacao_id IN (SELECT id FROM produto_variacoes WHERE produto_id=$1)) AS movimentos,EXISTS(SELECT 1 FROM produto_fiscal WHERE produto_id=$1) AS fiscal`,[id])).rows[0];
    if(vinculos.vendas||vinculos.movimentos||vinculos.fiscal){await client.query("UPDATE produtos SET status='inativo',updated_at=NOW() WHERE id=$1",[id]);await client.query("COMMIT");return res.json({ok:true,excluido:false,arquivado:true,message:"Este produto possui histórico e foi arquivado com segurança, sem apagar vendas, estoque ou dados fiscais."});}
    await client.query("DELETE FROM produtos WHERE id=$1",[id]);await client.query("COMMIT");res.json({ok:true,excluido:true,arquivado:false,message:"Produto excluído definitivamente. Os arquivos físicos de fotos e vídeos foram preservados."});
  }catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível excluir o produto."});}finally{client.release();}
}

async function excluirProdutoDefinitivamente(req, res) {
  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ message: "Produto inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const produto = (await client.query("SELECT id, nome FROM produtos WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!produto) throw Object.assign(new Error("Produto não encontrado."), { statusCode: 404 });
    const midias = (await client.query("SELECT url FROM produto_midias WHERE produto_id=$1", [id])).rows;
    await client.query("DELETE FROM produtos WHERE id=$1", [id]);
    await client.query("COMMIT");
    midias.forEach(item => excluirArquivoLocal(item.url));
    return res.json({ ok: true, message: `Produto ${produto.nome} excluído definitivamente.` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao excluir produto definitivamente:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Não foi possível excluir o produto definitivamente." });
  } finally {
    client.release();
  }
}

async function excluirVariacao(req, res) {
  const produtoId = inteiroPositivo(req.params.id), id = inteiroPositivo(req.params.variacao_id); if (!produtoId || !id) return res.status(400).json({ message: "Variação inválida." });
  try { const usada = await query("SELECT 1 FROM itens_venda WHERE produto_variacao_id=$1 LIMIT 1", [id]); if (usada.rows.length) { await query("UPDATE produto_variacoes SET ativo=FALSE,updated_at=NOW() WHERE id=$1 AND produto_id=$2", [id, produtoId]); return res.json({ ok: true, message: "Variação inativada porque possui histórico de vendas." }); } const result = await query("DELETE FROM produto_variacoes WHERE id=$1 AND produto_id=$2 RETURNING id", [id, produtoId]); if (!result.rows[0]) return res.status(404).json({ message: "Variação não encontrada." }); res.json({ ok: true, message: "Variação removida." }); }
  catch { res.status(500).json({ message: "Não foi possível remover a variação." }); }
}

async function criarMidia(req, res) {
  const produtoId = inteiroPositivo(req.params.id), url = textoV2(req.body?.url, 2000); if (!produtoId || !url) return res.status(400).json({ message: "Produto e URL da imagem são obrigatórios." });
  try { new URL(url, "http://localhost"); } catch { return res.status(400).json({ message: "URL de imagem inválida." }); }
  const client = await pool.connect(); try { await client.query("BEGIN"); const total = Number((await client.query("SELECT COUNT(*) total FROM produto_midias WHERE produto_id=$1", [produtoId])).rows[0].total); const principal = req.body.principal === true || total === 0; if (principal) await client.query("UPDATE produto_midias SET principal=FALSE WHERE produto_id=$1", [produtoId]); const row = (await client.query(`INSERT INTO produto_midias (produto_id,tipo,url,titulo,alt_text,ordem,principal) VALUES ($1,'imagem',$2,$3,$4,$5,$6) RETURNING *`, [produtoId, url, textoV2(req.body.titulo,140)||null, textoV2(req.body.alt_text,180)||null, Number.isInteger(Number(req.body.ordem))?Number(req.body.ordem):total, principal])).rows[0]; await client.query("COMMIT"); res.status(201).json(row); }
  catch (error) { await client.query("ROLLBACK"); res.status(500).json({ message: "Não foi possível adicionar a imagem." }); } finally { client.release(); }
}

async function atualizarMidia(req, res) {
  const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.midia_id),url=textoV2(req.body?.url,2000);if(!produtoId||!id||!url)return res.status(400).json({message:"Mídia inválida."});const client=await pool.connect();try{await client.query("BEGIN");if(req.body.principal===true)await client.query("UPDATE produto_midias SET principal=FALSE WHERE produto_id=$1",[produtoId]);const row=(await client.query(`UPDATE produto_midias SET url=$3,titulo=$4,alt_text=$5,ordem=$6,principal=$7,updated_at=NOW() WHERE id=$1 AND produto_id=$2 RETURNING *`,[id,produtoId,url,textoV2(req.body.titulo,140)||null,textoV2(req.body.alt_text,180)||null,Number(req.body.ordem)||0,req.body.principal===true])).rows[0];if(!row)throw Object.assign(new Error("Mídia não encontrada."),{statusCode:404});await client.query("COMMIT");res.json(row);}catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível atualizar a imagem."});}finally{client.release();}
}

async function excluirMidia(req,res){const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.midia_id);if(!produtoId||!id)return res.status(400).json({message:"Mídia inválida."});const client=await pool.connect();try{await client.query("BEGIN");const removida=(await client.query("DELETE FROM produto_midias WHERE id=$1 AND produto_id=$2 RETURNING principal",[id,produtoId])).rows[0];if(!removida)throw Object.assign(new Error("Mídia não encontrada."),{statusCode:404});if(removida.principal)await client.query("UPDATE produto_midias SET principal=TRUE WHERE id=(SELECT id FROM produto_midias WHERE produto_id=$1 ORDER BY ordem,id LIMIT 1)",[produtoId]);await client.query("COMMIT");res.json({ok:true,message:"Imagem removida."});}catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível remover a imagem."});}finally{client.release();}}

function excluirArquivoLocal(url) {
  if (!String(url || "").startsWith("/uploads/produtos/")) return;
  const arquivo = path.resolve(uploadsDir, path.basename(url));
  if (path.dirname(arquivo) === uploadsDir) fs.promises.unlink(arquivo).catch(error => { if (error.code !== "ENOENT") console.error("Erro ao excluir upload:", error); });
}

async function criarMidiaV2(req,res){const produtoId=inteiroPositivo(req.params.id),url=textoV2(req.body?.url,2000);if(!produtoId||!url)return res.status(400).json({message:"Produto e link/caminho são obrigatórios."});const ext=path.extname(url.split("?")[0]).toLowerCase(),tipo=[".mp4",".mov",".webm"].includes(ext)?"video":"imagem";const client=await pool.connect();try{await client.query("BEGIN");const total=Number((await client.query("SELECT COUNT(*) total FROM produto_midias WHERE produto_id=$1",[produtoId])).rows[0].total),temCapa=(await client.query("SELECT 1 FROM produto_midias WHERE produto_id=$1 AND tipo='imagem' AND principal=TRUE",[produtoId])).rows.length>0,principal=tipo==="imagem"&&(req.body.principal===true||!temCapa);if(principal)await client.query("UPDATE produto_midias SET principal=FALSE,updated_at=NOW() WHERE produto_id=$1",[produtoId]);const row=(await client.query(`INSERT INTO produto_midias (produto_id,tipo,url,titulo,alt_text,ordem,principal) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[produtoId,tipo,url,textoV2(req.body.titulo,140)||null,textoV2(req.body.alt_text,180)||null,total,principal])).rows[0];await client.query("COMMIT");res.status(201).json(row);}catch(error){await client.query("ROLLBACK");res.status(500).json({message:"Não foi possível adicionar o link/caminho."});}finally{client.release();}}

async function uploadMidias(req, res) {
  const produtoId = inteiroPositivo(req.params.id), arquivos = req.files || [];
  if (!produtoId) { arquivos.forEach(file => excluirArquivoLocal(`/uploads/produtos/${file.filename}`)); return res.status(400).json({ message: "Produto inválido." }); }
  if (!arquivos.length) return res.status(400).json({ message: "Escolha ao menos uma foto ou vídeo." });
  const imagemGrande = arquivos.find(file => file.mimetype.startsWith("image/") && file.size > 10 * 1024 * 1024);
  if (imagemGrande) { arquivos.forEach(file => excluirArquivoLocal(`/uploads/produtos/${file.filename}`)); return res.status(400).json({ message: `A foto ${imagemGrande.originalname} excede o limite de 10 MB.` }); }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!(await client.query("SELECT 1 FROM produtos WHERE id=$1", [produtoId])).rows.length) throw Object.assign(new Error("Produto não encontrado."), { statusCode: 404 });
    const totalAtual=Number((await client.query("SELECT COUNT(*) total FROM produto_midias WHERE produto_id=$1",[produtoId])).rows[0].total);
    if(totalAtual+arquivos.length>12)throw Object.assign(new Error("O produto pode ter no máximo 12 fotos e vídeos."),{statusCode:400});
    let ordem = Number((await client.query("SELECT COALESCE(MAX(ordem),-1)+1 ordem FROM produto_midias WHERE produto_id=$1", [produtoId])).rows[0].ordem);
    const possuiPrincipal = (await client.query("SELECT 1 FROM produto_midias WHERE produto_id=$1 AND principal=TRUE AND tipo='imagem'", [produtoId])).rows.length > 0;
    const principalIndice = Number(req.body?.principal_indice);
    const primeiraImagem = arquivos.findIndex(file => file.mimetype.startsWith("image/"));
    const indicePrincipal = Number.isInteger(principalIndice) && arquivos[principalIndice]?.mimetype.startsWith("image/") ? principalIndice : (!possuiPrincipal ? primeiraImagem : -1);
    if (indicePrincipal >= 0) await client.query("UPDATE produto_midias SET principal=FALSE,updated_at=NOW() WHERE produto_id=$1", [produtoId]);
    const salvas = [];
    for (let index=0; index<arquivos.length; index+=1) {
      const file=arquivos[index], tipo=file.mimetype.startsWith("image/")?"imagem":"video";
      const row=(await client.query(`INSERT INTO produto_midias (produto_id,tipo,url,titulo,alt_text,ordem,principal) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[produtoId,tipo,`/uploads/produtos/${file.filename}`,null,textoV2(req.body?.alt_text,180)||null,ordem,index===indicePrincipal])).rows[0];
      salvas.push(row);ordem+=1;
    }
    await client.query("COMMIT");res.status(201).json({ message: "Fotos e vídeos enviados com sucesso.", midias: salvas });
  } catch(error) { await client.query("ROLLBACK");arquivos.forEach(file=>excluirArquivoLocal(`/uploads/produtos/${file.filename}`));res.status(error.statusCode||500).json({message:error.message||"Não foi possível enviar os arquivos."}); }
  finally { client.release(); }
}

async function atualizarMidiaV2(req,res){const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.midia_id);if(!produtoId||!id)return res.status(400).json({message:"Foto ou vídeo inválido."});const client=await pool.connect();try{await client.query("BEGIN");const atual=(await client.query("SELECT * FROM produto_midias WHERE id=$1 AND produto_id=$2 FOR UPDATE",[id,produtoId])).rows[0];if(!atual)throw Object.assign(new Error("Foto ou vídeo não encontrado."),{statusCode:404});const principal=req.body.principal===undefined?atual.principal:req.body.principal===true&&atual.tipo==="imagem";if(req.body.principal===true&&atual.tipo==="imagem")await client.query("UPDATE produto_midias SET principal=FALSE,updated_at=NOW() WHERE produto_id=$1",[produtoId]);const alt=req.body.alt_text===undefined?atual.alt_text:textoV2(req.body.alt_text,180)||null;const row=(await client.query(`UPDATE produto_midias SET alt_text=$3,ordem=$4,principal=$5,updated_at=NOW() WHERE id=$1 AND produto_id=$2 RETURNING *`,[id,produtoId,alt,Number.isInteger(Number(req.body.ordem))?Number(req.body.ordem):atual.ordem,principal])).rows[0];await client.query("COMMIT");res.json(row);}catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível atualizar a foto ou vídeo."});}finally{client.release();}}

async function excluirMidiaV2(req,res){const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.midia_id);if(!produtoId||!id)return res.status(400).json({message:"Foto ou vídeo inválido."});const client=await pool.connect();try{await client.query("BEGIN");const removida=(await client.query("DELETE FROM produto_midias WHERE id=$1 AND produto_id=$2 RETURNING *",[id,produtoId])).rows[0];if(!removida)throw Object.assign(new Error("Foto ou vídeo não encontrado."),{statusCode:404});if(removida.principal)await client.query("UPDATE produto_midias SET principal=TRUE,updated_at=NOW() WHERE id=(SELECT id FROM produto_midias WHERE produto_id=$1 AND tipo='imagem' ORDER BY ordem,id LIMIT 1)",[produtoId]);await client.query("COMMIT");excluirArquivoLocal(removida.url);res.json({ok:true,message:"Foto ou vídeo removido."});}catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.message||"Não foi possível remover o arquivo."});}finally{client.release();}}

async function listarMedidas(req,res){const produtoId=inteiroPositivo(req.params.id);if(!produtoId)return res.status(400).json({message:"Produto inválido."});try{res.json((await query("SELECT * FROM produto_medidas WHERE produto_id=$1 ORDER BY ordem,id",[produtoId])).rows);}catch{res.status(500).json({message:"Não foi possível carregar as medidas."});}}
function dadosMedida(body){return [textoV2(body.tamanho,30)||null,textoV2(body.busto,50)||null,textoV2(body.cintura,50)||null,textoV2(body.quadril,50)||null,textoV2(body.comprimento,50)||null,textoV2(body.observacao,2000)||null,Number.isInteger(Number(body.ordem))?Number(body.ordem):0];}
async function criarMedida(req,res){const produtoId=inteiroPositivo(req.params.id);if(!produtoId)return res.status(400).json({message:"Produto inválido."});try{const d=dadosMedida(req.body||{});const row=(await query(`INSERT INTO produto_medidas (produto_id,tamanho,busto,cintura,quadril,comprimento,observacao,ordem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[produtoId,...d])).rows[0];res.status(201).json(row);}catch{res.status(500).json({message:"Não foi possível adicionar a medida."});}}
async function atualizarMedida(req,res){const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.medida_id);if(!produtoId||!id)return res.status(400).json({message:"Medida inválida."});try{const d=dadosMedida(req.body||{});const row=(await query(`UPDATE produto_medidas SET tamanho=$3,busto=$4,cintura=$5,quadril=$6,comprimento=$7,observacao=$8,ordem=$9,updated_at=NOW() WHERE id=$1 AND produto_id=$2 RETURNING *`,[id,produtoId,...d])).rows[0];if(!row)return res.status(404).json({message:"Medida não encontrada."});res.json(row);}catch{res.status(500).json({message:"Não foi possível atualizar a medida."});}}
async function excluirMedida(req,res){const produtoId=inteiroPositivo(req.params.id),id=inteiroPositivo(req.params.medida_id);if(!produtoId||!id)return res.status(400).json({message:"Medida inválida."});try{const row=(await query("DELETE FROM produto_medidas WHERE id=$1 AND produto_id=$2 RETURNING id",[id,produtoId])).rows[0];if(!row)return res.status(404).json({message:"Medida não encontrada."});res.json({ok:true,message:"Medida removida."});}catch{res.status(500).json({message:"Não foi possível remover a medida."});}}

async function listarCategorias(req,res){try{res.json((await query("SELECT * FROM categorias_produtos ORDER BY ativo DESC,ordem,nome")).rows);}catch{res.status(500).json({message:"Não foi possível carregar as categorias."});}}
async function criarCategoria(req,res){const nome=textoV2(req.body?.nome,120);if(!nome)return res.status(400).json({message:"Informe o nome da categoria."});const slugBase=slugCodigo(nome).toLowerCase();try{const existente=(await query("SELECT * FROM categorias_produtos WHERE LOWER(nome)=LOWER($1) LIMIT 1",[nome])).rows[0];if(existente){const row=(await query("UPDATE categorias_produtos SET ativo=TRUE,updated_at=NOW() WHERE id=$1 RETURNING *",[existente.id])).rows[0];return res.json(row);}const row=(await query("INSERT INTO categorias_produtos (nome,slug,descricao,ordem) VALUES ($1,$2,$3,$4) RETURNING *",[nome,slugBase,textoV2(req.body?.descricao,2000)||null,Number(req.body?.ordem)||0])).rows[0];res.status(201).json(row);}catch(error){res.status(error.code==="23505"?409:500).json({message:error.code==="23505"?"Essa categoria já existe.":"Não foi possível criar a categoria."});}}
async function atualizarCategoria(req,res){const id=inteiroPositivo(req.params.categoria_id),nome=textoV2(req.body?.nome,120);if(!id||!nome)return res.status(400).json({message:"Categoria inválida."});try{const row=(await query(`UPDATE categorias_produtos SET nome=$2,slug=$3,descricao=$4,ativo=$5,ordem=$6,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,nome,slugCodigo(nome).toLowerCase(),textoV2(req.body?.descricao,2000)||null,req.body?.ativo!==false,Number(req.body?.ordem)||0])).rows[0];if(!row)return res.status(404).json({message:"Categoria não encontrada."});res.json(row);}catch(error){res.status(error.code==="23505"?409:500).json({message:error.code==="23505"?"Já existe uma categoria com esse nome.":"Não foi possível atualizar a categoria."});}}
async function excluirCategoria(req,res){const id=inteiroPositivo(req.params.categoria_id);if(!id)return res.status(400).json({message:"Categoria inválida."});try{const row=(await query("UPDATE categorias_produtos SET ativo=FALSE,updated_at=NOW() WHERE id=$1 RETURNING *",[id])).rows[0];if(!row)return res.status(404).json({message:"Categoria não encontrada."});res.json({ok:true,message:"Categoria inativada.",categoria:row});}catch{res.status(500).json({message:"Não foi possível inativar a categoria."});}}

module.exports = {
  listarProdutos,
  listarProdutosPublicos,
  listarCategoriasPublicas,
  obterProduto,
  obterProdutoPublico,
  gerarCodigosVariacoes,
  gerarCodigoCurtoVariacao,
  buscarProdutoPorCodigo,
  criarProduto,
  atualizarProduto,
  arquivarProduto,
  restaurarProduto,
  excluirProduto,
  excluirProdutoDefinitivamente,
  criarVariacao,
  atualizarVariacao,
  excluirVariacao,
  criarMidia: criarMidiaV2,
  atualizarMidia: atualizarMidiaV2,
  excluirMidia: excluirMidiaV2,
  uploadMidias,
  listarMedidas,
  criarMedida,
  atualizarMedida,
  excluirMedida,
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
};
