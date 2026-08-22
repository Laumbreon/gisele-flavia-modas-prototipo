const { getCorreiosConfig, getCorreiosToken, clearCorreiosTokenCache } = require("./correios-token.service");

function correiosError(message, code, statusCode = 502) {
  return Object.assign(new Error(message), { code, statusCode });
}

function sanitizarCep(cep) {
  const value = String(cep || "").replace(/\D/g, "");
  if (value.length !== 8) throw correiosError("Informe um CEP válido com 8 dígitos.", "CORREIOS_CEP_INVALIDO", 400);
  return value;
}

async function buscarCep(cep, retryUnauthorized = true) {
  const config = getCorreiosConfig();
  const token = await getCorreiosToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/cep/v1/enderecos/${encodeURIComponent(cep)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && retryUnauthorized) {
        clearCorreiosTokenCache();
        return buscarCep(cep, false);
      }
      if ([400, 404].includes(response.status)) throw correiosError("CEP não encontrado nos Correios.", "CORREIOS_CEP_NAO_ENCONTRADO", 404);
      if ([401, 403].includes(response.status)) throw correiosError("Credencial sem permissão para consultar CEP nos Correios.", "CORREIOS_CEP_NAO_AUTORIZADO", 502);
      if (response.status === 429) throw correiosError("Limite temporário de consultas de CEP atingido.", "CORREIOS_CEP_LIMITE", 503);
      if (response.status >= 500) throw correiosError("Consulta de CEP dos Correios temporariamente indisponível.", "CORREIOS_CEP_INDISPONIVEL", 503);
      throw correiosError(`Não foi possível consultar o CEP (HTTP ${response.status}).`, "CORREIOS_CEP_ERRO", 502);
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw correiosError("Tempo limite ao consultar o CEP nos Correios.", "CORREIOS_CEP_TIMEOUT", 503);
    if (error?.code?.startsWith("CORREIOS_")) throw error;
    throw correiosError("Não foi possível conectar à consulta de CEP dos Correios.", "CORREIOS_CEP_CONEXAO", 503);
  } finally {
    clearTimeout(timer);
  }
}

async function consultarCepCorreios(cep) {
  const normalizedCep = sanitizarCep(cep);
  const payload = await buscarCep(normalizedCep);
  const streetName = String(payload.nomeLogradouro || payload.logradouro || payload.endereco || "").trim();
  const streetType = String(payload.tipoLogradouro || "").trim();
  const result = {
    cep: String(payload.cep || normalizedCep).replace(/\D/g, "") || normalizedCep,
    logradouro: [streetType, streetName].filter(Boolean).join(" ").trim(),
    bairro: String(payload.bairro || payload.nomeBairro || "").trim(),
    cidade: String(payload.localidade || payload.nomeLocalidade || payload.cidade || payload.municipio || "").trim(),
    uf: String(payload.uf || payload.siglaUF || payload.estado || "").trim().toUpperCase(),
  };
  if (result.cep.length !== 8 || !result.cidade || result.uf.length !== 2) {
    throw correiosError("Os Correios retornaram dados incompletos para o CEP.", "CORREIOS_CEP_RESPOSTA_INVALIDA", 502);
  }
  return result;
}

module.exports = { consultarCepCorreios, sanitizarCep };
