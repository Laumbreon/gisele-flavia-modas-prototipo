const { query } = require("../config/db");

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toMoneyNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function fretePayload(body) {
  const bairro = normalizeOptional(body.bairro);
  const cidade = normalizeOptional(body.cidade);
  const estado = (normalizeOptional(body.estado) || "SP").toUpperCase();
  const valor = toMoneyNumber(body.valor);

  return {
    bairro,
    cidade,
    estado,
    valor,
    prazo_estimado: normalizeOptional(body.prazo_estimado),
    ativo: body.ativo === undefined ? true : Boolean(body.ativo),
    observacoes: normalizeOptional(body.observacoes),
  };
}

function validateFretePayload(payload) {
  if (!payload.bairro) return "Bairro é obrigatório.";
  if (!payload.cidade) return "Cidade é obrigatória.";
  if (!/^[A-Z]{2}$/.test(payload.estado)) return "Estado deve ter 2 letras.";
  if (payload.valor === null) return "Valor deve ser um número maior ou igual a zero.";
  return null;
}

async function listarFretesBairro(req, res) {
  try {
    const result = await query(`
      SELECT id, bairro, cidade, estado, valor, prazo_estimado, ativo, observacoes, created_at, updated_at
      FROM fretes_bairro
      ORDER BY cidade ASC, bairro ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar fretes por bairro:", error);
    res.status(500).json({ message: "Não foi possível buscar os fretes por bairro." });
  }
}

async function criarFreteBairro(req, res) {
  const payload = fretePayload(req.body);
  const validation = validateFretePayload(payload);

  if (validation) {
    return res.status(400).json({ message: validation });
  }

  try {
    const result = await query(
      `
        INSERT INTO fretes_bairro (bairro, cidade, estado, valor, prazo_estimado, ativo, observacoes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, bairro, cidade, estado, valor, prazo_estimado, ativo, observacoes, created_at, updated_at;
      `,
      [
        payload.bairro,
        payload.cidade,
        payload.estado,
        payload.valor,
        payload.prazo_estimado,
        payload.ativo,
        payload.observacoes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar frete por bairro:", error);
    res.status(500).json({ message: "Não foi possível cadastrar o frete por bairro." });
  }
}

async function atualizarFreteBairro(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Frete inválido." });
  }

  const payload = fretePayload(req.body);
  const validation = validateFretePayload(payload);

  if (validation) {
    return res.status(400).json({ message: validation });
  }

  try {
    const result = await query(
      `
        UPDATE fretes_bairro
        SET bairro = $1,
            cidade = $2,
            estado = $3,
            valor = $4,
            prazo_estimado = $5,
            ativo = $6,
            observacoes = $7,
            updated_at = NOW()
        WHERE id = $8
        RETURNING id, bairro, cidade, estado, valor, prazo_estimado, ativo, observacoes, created_at, updated_at;
      `,
      [
        payload.bairro,
        payload.cidade,
        payload.estado,
        payload.valor,
        payload.prazo_estimado,
        payload.ativo,
        payload.observacoes,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Frete por bairro não encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar frete por bairro:", error);
    res.status(500).json({ message: "Não foi possível atualizar o frete por bairro." });
  }
}

async function desativarFreteBairro(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Frete inválido." });
  }

  try {
    const result = await query(
      `
        UPDATE fretes_bairro
        SET ativo = FALSE,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, bairro, cidade, estado, valor, prazo_estimado, ativo, observacoes, created_at, updated_at;
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Frete por bairro não encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao desativar frete por bairro:", error);
    res.status(500).json({ message: "Não foi possível desativar o frete por bairro." });
  }
}

async function calcularFreteBairro(req, res) {
  const bairro = normalizeOptional(req.query.bairro);
  const cidade = normalizeOptional(req.query.cidade);
  const estado = (normalizeOptional(req.query.estado) || "SP").toUpperCase();
  const subtotal = req.query.subtotal === undefined ? null : toMoneyNumber(req.query.subtotal);

  if (!bairro || !cidade) {
    return res.status(400).json({ message: "Informe bairro e cidade para calcular o frete." });
  }

  try {
    const [result, configuracoes] = await Promise.all([query(
      `
        SELECT id, bairro, cidade, estado, valor, prazo_estimado
        FROM fretes_bairro
        WHERE ativo = TRUE
          AND LOWER(cidade) = LOWER($1)
          AND LOWER(estado) = LOWER($2);
      `,
      [cidade, estado]
    ), query("SELECT chave,valor FROM configuracoes_loja WHERE chave = ANY($1::varchar[])", [["frete_gratis_minimo", "frete_promocional_minimo", "frete_promocional_valor"]])]);

    const bairroBusca = normalizeSearch(bairro);
    const frete = result.rows.find(row => normalizeSearch(row.bairro) === bairroBusca);

    if (!frete) {
      return res.status(404).json({ message: "Bairro não atendido para entrega local." });
    }

    const valorOriginal = Number(frete.valor);
    const regras = Object.fromEntries(configuracoes.rows.map(row => [row.chave, Number(row.valor)]));
    const freteGratisMinimo = regras.frete_gratis_minimo ?? 0;
    const fretePromocionalMinimo = regras.frete_promocional_minimo ?? 300;
    const fretePromocionalValor = regras.frete_promocional_valor ?? 19.99;
    const fretePromocional = subtotal !== null && fretePromocionalMinimo > 0 && subtotal >= fretePromocionalMinimo;
    const freteGratis = subtotal !== null && freteGratisMinimo > 0 && subtotal >= freteGratisMinimo;
    const valorPromocional = fretePromocional ? Math.min(valorOriginal, fretePromocionalValor) : valorOriginal;

    res.json({
      bairro: frete.bairro,
      cidade: frete.cidade,
      estado: frete.estado,
      valor: freteGratis ? 0 : valorPromocional,
      valor_original: valorOriginal,
      frete_gratis: freteGratis,
      frete_gratis_minimo: freteGratisMinimo,
      frete_promocional: fretePromocional && !freteGratis,
      frete_promocional_minimo: fretePromocionalMinimo,
      frete_promocional_valor: fretePromocionalValor,
      prazo_estimado: frete.prazo_estimado,
    });
  } catch (error) {
    console.error("Erro ao calcular frete por bairro:", error);
    res.status(500).json({ message: "Não foi possível calcular o frete por bairro." });
  }
}

module.exports = {
  listarFretesBairro,
  criarFreteBairro,
  atualizarFreteBairro,
  desativarFreteBairro,
  calcularFreteBairro,
};
