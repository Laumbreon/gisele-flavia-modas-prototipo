const { query } = require("../config/db");

const CAMPOS = `id, nome, tipo, ativo, observacoes, codigo_externo, provedor_pagamento,
  mercado_pago_pos_id, mercado_pago_store_id, mercado_pago_integrada, pdv_codigo,
  terminal_tipo, ordem_exibicao, created_at, updated_at`;

async function listarMaquininhas(req, res) {
  try {
    const result = await query(`SELECT ${CAMPOS} FROM maquininhas ORDER BY ordem_exibicao, nome`);
    res.json(result.rows);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível buscar as maquininhas." }); }
}

async function buscarMaquininha(req, res) {
  try {
    const result = await query(`SELECT ${CAMPOS} FROM maquininhas WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Maquininha não encontrada." });
    res.json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível buscar a maquininha." }); }
}

function dados(body) {
  return [String(body.nome || "").trim(), body.tipo || "loja", body.ativo !== false,
    body.observacoes || null, body.codigo_externo || null, body.provedor_pagamento || "manual",
    body.mercado_pago_pos_id || null, body.mercado_pago_store_id || null,
    Boolean(body.mercado_pago_integrada), body.pdv_codigo || null, body.terminal_tipo || null,
    Number(body.ordem_exibicao || 0)];
}

async function criarMaquininha(req, res) {
  const valores = dados(req.body);
  if (!valores[0]) return res.status(400).json({ message: "Nome é obrigatório." });
  try {
    const result = await query(`INSERT INTO maquininhas
      (nome,tipo,ativo,observacoes,codigo_externo,provedor_pagamento,mercado_pago_pos_id,
       mercado_pago_store_id,mercado_pago_integrada,pdv_codigo,terminal_tipo,ordem_exibicao)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${CAMPOS}`, valores);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível cadastrar a maquininha." }); }
}

async function atualizarMaquininha(req, res) {
  const valores = dados(req.body);
  if (!valores[0]) return res.status(400).json({ message: "Nome é obrigatório." });
  try {
    const result = await query(`UPDATE maquininhas SET nome=$1,tipo=$2,ativo=$3,observacoes=$4,
      codigo_externo=$5,provedor_pagamento=$6,mercado_pago_pos_id=$7,mercado_pago_store_id=$8,
      mercado_pago_integrada=$9,pdv_codigo=$10,terminal_tipo=$11,ordem_exibicao=$12,updated_at=NOW()
      WHERE id=$13 RETURNING ${CAMPOS}`, [...valores, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Maquininha não encontrada." });
    res.json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível atualizar a maquininha." }); }
}

async function desativarMaquininha(req, res) {
  try {
    const result = await query(`UPDATE maquininhas SET ativo=FALSE,updated_at=NOW() WHERE id=$1 RETURNING ${CAMPOS}`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Maquininha não encontrada." });
    res.json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível desativar a maquininha." }); }
}

module.exports = { listarMaquininhas, buscarMaquininha, criarMaquininha, atualizarMaquininha, desativarMaquininha };
