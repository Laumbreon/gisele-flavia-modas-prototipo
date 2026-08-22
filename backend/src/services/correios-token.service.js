const crypto = require("crypto");

let tokenCache = null;
let tokenRequest = null;

function textoEnv(nome) { return String(process.env[nome] || "").trim(); }
function inteiroEnv(nome, padrao) { const valor = Number(textoEnv(nome)); return Number.isInteger(valor) && valor > 0 ? valor : padrao; }
function correiosError(message, code, statusCode = 502) { return Object.assign(new Error(message), { code, statusCode }); }

function getCorreiosConfig() {
  const ambienteInformado = textoEnv("CORREIOS_ENV").toLowerCase();
  const env = ["homologacao", "producao"].includes(ambienteInformado) ? ambienteInformado : "homologacao";
  return {
    enabled: textoEnv("CORREIOS_ENABLED").toLowerCase() === "true",
    env,
    baseUrl: env === "producao" ? "https://api.correios.com.br" : "https://apihom.correios.com.br",
    apiUser: textoEnv("CORREIOS_API_USER"), apiAccessCode: textoEnv("CORREIOS_API_ACCESS_CODE"),
    contrato: textoEnv("CORREIOS_CONTRATO"), cartaoPostagem: textoEnv("CORREIOS_CARTAO_POSTAGEM"),
    cnpj: textoEnv("CORREIOS_CNPJ").replace(/\D/g, ""), dr: textoEnv("CORREIOS_DR"),
    cepOrigem: textoEnv("CORREIOS_CEP_ORIGEM").replace(/\D/g, ""),
    timeoutMs: inteiroEnv("CORREIOS_TIMEOUT_MS", 8000), tokenSafetySeconds: inteiroEnv("CORREIOS_TOKEN_SAFETY_SECONDS", 60),
    servicos: textoEnv("CORREIOS_SERVICOS").split(",").map(item => item.trim().toUpperCase()).filter(Boolean),
    servicoPac: textoEnv("CORREIOS_SERVICO_PAC"), servicoSedex: textoEnv("CORREIOS_SERVICO_SEDEX"),
    cotacaoTtlMinutes: inteiroEnv("CORREIOS_COTACAO_TTL_MINUTES", 30),
  };
}

function maskCorreiosValue(value, visibleStart = 2, visibleEnd = 2) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.length <= visibleStart + visibleEnd) return "*".repeat(text.length);
  return `${text.slice(0, visibleStart)}${"*".repeat(text.length - visibleStart - visibleEnd)}${text.slice(-visibleEnd)}`;
}

function getCorreiosLocalStatus() {
  const config = getCorreiosConfig();
  return {
    enabled: config.enabled, env: config.env, cep_origem_configurado: config.cepOrigem.length === 8,
    cnpj_configurado: config.cnpj.length === 14, contrato_configurado: Boolean(config.contrato),
    cartao_postagem_configurado: Boolean(config.cartaoPostagem), dr_configurada: Boolean(config.dr),
    servicos_configurados: config.servicos,
  };
}

function validateTokenConfig(config) {
  if (!config.enabled) throw correiosError("Integração com os Correios está desabilitada.", "CORREIOS_DESABILITADO", 503);
  if (!config.apiUser || !config.apiAccessCode) throw correiosError("Usuário ou código de acesso dos Correios não configurado.", "CORREIOS_CREDENCIAIS_AUSENTES", 503);
  if (!config.cartaoPostagem && !config.contrato) throw correiosError("Cartão de postagem ou contrato dos Correios não configurado.", "CORREIOS_AUTORIZACAO_AUSENTE", 503);
}

function configFingerprint(config) {
  return crypto.createHash("sha256").update([config.env, config.apiUser, config.apiAccessCode, config.contrato, config.cartaoPostagem, config.dr].join("\0")).digest("hex");
}

