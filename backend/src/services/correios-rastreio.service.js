const { obterConfiguracaoCorreios } = require("./correios-token.service");

async function rastrearObjetoCorreios() {
  const config = obterConfiguracaoCorreios();
  const error = new Error(config.enabled ? "Rastreamento dos Correios ainda não está implementado." : "Integração com os Correios está desabilitada.");
  error.code = config.enabled ? "CORREIOS_RASTREIO_NAO_IMPLEMENTADO" : "CORREIOS_DESABILITADO";
  error.statusCode = 503;
  throw error;
}

module.exports = { rastrearObjetoCorreios };
