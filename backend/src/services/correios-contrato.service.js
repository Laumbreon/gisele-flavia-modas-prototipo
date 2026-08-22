const crypto = require("crypto");
const { getCorreiosConfig, getCorreiosToken, clearCorreiosTokenCache, getCorreiosLocalStatus, maskCorreiosValue } = require("./correios-token.service");

let drCache = null;
let drRequest = null;
const DR_CACHE_TTL_MS = 30 * 60 * 1000;

function correiosError(message, code, statusCode = 502) { return Object.assign(new Error(message), { code, statusCode }); }
function onlyDigits(value) { return String(value || "").replace(/\D/g, ""); }
function segment(value) { return encodeURIComponent(String(value || "").trim()); }
function normalizeText(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(); }
const TECHNICAL_SERVICE_CODES = new Set(["38202", "38210", "86738"]);

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["itens", "items", "content", "contratos", "cartoes", "servicos"]) if (Array.isArray(payload?.[key])) return payload[key];
  return payload && typeof payload === "object" && Object.keys(payload).length ? [payload] : [];
}

function withPagination(path, page, size) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}page=${page}&size=${size}`;
}

function paginationInfo(payload, requestedPage, currentRows) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return { paginated: false, hasNext: false };
  const totalPages = Number(payload.totalPages ?? payload.total_pages ?? payload.page?.totalPages ?? payload.page?.total_pages);
  const currentPage = Number(payload.number ?? payload.pageNumber ?? payload.page_number ?? payload.page?.number ?? requestedPage);
  if (Number.isInteger(totalPages) && totalPages >= 0) return { paginated: true, hasNext: currentPage + 1 < totalPages };
  if (typeof payload.last === "boolean") return { paginated: true, hasNext: !payload.last };
  const totalElements = Number(payload.totalElements ?? payload.total_elements ?? payload.page?.totalElements ?? payload.page?.total_elements);
  const pageSize = Number(payload.size ?? payload.pageSize ?? payload.page_size ?? payload.page?.size);
  if (Number.isFinite(totalElements) && Number.isFinite(pageSize) && pageSize > 0) return { paginated: true, hasNext: (currentPage + 1) * pageSize < totalElements };
  return { paginated: false, hasNext: currentRows.length > 0 };
}

async function correiosGet(path, retryUnauthorized = true) {
  const config = getCorreiosConfig();
  const token = await getCorreiosToken();
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && retryUnauthorized) { clearCorreiosTokenCache(); return correiosGet(path, false); }
      if ([401, 403].includes(response.status)) throw correiosError("Token sem permissão para consultar Meu Contrato.", "CORREIOS_CONTRATO_NAO_AUTORIZADO", 502);
      if (response.status === 404) throw correiosError("Contrato ou recurso dos Correios não encontrado.", "CORREIOS_CONTRATO_NAO_ENCONTRADO", 404);
      if (response.status === 429) throw correiosError("Limite temporário de consultas aos Correios atingido.", "CORREIOS_CONTRATO_LIMITE", 503);
      if (response.status >= 500) throw correiosError("API Meu Contrato dos Correios está indisponível.", "CORREIOS_CONTRATO_INDISPONIVEL", 503);
      throw correiosError(`Não foi possível consultar Meu Contrato (HTTP ${response.status}).`, "CORREIOS_CONTRATO_ERRO", 502);
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw correiosError("Tempo limite ao consultar Meu Contrato.", "CORREIOS_CONTRATO_TIMEOUT", 503);
    if (error?.code?.startsWith("CORREIOS_")) throw error;
    throw correiosError("Não foi possível conectar à API Meu Contrato.", "CORREIOS_CONTRATO_CONEXAO", 503);
  } finally { clearTimeout(timer); }
}

async function correiosGetAllPages(path, { size = 100, maxPages = 100 } = {}) {
  const allRows = [];
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await correiosGet(withPagination(path, page, size));
    const currentRows = rows(payload);
    allRows.push(...currentRows);
    const pagination = paginationInfo(payload, page, currentRows);
    if (!pagination.paginated || !pagination.hasNext || currentRows.length === 0) return allRows;
  }
  throw correiosError("A consulta aos Correios excedeu o limite seguro de páginas.", "CORREIOS_CONTRATO_PAGINACAO", 502);
}

function requireCnpj(config) {
  if (config.cnpj.length !== 14) throw correiosError("CNPJ dos Correios não configurado corretamente.", "CORREIOS_CNPJ_AUSENTE", 503);
}

async function listarContratos() {
  const config = getCorreiosConfig(); requireCnpj(config);
  return correiosGetAllPages(`/meucontrato/v1/empresas/${segment(config.cnpj)}/contratos?status=ATIVO&vigente=S`);
}

async function consultarContrato(numeroContrato = getCorreiosConfig().contrato) {
  const config = getCorreiosConfig(); requireCnpj(config);
  if (!String(numeroContrato || "").trim()) throw correiosError("Contrato dos Correios não configurado.", "CORREIOS_CONTRATO_AUSENTE", 503);
  return correiosGet(`/meucontrato/v1/empresas/${segment(config.cnpj)}/contratos/${segment(numeroContrato)}`);
}

async function listarCartoes(numeroContrato = getCorreiosConfig().contrato) {
  const config = getCorreiosConfig(); requireCnpj(config);
  if (!String(numeroContrato || "").trim()) throw correiosError("Contrato dos Correios não configurado.", "CORREIOS_CONTRATO_AUSENTE", 503);
  return correiosGetAllPages(`/meucontrato/v1/empresas/${segment(config.cnpj)}/contratos/${segment(numeroContrato)}/cartoes?status=ATIVO&vigente=S`);
}

async function listarServicosContrato(numeroContrato = getCorreiosConfig().contrato) {
  const config = getCorreiosConfig(); requireCnpj(config);
  if (!String(numeroContrato || "").trim()) throw correiosError("Contrato dos Correios não configurado.", "CORREIOS_CONTRATO_AUSENTE", 503);
  return correiosGetAllPages(`/meucontrato/v1/empresas/${segment(config.cnpj)}/contratos/${segment(numeroContrato)}/servicos`);
}

async function listarServicosCartao(numeroContrato = getCorreiosConfig().contrato, numeroCartao = getCorreiosConfig().cartaoPostagem) {
  const config = getCorreiosConfig(); requireCnpj(config);
  if (!String(numeroContrato || "").trim() || !String(numeroCartao || "").trim()) throw correiosError("Contrato ou cartão de postagem não configurado.", "CORREIOS_CARTAO_AUSENTE", 503);
  return correiosGetAllPages(`/meucontrato/v1/empresas/${segment(config.cnpj)}/contratos/${segment(numeroContrato)}/cartoes/${segment(numeroCartao)}/servicos`);
}

function contratoNumero(item) { return String(item?.nuContrato || item?.numero || item?.contrato || "").trim(); }
function cartaoNumero(item) { return String(item?.nuCartaoPostagem || item?.numero || item?.cartaoPostagem || "").trim(); }
function isAtivo(item) { const status = normalizeText(item?.status || item?.situacao); return status === "ATIVO" || status === "ATIVA"; }
function drValue(item) {
  const value = String(item?.nuSe ?? item?.nuSE ?? item?.dr ?? item?.numeroDR ?? "").replace(/\D/g, "");
  return value && value.length <= 6 ? value : null;
}
function drFingerprint(config) {
  return crypto.createHash("sha256").update([config.env, config.cnpj, config.contrato, config.cartaoPostagem].join("\0")).digest("hex");
}
function cacheDetectedDr(value, config = getCorreiosConfig()) {
  const dr = drValue({ nuSe: value });
  if (dr) drCache = { value: dr, fingerprint: drFingerprint(config), expiresAt: Date.now() + DR_CACHE_TTL_MS };
  return dr;
}
function getCorreiosDrStatus() {
  const config = getCorreiosConfig();
  const detected = !config.dr && drCache?.fingerprint === drFingerprint(config) && drCache.expiresAt > Date.now();
  return { dr_configurada: Boolean(config.dr), dr_detectada: Boolean(detected) };
}
function servicoResumo(item) {
  return { codigo: String(item?.coServico || item?.codigo || item?.coProduto || item?.codigoServico || "").trim(), descricao: String(item?.noServico || item?.descricao || item?.nome || item?.nomeServico || "").trim() };
}
function relevantService(item, configured) {
  const text = normalizeText(`${item.codigo} ${item.descricao}`);
  return ["PAC", "SEDEX", "API PRECO", "API PRECOS", "API PRAZO", "API PRAZOS", "BUSCA CEP", "API CEP", " CEP", ...configured.map(normalizeText)].some(term => text.includes(term));
}

function isDeliveryCandidate(item, type) {
  const code = String(item.codigo || "").trim();
  const text = normalizeText(item.descricao);
  const excludedWords = ["REVERSO", "LOG+", "GRANDES FORMATOS", "HOJE", "LOCKER", "PACKET", "INTERNACIONAL", "ARMAZENAGEM"];
  if (!code || !text || TECHNICAL_SERVICE_CODES.has(code) || excludedWords.some(word => text.includes(word))) return false;
  if (/\b(SEDEX\s*)?(10|12)\b/.test(text)) return false;
  return type === "pac" ? /\bPAC\b/.test(text) : /\bSEDEX\b/.test(text);
}

function configuredDeliveryService(code, type, warnings) {
  const value = String(code || "").trim();
  if (TECHNICAL_SERVICE_CODES.has(value)) {
    warnings.push(`${value} é um serviço técnico da API e não pode ser usado como modalidade ${type === "pac" ? "PAC" : "SEDEX"}.`);
    return null;
  }
  return value ? { codigo: value, descricao: type === "pac" ? "PAC (configurado)" : "SEDEX (configurado)" } : null;
}

function chooseDeliveryService(services, type, warnings) {
  const candidates = services.filter(item => isDeliveryCandidate(item, type));
  if (candidates.length === 1) return candidates[0];
  const label = type === "pac" ? "PAC" : "SEDEX";
  if (!candidates.length) warnings.push(`${label} não foi identificado com segurança. Configure CORREIOS_SERVICO_${label} no ambiente.`);
  else warnings.push(`Mais de um serviço ${label} plausível foi encontrado. Configure CORREIOS_SERVICO_${label} no ambiente.`);
  return null;
}

async function resolverServicosEntregaCorreios() {
  const config = getCorreiosConfig();
  const result = { pac: null, sedex: null, avisos: [] };
  result.pac = configuredDeliveryService(config.servicoPac, "pac", result.avisos);
  result.sedex = configuredDeliveryService(config.servicoSedex, "sedex", result.avisos);
  if (result.pac && result.sedex) return result;
  if (!config.contrato) {
    result.avisos.push("Contrato não configurado para detectar serviços de entrega automaticamente.");
    return result;
  }
  const queries = [listarServicosContrato(config.contrato)];
  if (config.cartaoPostagem) queries.push(listarServicosCartao(config.contrato, config.cartaoPostagem));
  const settled = await Promise.allSettled(queries);
  const services = settled.flatMap(item => item.status === "fulfilled" ? item.value : []);
  settled.filter(item => item.status === "rejected").forEach(item => result.avisos.push(item.reason.message));
  const unique = new Map();
  services.map(servicoResumo).filter(item => item.codigo || item.descricao).forEach(item => {
    const key = item.codigo || item.descricao;
    if (!unique.has(key)) unique.set(key, item);
  });
  const normalized = [...unique.values()];
  if (!result.pac) result.pac = chooseDeliveryService(normalized, "pac", result.avisos);
  if (!result.sedex) result.sedex = chooseDeliveryService(normalized, "sedex", result.avisos);
  return result;
}

async function detectDrCorreios(config) {
  let contract = null;
  if (config.contrato) {
    try { contract = await consultarContrato(config.contrato); }
    catch { /* A tentativa pelo cartão ainda pode localizar a DR. */ }
  } else {
    try { contract = (await listarContratos()).find(isAtivo) || null; }
    catch { /* O erro final permanece controlado abaixo. */ }
  }
  const contractDr = drValue(contract);
  if (contractDr) return cacheDetectedDr(contractDr, config);
  const contractNumber = contratoNumero(contract) || config.contrato;
  if (contractNumber) {
    try {
      const cards = await listarCartoes(contractNumber);
      const configuredCard = onlyDigits(config.cartaoPostagem);
      const card = configuredCard
        ? cards.find(item => onlyDigits(cartaoNumero(item)) === configuredCard) || null
        : cards.find(isAtivo) || null;
      const cardDr = drValue(card);
      if (cardDr) return cacheDetectedDr(cardDr, config);
    } catch { /* O erro final permanece controlado abaixo. */ }
  }
  throw correiosError("Não foi possível detectar a DR/SE do contrato. Informe CORREIOS_DR no .env ou verifique o campo nuSe na API Meu Contrato.", "CORREIOS_DR_NAO_DETECTADA", 503);
}

async function resolverDrCorreios() {
  const config = getCorreiosConfig();
  if (config.dr) return config.dr;
  const fingerprint = drFingerprint(config);
  if (drCache?.fingerprint === fingerprint && drCache.expiresAt > Date.now()) return drCache.value;
  if (!drRequest) drRequest = detectDrCorreios(config).finally(() => { drRequest = null; });
  return drRequest;
}

async function diagnosticarContratoCorreios() {
  const config = getCorreiosConfig(), local = getCorreiosLocalStatus();
  const result = {
    ...local,
    identificadores: { cnpj: maskCorreiosValue(config.cnpj), contrato: maskCorreiosValue(config.contrato), cartao_postagem: maskCorreiosValue(config.cartaoPostagem) },
    conectividade: { token: "nao_testado", meu_contrato: "nao_testado", contrato_ativo: false, cartao_ativo: false, servicos_encontrados: false },
    servicos_detectados: [], avisos: [],
    ...getCorreiosDrStatus(),
  };
  try { await getCorreiosToken(); result.conectividade.token = "ok"; }
  catch (error) { result.conectividade.token = "erro"; result.avisos.push(error.message); return result; }
  try {
    const contratos = await listarContratos();
    const contratoConfigurado = onlyDigits(config.contrato);
    const contrato = contratoConfigurado
      ? contratos.find(item => onlyDigits(contratoNumero(item)) === contratoConfigurado) || null
      : contratos.find(isAtivo) || null;
    const numeroContrato = contratoNumero(contrato) || config.contrato;
    result.conectividade.meu_contrato = "ok";
    result.conectividade.contrato_ativo = Boolean(contrato && isAtivo(contrato));
    if (!config.dr && drValue(contrato)) cacheDetectedDr(drValue(contrato), config);
    if (!contrato) result.avisos.push(contratoConfigurado ? "O contrato configurado não foi localizado entre os contratos ativos do CNPJ." : "Nenhum contrato ativo foi localizado para o CNPJ configurado.");
    const [cartoesResult, servicosContratoResult] = await Promise.allSettled([listarCartoes(numeroContrato), listarServicosContrato(numeroContrato)]);
    const cartoes = cartoesResult.status === "fulfilled" ? cartoesResult.value : [];
    const cartaoConfigurado = onlyDigits(config.cartaoPostagem);
    const cartao = cartaoConfigurado
      ? cartoes.find(item => onlyDigits(cartaoNumero(item)) === cartaoConfigurado) || null
      : cartoes.find(isAtivo) || null;
    result.conectividade.cartao_ativo = Boolean(cartao && isAtivo(cartao));
    if (!config.dr && !getCorreiosDrStatus().dr_detectada && drValue(cartao)) cacheDetectedDr(drValue(cartao), config);
    if (cartoesResult.status === "rejected") result.avisos.push(cartoesResult.reason.message);
    else if (!cartao) result.avisos.push(cartaoConfigurado ? "O cartão de postagem configurado não foi localizado entre os cartões ativos do contrato." : "Nenhum cartão de postagem ativo foi localizado para o contrato.");
    let servicos = servicosContratoResult.status === "fulfilled" ? servicosContratoResult.value : [];
    if (servicosContratoResult.status === "rejected") result.avisos.push(servicosContratoResult.reason.message);
    const numeroCartao = cartaoNumero(cartao) || config.cartaoPostagem;
    if (numeroContrato && numeroCartao) {
      try { servicos = servicos.concat(await listarServicosCartao(numeroContrato, numeroCartao)); }
      catch (error) { result.avisos.push(error.message); }
    }
    const unique = new Map();
    servicos.map(servicoResumo).filter(item => item.codigo || item.descricao).filter(item => relevantService(item, config.servicos)).forEach(item => unique.set(`${item.codigo}|${item.descricao}`, item));
    result.servicos_detectados = [...unique.values()];
    result.conectividade.servicos_encontrados = result.servicos_detectados.length > 0;
    if (!result.conectividade.servicos_encontrados) result.avisos.push("PAC, SEDEX ou APIs necessárias não foram identificados nos serviços consultados.");
    Object.assign(result, getCorreiosDrStatus());
    return result;
  } catch (error) {
    result.conectividade.meu_contrato = "erro"; result.avisos.push(error.message); return result;
  }
}

module.exports = { listarContratos, consultarContrato, listarCartoes, listarServicosContrato, listarServicosCartao, resolverServicosEntregaCorreios, resolverDrCorreios, getCorreiosDrStatus, diagnosticarContratoCorreios };
