function slugCodigo(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function gerarCodigoVariacao({ produtoNome, tamanho, cor }) {
  const partes = [produtoNome, tamanho, cor].map(slugCodigo).filter(Boolean);
  return partes.join("-");
}

function gerarCodigoUnico(codigoBase, codigosExistentes = []) {
  const usados = new Set(codigosExistentes.filter(Boolean).map(codigo => String(codigo).toUpperCase()));
  let codigo = codigoBase;
  let contador = 2;

  while (usados.has(codigo)) {
    codigo = `${codigoBase}-${contador}`;
    contador += 1;
  }

  return codigo;
}

function preencherCodigosVariacao(variacao, codigosExistentes = []) {
  const codigo = gerarCodigoVariacao({
    produtoNome: variacao.produtoNome || variacao.produto_nome || variacao.nome,
    tamanho: variacao.tamanho,
    cor: variacao.cor,
  });
  const codigoUnico = gerarCodigoUnico(codigo, codigosExistentes);

  return {
    ...variacao,
    sku: variacao.sku || codigoUnico,
    codigo_barras: variacao.codigo_barras || codigoUnico,
    codigo_interno: variacao.codigo_interno || codigoUnico,
  };
}

module.exports = {
  slugCodigo,
  gerarCodigoVariacao,
  gerarCodigoUnico,
  preencherCodigosVariacao,
};
