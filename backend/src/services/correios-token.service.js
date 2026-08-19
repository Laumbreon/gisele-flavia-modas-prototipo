function textoEnv(nome) {
  return String(process.env[nome] || "").trim();
}

function inteiroEnv(nome, padrao) {
  const valor = Number(textoEnv(nome));
  return Number.isInteger(valor) && valor > 0 ? valor : padrao;
}

function obterConfiguracaoCorreios() {
  const ambienteInformado = textoEnv("CORREIOS_ENV").toLowerCase();
  const env = ["homologacao", "producao"].includes(ambienteInformado) ? ambienteInformado : "homologacao";
  return {
    enabled: textoEnv("CORREIOS_ENABLED").toLowerCase() === "true",
    env,
    apiUser: textoEnv("CORREIOS_API_USER"),
    apiAccessCode: textoEnv("CORREIOS_API_ACCESS_CODE"),
    contrato: textoEnv("CORREIOS_CONTRATO"),
    cartaoPostagem: textoEnv("CORREIOS_CARTAO_POSTAGEM"),
    cnpj: textoEnv("CORREIOS_CNPJ"),
    dr: textoEnv("CORREIOS_DR"),
    cepOrigem: textoEnv("CORREIOS_CEP_ORIGEM").replace(/\D/g, ""),
    timeoutMs: inteiroEnv("CORREIOS_TIMEOUT_MS", 8000),
    tokenSafetySeconds: inteiroEnv("CORREIOS_TOKEN_SAFETY_SECONDS", 60),
    servicos: textoEnv("CORREIOS_SERVICOS").split(",").map(item => item.trim().toUpperCase()).filter(Boolean),
  };
}

function obterStatusConfiguracaoCorreios() {
  const config = obterConfiguracaoCorreios();
  return {
    enabled: config.enabled,
    env: config.env,
    cep_origem_configurado: config.cepOrigem.length === 8,
    contrato_configurado: Boolean(config.contrato),
    cartao_postagem_configurado: Boolean(config.cartaoPostagem),
    servicos_configurados: config.servicos,
  };
}

async function obterTokenCorreios() {
  const config = obterConfiguracaoCorreios();
  const error = new Error(config.enabled ? "Autenticação com os Correios será implementada em uma fase futura." : "Integração com os Correios está desabilitada.");
  error.code = config.enabled ? "CORREIOS_TOKEN_NAO_IMPLEMENTADO" : "CORREIOS_DESABILITADO";
  error.statusCode = 503;
  throw error;
}

module.exports = { obterConfiguracaoCorreios, obterStatusConfiguracaoCorreios, obterTokenCorreios };