function tokenExpiration(payload) {
  const direct = payload.expiraEm || payload.expira_em || payload.expires_at || payload.expiration;
  if (direct) { const parsed = Date.parse(direct); if (Number.isFinite(parsed)) return parsed; }
  const seconds = Number(payload.expires_in || payload.expiresIn);
  if (Number.isFinite(seconds) && seconds > 0) return Date.now() + seconds * 1000;
  try {
    const body = JSON.parse(Buffer.from(String(payload.token).split(".")[1], "base64url").toString("utf8"));
    if (Number.isFinite(Number(body.exp))) return Number(body.exp) * 1000;
  } catch { /* Token opaco ou JWT sem expiração legível. */ }
  return Date.now() + 5 * 60 * 1000;
}

function tokenEndpoint(config) {
  if (config.cartaoPostagem) return { path: "/token/v1/autentica/cartaopostagem", body: { numero: config.cartaoPostagem, ...(config.contrato ? { contrato: config.contrato } : {}), ...(config.dr ? { dr: Number(config.dr) || config.dr } : {}) } };
  return { path: "/token/v1/autentica/contrato", body: { numero: config.contrato, ...(config.dr ? { dr: Number(config.dr) || config.dr } : {}) } };
}

async function requestToken(config, fingerprint) {
  const endpoint = tokenEndpoint(config), controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const basic = Buffer.from(`${config.apiUser}:${config.apiAccessCode}`, "utf8").toString("base64");
    const response = await fetch(`${config.baseUrl}${endpoint.path}`, { method: "POST", headers: { Authorization: `Basic ${basic}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(endpoint.body), signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw correiosError("Credenciais dos Correios inválidas ou sem permissão.", "CORREIOS_NAO_AUTORIZADO", 502);
      if (response.status === 429) throw correiosError("Limite temporário de autenticação dos Correios atingido. Tente novamente mais tarde.", "CORREIOS_LIMITE_TOKEN", 503);
      if (response.status >= 500) throw correiosError("Serviço de autenticação dos Correios indisponível.", "CORREIOS_TOKEN_INDISPONIVEL", 503);
      throw correiosError(`Não foi possível autenticar nos Correios (HTTP ${response.status}).`, "CORREIOS_TOKEN_ERRO", 502);
    }
    const token = String(payload.token || payload.access_token || "").trim();
    if (!token) throw correiosError("Os Correios não retornaram um token válido.", "CORREIOS_TOKEN_INVALIDO", 502);
    tokenCache = { token, expiresAt: tokenExpiration({ ...payload, token }), fingerprint };
    return token;
  } catch (error) {
    if (error?.name === "AbortError") throw correiosError("Tempo limite ao autenticar nos Correios.", "CORREIOS_TOKEN_TIMEOUT", 503);
    if (error?.code?.startsWith("CORREIOS_")) throw error;
    throw correiosError("Não foi possível conectar ao serviço de autenticação dos Correios.", "CORREIOS_TOKEN_CONEXAO", 503);
  } finally { clearTimeout(timer); }
}

async function getCorreiosToken() {
  const config = getCorreiosConfig(); validateTokenConfig(config);
  const fingerprint = configFingerprint(config), safeUntil = Date.now() + config.tokenSafetySeconds * 1000;
  if (tokenCache?.fingerprint === fingerprint && tokenCache.expiresAt > safeUntil) return tokenCache.token;
  if (!tokenRequest) tokenRequest = requestToken(config, fingerprint).finally(() => { tokenRequest = null; });
  return tokenRequest;
}

function clearCorreiosTokenCache() { tokenCache = null; }

module.exports = {
  getCorreiosConfig, getCorreiosToken, clearCorreiosTokenCache, maskCorreiosValue, getCorreiosLocalStatus,
  obterConfiguracaoCorreios: getCorreiosConfig, obterStatusConfiguracaoCorreios: getCorreiosLocalStatus, obterTokenCorreios: getCorreiosToken,
};
