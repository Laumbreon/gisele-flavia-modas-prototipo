const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const { pool, query } = require("../config/db");
const { getCorreiosLocalStatus, getCorreiosConfig } = require("../services/correios-token.service");
const { diagnosticarContratoCorreios, resolverServicosEntregaCorreios } = require("../services/correios-contrato.service");
const { consultarCepCorreios, sanitizarCep } = require("../services/correios-cep.service");
const { cotarFreteCorreios } = require("../services/correios-cotacao.service");

async function validarPin(req, res) {
  const pin = String(req.body.pin || "");
  if (!pin) return res.status(403).json({ message: "PIN administrativo obrigatório." });
  try {
    const result = await query("SELECT pin_hash FROM admin_pins WHERE chave = 'principal' AND ativo = TRUE LIMIT 1");
    const valido = result.rows[0]?.pin_hash && await bcrypt.compare(pin, result.rows[0].pin_hash);
    if (!valido) return res.status(403).json({ message: "PIN administrativo inválido." });
    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao validar PIN administrativo:", error);
    res.status(500).json({ message: "Não foi possível validar o PIN administrativo." });
  }
}

async function statusCorreios(req, res) {
  if (String(req.query.check || "") !== "1") return res.json(getCorreiosLocalStatus());
  try {
    return res.json(await diagnosticarContratoCorreios());
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Não foi possível verificar a integração com os Correios." });
  }
}

function numeroPositivo(value, label, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || integer && !Number.isInteger(number)) {
    const error = new Error(`${label} deve ser ${integer ? "um número inteiro " : ""}maior que zero.`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

async function testarCotacaoCorreios(req, res) {
  try {
    const config = getCorreiosConfig();
    const cepDestino = sanitizarCep(req.body?.cep_destino);
    const input = {
      cepOrigem: config.cepOrigem,
      cepDestino,
      pesoGramas: numeroPositivo(req.body?.peso_gramas, "Peso", true),
      comprimentoCm: numeroPositivo(req.body?.comprimento_cm, "Comprimento"),
      larguraCm: numeroPositivo(req.body?.largura_cm, "Largura"),
      alturaCm: numeroPositivo(req.body?.altura_cm, "Altura"),
    };
    sanitizarCep(input.cepOrigem);
    const [cep, resolved] = await Promise.all([consultarCepCorreios(cepDestino), resolverServicosEntregaCorreios()]);
    const services = [["PAC", resolved.pac], ["SEDEX", resolved.sedex]].filter(([, service]) => service?.codigo);
    const warnings = [...resolved.avisos];
    if (!services.length) return res.status(422).json({ message: "Configure os códigos PAC/SEDEX para testar a cotação.", avisos: warnings });
    const results = await Promise.allSettled(services.map(async ([name, service]) => {
      const quote = await cotarFreteCorreios({ ...input, servicoCodigo: service.codigo });
      return { name, service, quote };
    }));
    const validQuotes = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") validQuotes.push(result.value);
      else warnings.push(`${services[index][0]} indisponível: ${result.reason.message}`);
    });
    if (!validQuotes.length) return res.status(422).json({ message: "Nenhuma modalidade dos Correios está disponível para esta cotação.", avisos: warnings });
    const ttl = Math.min(config.cotacaoTtlMinutes, 24 * 60);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const client = await pool.connect();
    const options = [];
    try {
      await client.query("BEGIN");
      for (const { name, service, quote } of validQuotes) {
        const id = randomUUID();
        const sanitized = { servico: name, codigo: service.codigo, valor: quote.valor, prazo_dias_uteis: quote.prazo_dias_uteis, disponivel: true };
        await client.query(
          `INSERT INTO correios_cotacoes
            (id,cep_origem,cep_destino,servico_codigo,servico_nome,valor,prazo_dias_uteis,peso_gramas,comprimento_cm,largura_cm,altura_cm,resposta_sanitizada,expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
          [id, input.cepOrigem, cepDestino, service.codigo, service.descricao || name, quote.valor, quote.prazo_dias_uteis, input.pesoGramas, input.comprimentoCm, input.larguraCm, input.alturaCm, JSON.stringify(sanitized), expiresAt]
        );
        options.push({
          cotacao_id: id, servico: name, codigo: service.codigo,
          descricao: service.descricao || name, valor: quote.valor, valor_formatado: quote.valor_formatado,
          prazo_dias_uteis: quote.prazo_dias_uteis, expira_em: expiresAt,
        });
      }
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK").catch(() => {});
      const persistenceError = new Error("Cotação calculada, mas não foi possível salvá-la. Verifique se a migration dos Correios foi aplicada.");
      persistenceError.code = "CORREIOS_COTACAO_PERSISTENCIA";
      persistenceError.statusCode = 500;
      throw persistenceError;
    } finally {
      client.release();
    }
    return res.json({ cep, opcoes: options, avisos: warnings });
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    return res.status(status).json({ message: status < 500 ? error.message : (error.code?.startsWith("CORREIOS_") ? error.message : "Não foi possível testar a cotação dos Correios.") });
  }
}

module.exports = { validarPin, statusCorreios, testarCotacaoCorreios };
