const { query } = require("../config/db");

const CAMPOS = `id, nome, tipo, ativo, observacoes, codigo_externo, provedor_pagamento,
  mercado_pago_pos_id, mercado_pago_store_id, mercado_pago_integrada, pdv_codigo,
  terminal_tipo, ordem_exibicao, mercado_pago_terminal_id, mercado_pago_serial,
  mercado_pago_modo, mercado_pago_ambiente, mercado_pago_operacional, mercado_pago_ativo,
  created_at, updated_at`;

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

function texto(value) { const result=String(value ?? "").trim(); return result || null; }
function booleano(value) { return value === true || value === "true" || value === 1 || value === "1"; }

function dados(body = {}) {
  const modoPoint = body.mercado_pago_modo === "point";
  return {
    valores:[
      texto(body.nome), body.tipo || "loja", body.ativo === undefined ? true : booleano(body.ativo),
      texto(body.observacoes), texto(body.codigo_externo), modoPoint ? "mercado_pago" : (body.provedor_pagamento || "manual"),
      texto(body.mercado_pago_pos_id), texto(body.mercado_pago_store_id), modoPoint,
      texto(body.pdv_codigo), texto(body.terminal_tipo), Number(body.ordem_exibicao || 0),
      texto(body.mercado_pago_terminal_id), texto(body.mercado_pago_serial), modoPoint ? "point" : "manual",
      body.mercado_pago_ambiente === "sandbox" ? "sandbox" : "production",
      modoPoint && booleano(body.mercado_pago_operacional), modoPoint,
    ],
    modoPoint,
  };
}

function validarDados(normalizados) {
  const valores=normalizados.valores;
  if (!valores[0]) return "Nome é obrigatório.";
  if (normalizados.modoPoint && !valores[12]) return "Informe o Terminal ID para ativar o Mercado Pago Point integrado.";
  if (normalizados.modoPoint && !valores[12].includes("__")) return "Terminal ID inválido. Informe o identificador completo fornecido pelo Mercado Pago, no formato TIPO__SERIAL.";
  return null;
}

async function criarMaquininha(req, res) {
  const normalizados = dados(req.body), valores=normalizados.valores;
  const erro=validarDados(normalizados); if(erro)return res.status(400).json({message:erro});
  try {
    const result = await query(`INSERT INTO maquininhas
      (nome,tipo,ativo,observacoes,codigo_externo,provedor_pagamento,mercado_pago_pos_id,
       mercado_pago_store_id,mercado_pago_integrada,pdv_codigo,terminal_tipo,ordem_exibicao,
       mercado_pago_terminal_id,mercado_pago_serial,mercado_pago_modo,mercado_pago_ambiente,
       mercado_pago_operacional,mercado_pago_ativo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING ${CAMPOS}`, valores);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: "Não foi possível cadastrar a maquininha." }); }
}

async function atualizarMaquininha(req, res) {
  const normalizados = dados(req.body), valores=normalizados.valores;
  const erro=validarDados(normalizados); if(erro)return res.status(400).json({message:erro});
  try {
    const result = await query(`UPDATE maquininhas SET nome=$1,tipo=$2,ativo=$3,observacoes=$4,
      codigo_externo=$5,provedor_pagamento=$6,mercado_pago_pos_id=$7,mercado_pago_store_id=$8,
      mercado_pago_integrada=$9,pdv_codigo=$10,terminal_tipo=$11,ordem_exibicao=$12,
      mercado_pago_terminal_id=$13,mercado_pago_serial=$14,mercado_pago_modo=$15,
      mercado_pago_ambiente=$16,mercado_pago_operacional=$17,mercado_pago_ativo=$18,updated_at=NOW()
      WHERE id=$19 RETURNING ${CAMPOS}`, [...valores, req.params.id]);
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
