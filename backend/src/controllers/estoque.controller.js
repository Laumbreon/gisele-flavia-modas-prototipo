const { query } = require("../config/db");

async function listarEstoque(req, res) {
  const filtro=String(req.query.produtos||"ativos").toLowerCase();
  if(!["ativos","arquivados","todos"].includes(filtro))return res.status(400).json({message:"Filtro de produtos inválido."});
  try {
    const result = await query(`
      SELECT
        p.id AS produto_id,
        p.nome AS produto_nome,
        p.categoria,
        p.status AS produto_status,
        pv.id AS variacao_id,
        pv.cor,
        pv.tamanho,
        pv.sku,
        pv.codigo_barras,
        pv.codigo_interno,
        pv.preco_venda,
        pv.preco_promocional,
        pv.ativo AS variacao_ativa,
        COALESCE(e.quantidade,0)::int AS quantidade,
        COALESCE(e.quantidade_minima,0)::int AS estoque_minimo,
        CASE
          WHEN pv.id IS NULL THEN 'sem_variacao'
          WHEN e.quantidade <= 0 THEN 'zerado'
          WHEN e.quantidade <= e.quantidade_minima THEN 'baixo'
          ELSE 'normal'
        END AS status
      FROM produtos p
      LEFT JOIN produto_variacoes pv ON pv.produto_id = p.id
      LEFT JOIN estoque e ON e.produto_variacao_id = pv.id
      WHERE ($1='todos' OR $1='ativos' AND p.status='ativo' OR $1='arquivados' AND p.status<>'ativo')
      ORDER BY p.nome ASC, pv.cor ASC, pv.tamanho ASC;
    `,[filtro]);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    res.status(500).json({
      message: "Não foi possível buscar o estoque no momento.",
    });
  }
}

async function movimentarEstoque(req, res) {
  const variacaoId = Number(req.params.variacao_id);
  const tipo = String(req.body?.tipo || "").toLowerCase();
  const quantidade = Number(req.body?.quantidade);
  const motivo = String(req.body?.motivo || "").trim().slice(0, 160);
  const observacoes = String(req.body?.observacoes || "").trim().slice(0, 2000) || null;
  if (!Number.isInteger(variacaoId) || variacaoId <= 0 || !["entrada", "saida", "ajuste"].includes(tipo)) return res.status(400).json({ message: "Variação ou tipo de movimentação inválido." });
  if (!Number.isInteger(quantidade) || quantidade < 0 || tipo !== "ajuste" && quantidade === 0) return res.status(400).json({ message: "Informe uma quantidade inteira válida." });
  if (!motivo) return res.status(400).json({ message: "Informe o motivo da movimentação." });
  const { pool } = require("../config/db"); const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = (await client.query(`SELECT e.*,pv.produto_id FROM estoque e JOIN produto_variacoes pv ON pv.id=e.produto_variacao_id WHERE e.produto_variacao_id=$1 FOR UPDATE`, [variacaoId])).rows[0];
    if (!row) throw Object.assign(new Error("Estoque da variação não encontrado."), { statusCode: 404 });
    const atual = Number(row.quantidade), final = tipo === "entrada" ? atual + quantidade : tipo === "saida" ? atual - quantidade : quantidade;
    if (final < 0) throw Object.assign(new Error("A saída não pode deixar o estoque negativo."), { statusCode: 409 });
    if (final === atual) throw Object.assign(new Error("O ajuste informado não altera o saldo atual."), { statusCode: 400 });
    await client.query("UPDATE estoque SET quantidade=$2,updated_at=NOW() WHERE produto_variacao_id=$1", [variacaoId, final]);
    const quantidadeRegistro = tipo === "ajuste" ? Math.abs(final - atual) : quantidade;
    await client.query(`INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [row.produto_id, variacaoId, tipo, quantidadeRegistro, motivo, req.usuario?.nome || "Gestão", observacoes]);
    await client.query("COMMIT"); res.json({ ok: true, variacao_id: variacaoId, quantidade_anterior: atual, quantidade: final, message: "Estoque atualizado." });
  } catch (error) { await client.query("ROLLBACK"); res.status(error.statusCode || 500).json({ message: error.message || "Não foi possível movimentar o estoque." }); }
  finally { client.release(); }
}

module.exports = {
  listarEstoque,
  movimentarEstoque,
};
