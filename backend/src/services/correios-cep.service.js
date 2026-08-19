const { obterConfiguracaoCorreios } = require("./correios-token.service");

async function consultarCepCorreios() {
  const config = obterConfiguracaoCorreios();
  const error = new Error(config.enabled ? "Consulta de CEP dos Correios ainda não está implementada." : "Integração com os Correios está desabilitada.");
  error.code = config.enabled ? "CORREIOS_CEP_NAO_IMPLEMENTADO" : "CORREIOS_DESABILITADO";
  error.statusCode = 503;
  throw error;
}

module.exports = { consultarCepCorreios };
