const { obterConfiguracaoCorreios } = require("./correios-token.service");

async function cotarFreteCorreios() {
  const config = obterConfiguracaoCorreios();
  const error = new Error(config.enabled ? "Cotação dos Correios ainda não está implementada." : "Integração com os Correios está desabilitada.");
  error.code = config.enabled ? "CORREIOS_COTACAO_NAO_IMPLEMENTADA" : "CORREIOS_DESABILITADO";
  error.statusCode = 503;
  throw error;
}

module.exports = { cotarFreteCorreios };
