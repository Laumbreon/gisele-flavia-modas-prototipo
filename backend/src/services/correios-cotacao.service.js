const { getCorreiosConfig, getCorreiosToken, clearCorreiosTokenCache } = require("./correios-token.service");
const { sanitizarCep } = require("./correios-cep.service");

function correiosError(message, code, statusCode = 502) {
  return Object.assign(new Error(message), { code, statusCode });
}

function numeroPositivo(value, label, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || integer && !Number.isInteger(number)) throw correiosError(`${label} deve ser ${integer ? "um número inteiro " : ""}maior que zero.`, "CORREIOS_COTACAO_DADOS_INVALIDOS", 400);
  return number;
}

function codigoServico(value) {
  const code = String(value || "").trim();
  if (!code || code.length > 20 || !/^[A-Za-z0-9._-]+$/.test(code)) throw correiosError("Código de serviço dos Correios inválido.", "CORREIOS_SERVICO_INVALIDO", 400);
  return code;
}

function valorDecimal(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function textoErroPayload(payload) {
  return String(payload?.txErro || payload?.mensagem || payload?.message || payload?.erro || "").trim();
}

async function correiosGet(path, kind, retryUnauthorized = true) {
  const config = getCorreiosConfig();
  const token = await getCorreiosToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && retryUnauthorized) {
        clearCorreiosTokenCache();
        return correiosGet(path, kind, false);
      }
      if ([400, 404, 422].includes(response.status)) throw correiosError("Serviço dos Correios indisponível para os dados informados.", `CORREIOS_${kind}_INDISPONIVEL`, 422);
      if ([401, 403].includes(response.status)) throw correiosError(`Credencial sem permissão para consultar ${kind === "PRECO" ? "preços" : "prazos"} nos Correios.`, `CORREIOS_${kind}_NAO_AUTORIZADO`, 502);
      if (response.status === 429) throw correiosError(`Limite temporário de consultas de ${kind === "PRECO" ? "preço" : "prazo"} atingido.`, `CORREIOS_${kind}_LIMITE`, 503);
      if (response.status >= 500) throw correiosError(`API de ${kind === "PRECO" ? "preços" : "prazos"} dos Correios temporariamente indisponível.`, `CORREIOS_${kind}_API_INDISPONIVEL`, 503);
      throw correiosError(`Não foi possível consultar ${kind === "PRECO" ? "o preço" : "o prazo"} nos Correios (HTTP ${response.status}).`, `CORREIOS_${kind}_ERRO`, 502);
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw correiosError(`Tempo limite ao consultar ${kind === "PRECO" ? "o preço" : "o prazo"} nos Correios.`, `CORREIOS_${kind}_TIMEOUT`, 503);
    if (error?.code?.startsWith("CORREIOS_")) throw error;
    throw correiosError(`Não foi possível conectar à API de ${kind === "PRECO" ? "preços" : "prazos"} dos Correios.`, `CORREIOS_${kind}_CONEXAO`, 503);
  } finally {
    clearTimeout(timer);
  }
}

function parametrosBase({ cepOrigem, cepDestino, servicoCodigo }) {
  const config = getCorreiosConfig();
  return {
    config,
    origem: sanitizarCep(cepOrigem || config.cepOrigem),
    destino: sanitizarCep(cepDestino),
    servico: codigoServico(servicoCodigo),
  };
}

async function calcularPrecoCorreios(input) {
  const { config, origem, destino, servico } = parametrosBase(input);
  const peso = numeroPositivo(input.pesoGramas, "Peso", true);
  const comprimento = numeroPositivo(input.comprimentoCm, "Comprimento");
  const largura = numeroPositivo(input.larguraCm, "Largura");
  const altura = numeroPositivo(input.alturaCm, "Altura");
  const params = new URLSearchParams({
    cepOrigem: origem, cepDestino: destino, psObjeto: String(peso), tpObjeto: "2",
    comprimento: String(comprimento), largura: String(largura), altura: String(altura),
  });
  if (config.contrato && !config.dr) throw correiosError("A DR dos Correios deve ser configurada para calcular o preço do contrato.", "CORREIOS_DR_AUSENTE", 503);
  if (config.contrato) {
    params.set("nuContrato", config.contrato);
    params.set("nuDR", config.dr);
  }
  const payload = await correiosGet(`/preco/v1/nacional/${encodeURIComponent(servico)}?${params}`, "PRECO");
  if (textoErroPayload(payload)) throw correiosError("Serviço de entrega indisponível para o trecho ou pacote informado.", "CORREIOS_PRECO_INDISPONIVEL", 422);
  const value = valorDecimal(payload.pcFinal ?? payload.precoFinal ?? payload.valor ?? payload.valorFinal);
  if (value === null || value < 0) throw correiosError("Os Correios retornaram um preço inválido.", "CORREIOS_PRECO_RESPOSTA_INVALIDA", 502);
  return { servico_codigo: String(payload.coProduto || servico), valor: value, valor_formatado: value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), disponivel: true };
}

async function calcularPrazoCorreios(input) {
  const { origem, destino, servico } = parametrosBase(input);
  const params = new URLSearchParams({ cepOrigem: origem, cepDestino: destino });
  const payload = await correiosGet(`/prazo/v1/nacional/${encodeURIComponent(servico)}?${params}`, "PRAZO");
  if (textoErroPayload(payload)) throw correiosError("Serviço de entrega indisponível para o trecho informado.", "CORREIOS_PRAZO_INDISPONIVEL", 422);
  const days = Number(payload.prazoEntrega ?? payload.prazo ?? payload.prazoDiasUteis);
  if (!Number.isInteger(days) || days < 0) throw correiosError("Os Correios retornaram um prazo inválido.", "CORREIOS_PRAZO_RESPOSTA_INVALIDA", 502);
  return { servico_codigo: String(payload.coProduto || servico), prazo_dias_uteis: days, disponivel: true };
}

async function cotarFreteCorreios(input) {
  const [preco, prazo] = await Promise.all([calcularPrecoCorreios(input), calcularPrazoCorreios(input)]);
  return { ...preco, ...prazo };
}

module.exports = { calcularPrecoCorreios, calcularPrazoCorreios, cotarFreteCorreios };
