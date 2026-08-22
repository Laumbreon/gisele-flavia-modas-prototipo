const { pool } = require("../config/db");
const { createHash, randomUUID } = require("crypto");
const { criarOuObterPreferenciaVenda } = require("./mercado-pago.controller");
const { consultarCepCorreios, sanitizarCep } = require("../services/correios-cep.service");
const { cotarFreteCorreios } = require("../services/correios-cotacao.service");
const { resolverServicosEntregaCorreios } = require("../services/correios-contrato.service");
const { getCorreiosConfig } = require("../services/correios-token.service");

function erroValidacao(message) { const error = new Error(message); error.statusCode = 400; return error; }
function texto(value) { const result = String(value || "").trim(); return result || null; }
function dinheiro(value) { return Math.round(Number(value || 0) * 100) / 100; }
function cpfNormalizado(value) { return String(value || "").replace(/\D/g, "") || null; }
function numeroPositivo(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function arredondarMedida(value) { return Math.round(Number(value) * 100) / 100; }
function itensNormalizados(itens) {
  if (!Array.isArray(itens) || !itens.length) throw erroValidacao("Adicione ao menos um item ao pedido.");
  const grouped = [];
  for (const item of itens) {
    const produtoId = Number(item.produto_id), variacaoId = Number(item.variacao_id), quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isInteger(variacaoId) || variacaoId <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) throw erroValidacao("Item ou quantidade inválida.");
    const current = grouped.find(value => value.produto_id === produtoId && value.variacao_id === variacaoId);
    if (current) current.quantidade += quantidade;
    else grouped.push({ produto_id: produtoId, variacao_id: variacaoId, quantidade });
  }
  return grouped;
}
function pacoteLogistico(rows) {
  let pesoGramas = 0, comprimentoCm = 0, larguraCm = 0, alturaCm = 0;
  for (const row of rows) {
    const peso = numeroPositivo(row.peso_gramas), comprimento = numeroPositivo(row.comprimento_cm), largura = numeroPositivo(row.largura_cm), altura = numeroPositivo(row.altura_cm);
    if (!peso || !comprimento || !largura || !altura) throw erroValidacao("Este produto ainda não possui dados de envio cadastrados.");
    pesoGramas += peso * Number(row.quantidade);
    comprimentoCm = Math.max(comprimentoCm, comprimento);
    larguraCm = Math.max(larguraCm, largura);
    alturaCm += altura * Number(row.quantidade);
  }
  return { pesoGramas: Math.round(pesoGramas), comprimentoCm: arredondarMedida(comprimentoCm), larguraCm: arredondarMedida(larguraCm), alturaCm: arredondarMedida(alturaCm) };
}
function assinaturaCarrinho(rows) {
  const canonical = rows
    .map(row => ({ produto_id:Number(row.produto_id), variacao_id:Number(row.variacao_id), quantidade:Number(row.quantidade) }))
    .sort((left, right) => left.produto_id - right.produto_id || left.variacao_id - right.variacao_id)
    .map(row => `${row.produto_id}:${row.variacao_id}:${row.quantidade}`)
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}
async function carregarItensCotacao(itens) {
  const rows = [];
  for (const item of itensNormalizados(itens)) {
    const result = await pool.query(`SELECT p.id produto_id,p.nome produto_nome,p.peso_gramas,p.comprimento_cm,p.largura_cm,p.altura_cm,pv.id variacao_id,e.quantidade estoque FROM produto_variacoes pv JOIN produtos p ON p.id=pv.produto_id JOIN estoque e ON e.produto_variacao_id=pv.id WHERE p.id=$1 AND pv.id=$2 AND p.status='ativo' AND pv.ativo=TRUE`, [item.produto_id, item.variacao_id]);
    const row = result.rows[0];
    if (!row) throw erroValidacao("Produto ou variação não encontrado.");
    if (Number(row.estoque) < item.quantidade) throw erroValidacao(`Estoque insuficiente para ${row.produto_nome}.`);
    rows.push({ ...row, quantidade: item.quantidade });
  }
  return rows;
}
async function salvarCotacoesCorreios(cepDestino, pacote, carrinhoHash, services) {
  const config = getCorreiosConfig(), warnings = [];
  const results = await Promise.allSettled(services.map(async ([name, service]) => ({ name, service, quote: await cotarFreteCorreios({ cepDestino, servicoCodigo: service.codigo, ...pacote }) })));
  const valid = [];
  results.forEach((result, index) => result.status === "fulfilled" ? valid.push(result.value) : warnings.push(`${services[index][0]} indisponível no momento.`));
  if (!valid.length) throw Object.assign(new Error("Nenhuma modalidade dos Correios está disponível para este endereço."), { statusCode: 422 });
  const expiresAt = new Date(Date.now() + Math.max(1, Math.min(config.cotacaoTtlMinutes, 24 * 60)) * 60 * 1000);
  const client = await pool.connect(), options = [];
  try {
    await client.query("BEGIN");
    for (const { name, service, quote } of valid) {
      const id = randomUUID();
      const sanitized = { servico: name, codigo: service.codigo, valor: quote.valor, prazo_dias_uteis: quote.prazo_dias_uteis, carrinho_hash:carrinhoHash, disponivel: true };
      await client.query(`INSERT INTO correios_cotacoes (id,cep_origem,cep_destino,servico_codigo,servico_nome,valor,prazo_dias_uteis,peso_gramas,comprimento_cm,largura_cm,altura_cm,resposta_sanitizada,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`, [id, config.cepOrigem, cepDestino, service.codigo, service.descricao || name, quote.valor, quote.prazo_dias_uteis, pacote.pesoGramas, pacote.comprimentoCm, pacote.larguraCm, pacote.alturaCm, JSON.stringify(sanitized), expiresAt]);
      options.push({ cotacao_id:id, servico:name, codigo:service.codigo, descricao:service.descricao || name, valor:quote.valor, valor_formatado:quote.valor_formatado, prazo_dias_uteis:quote.prazo_dias_uteis, expira_em:expiresAt });
    }
    await client.query("COMMIT");
    return { options, warnings };
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    throw Object.assign(new Error("Não foi possível salvar a cotação dos Correios agora."), { statusCode: 503 });
  } finally { client.release(); }
}

async function cotacoesCorreiosPublicas(req, res) {
  try {
    const cepDestino = sanitizarCep(req.body?.cep_destino);
    const rows = await carregarItensCotacao(req.body?.itens);
    const pacote = pacoteLogistico(rows);
    const [cep, resolved] = await Promise.all([consultarCepCorreios(cepDestino), resolverServicosEntregaCorreios()]);
    const services = [["PAC", resolved.pac], ["SEDEX", resolved.sedex]].filter(([, service]) => service?.codigo);
    if (!services.length) return res.status(422).json({ message:"As modalidades dos Correios ainda não estão configuradas." });
    const saved = await salvarCotacoesCorreios(cepDestino, pacote, assinaturaCarrinho(rows), services);
    return res.json({ cep, opcoes:saved.options, avisos:[...resolved.avisos, ...saved.warnings] });
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    if (status < 500) return res.status(status).json({ message:error.message });
    console.error("Erro ao cotar Correios no checkout público:", error.code || error.name || "erro_interno");
    return res.status(status >= 500 && status <= 599 ? status : 500).json({ message:"Não foi possível calcular o frete dos Correios agora. Retirada e entrega local continuam disponíveis." });
  }
}

async function checkoutPublico(req, res) {
  const cliente = req.body.cliente || {};
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const tipoEntrega = ["entrega_local", "correios"].includes(req.body.tipo_entrega) ? req.body.tipo_entrega : "retirada";
  const entrega = req.body.entrega || {};
  const formaPagamento = ["pix", "cartao"].includes(req.body.forma_pagamento) ? req.body.forma_pagamento : null;
  const parcelasInformadas = Number(req.body.parcelas ?? 1);
  const parcelas = formaPagamento === "cartao" ? parcelasInformadas : 1;
  const cpfCliente = cpfNormalizado(cliente.cpf);
  const enviarComprovanteEmail = req.body.enviar_comprovante_email === true;

  if (!texto(cliente.nome) || !texto(cliente.telefone)) return res.status(400).json({ message: "Nome e telefone são obrigatórios." });
  if (enviarComprovanteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(cliente.email) || "")) return res.status(400).json({ message: "Informe um e-mail válido ou desmarque o envio do comprovante por e-mail." });
  if (formaPagamento === "pix" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(cliente.email) || "")) return res.status(400).json({ message: "Informe um e-mail válido para gerar o PIX." });
  if (formaPagamento === "pix" && cpfCliente?.length !== 11) return res.status(400).json({ message: "Informe um CPF válido para gerar o PIX." });
  if (cpfCliente && cpfCliente.length !== 11) return res.status(400).json({ message: "O CPF deve conter exatamente 11 dígitos." });
  if (!itens.length) return res.status(400).json({ message: "Adicione ao menos um item ao pedido." });
  if (!formaPagamento) return res.status(400).json({ message: "Selecione uma forma de pagamento válida." });
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 3) {
    return res.status(400).json({ message: "Selecione uma quantidade de parcelas entre 1 e 3." });
  }
  if (tipoEntrega === "entrega_local" && (!texto(entrega.bairro) || !texto(entrega.cidade) || !texto(entrega.endereco) || !texto(entrega.numero))) {
    return res.status(400).json({ message: "Preencha os dados obrigatórios da entrega." });
  }
  if (tipoEntrega === "correios" && (!texto(entrega.cep) || !texto(entrega.estado) || !texto(entrega.cidade) || !texto(entrega.bairro) || !texto(entrega.endereco) || !texto(entrega.numero))) {
    return res.status(400).json({ message: "Preencha o endereço completo para entrega pelos Correios." });
  }
  const itensAgrupados = [];
  for (const item of itens) {
    const produtoId = Number(item.produto_id), variacaoId = Number(item.variacao_id), quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isInteger(variacaoId) || variacaoId <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) {
      return res.status(400).json({ message: "Item ou quantidade inválida." });
    }
    const existente = itensAgrupados.find(atual => atual.produto_id === produtoId && atual.variacao_id === variacaoId);
    if (existente) existente.quantidade += quantidade;
    else itensAgrupados.push({ produto_id: produtoId, variacao_id: variacaoId, quantidade });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let clienteId = null;
    const autenticadoId=Number(req.cliente?.cliente_id)||null;
    const existente = autenticadoId
      ? await client.query(`SELECT id,senha_hash FROM clientes WHERE id=$1 AND ativo=TRUE FOR UPDATE`,[autenticadoId])
      : await client.query(`SELECT id,senha_hash FROM clientes WHERE telefone = $1 OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2)) ORDER BY CASE WHEN $2::text IS NOT NULL AND LOWER(email)=LOWER($2) THEN 0 ELSE 1 END,id LIMIT 1 FOR UPDATE`, [texto(cliente.telefone), texto(cliente.email)]);
    if (autenticadoId && !existente.rows[0]) throw Object.assign(new Error("Sua conta não está disponível. Entre novamente."),{statusCode:401});
    if (!autenticadoId && existente.rows[0]?.senha_hash) {
      const visitante=await client.query(`INSERT INTO clientes (nome,telefone,whatsapp,email,cpf,ativo) VALUES ($1,$2,$2,NULL,$3,TRUE) RETURNING id`,[texto(cliente.nome),texto(cliente.telefone),cpfCliente]);
      clienteId=visitante.rows[0].id;
    } else if (existente.rows[0]) {
      clienteId = existente.rows[0].id;
      if(autenticadoId||!existente.rows[0].senha_hash)await client.query(`UPDATE clientes SET nome=$1, telefone=$2, whatsapp=$2, email=COALESCE($3,email), cpf=COALESCE($4,cpf), updated_at=NOW() WHERE id=$5`, [texto(cliente.nome), texto(cliente.telefone), autenticadoId?null:texto(cliente.email), cpfCliente, clienteId]);
    } else {
      const criado = await client.query(`INSERT INTO clientes (nome,telefone,whatsapp,email,cpf,ativo) VALUES ($1,$2,$2,$3,$4,TRUE) RETURNING id`, [texto(cliente.nome), texto(cliente.telefone), texto(cliente.email), cpfCliente]);
      clienteId = criado.rows[0].id;
    }

    let subtotal = 0;
    const processados = [];
    for (const item of itensAgrupados) {
      const produtoId = Number(item.produto_id), variacaoId = Number(item.variacao_id), quantidade = Number(item.quantidade);
      if (!Number.isInteger(produtoId) || !Number.isInteger(variacaoId) || !Number.isInteger(quantidade) || quantidade <= 0) throw erroValidacao("Item ou quantidade inválida.");
      const result = await client.query(`SELECT p.id produto_id,p.nome produto_nome,p.preco produto_preco,p.preco_promocional produto_promocional,p.peso_gramas,p.comprimento_cm,p.largura_cm,p.altura_cm,pv.id variacao_id,pv.tamanho,pv.cor,pv.sku,pv.codigo_interno,pv.codigo_ref,pv.codigo_barras,pv.preco_venda,pv.preco_promocional,e.quantidade estoque FROM produto_variacoes pv JOIN produtos p ON p.id=pv.produto_id JOIN estoque e ON e.produto_variacao_id=pv.id WHERE p.id=$1 AND pv.id=$2 AND p.status='ativo' AND pv.ativo=TRUE FOR UPDATE OF e`, [produtoId, variacaoId]);
      const row = result.rows[0];
      if (!row) throw erroValidacao("Produto ou variação não encontrado.");
      if (Number(row.estoque) < quantidade) throw erroValidacao(`Estoque insuficiente para ${row.produto_nome} (${row.tamanho}/${row.cor}).`);
      const preco = dinheiro(row.preco_promocional ?? row.preco_venda ?? row.produto_promocional ?? row.produto_preco);
      subtotal = dinheiro(subtotal + preco * quantidade);
      processados.push({ ...row, quantidade, preco, subtotal: dinheiro(preco * quantidade) });
    }

    let frete = 0, cotacaoCorreios = null;
    if (tipoEntrega === "entrega_local") {
      const result = await client.query(`SELECT valor,prazo_estimado FROM fretes_bairro WHERE ativo=TRUE AND LOWER(bairro)=LOWER($1) AND LOWER(cidade)=LOWER($2) AND LOWER(estado)=LOWER($3) LIMIT 1`, [texto(entrega.bairro), texto(entrega.cidade), texto(entrega.estado) || "SP"]);
      if (!result.rows[0]) throw erroValidacao("Este bairro ainda não é atendido para entrega local.");
      frete = dinheiro(result.rows[0].valor);
      const configuracoes = await client.query("SELECT chave,valor FROM configuracoes_loja WHERE chave = ANY($1::varchar[])", [["frete_gratis_minimo", "frete_promocional_minimo", "frete_promocional_valor"]]);
      const regras = Object.fromEntries(configuracoes.rows.map(row => [row.chave, dinheiro(row.valor)]));
      const freteGratisMinimo = regras.frete_gratis_minimo ?? 0;
      const fretePromocionalMinimo = regras.frete_promocional_minimo ?? 300;
      const fretePromocionalValor = regras.frete_promocional_valor ?? 19.99;
      if (fretePromocionalMinimo > 0 && subtotal >= fretePromocionalMinimo) frete = Math.min(frete, fretePromocionalValor);
      if (freteGratisMinimo > 0 && subtotal >= freteGratisMinimo) frete = 0;
    } else if (tipoEntrega === "correios") {
      const cotacaoId = texto(entrega.cotacao_id), servicoCodigo = texto(entrega.correios_servico_codigo), cepDestino = sanitizarCep(entrega.cep);
      if (!cotacaoId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cotacaoId)) throw erroValidacao("Selecione uma cotação válida dos Correios.");
      if (!servicoCodigo) throw erroValidacao("Selecione PAC ou SEDEX antes de finalizar.");
      const quoteResult = await client.query(`SELECT id,cep_destino,servico_codigo,servico_nome,valor,prazo_dias_uteis,peso_gramas,comprimento_cm,largura_cm,altura_cm,resposta_sanitizada->>'carrinho_hash' carrinho_hash,expires_at,(expires_at > NOW()) vigente FROM correios_cotacoes WHERE id=$1 FOR UPDATE`, [cotacaoId]);
      cotacaoCorreios = quoteResult.rows[0];
      if (!cotacaoCorreios) throw erroValidacao("A cotação dos Correios não foi encontrada. Calcule o frete novamente.");
      if (!cotacaoCorreios.vigente) throw erroValidacao("A cotação dos Correios expirou. Calcule o frete novamente.");
      if (String(cotacaoCorreios.cep_destino) !== cepDestino) throw erroValidacao("A cotação não pertence ao CEP informado. Calcule o frete novamente.");
      if (String(cotacaoCorreios.servico_codigo) !== servicoCodigo) throw erroValidacao("O serviço selecionado não corresponde à cotação dos Correios.");
      const pacoteAtual = pacoteLogistico(processados);
      const pacoteCotado = { pesoGramas:Number(cotacaoCorreios.peso_gramas), comprimentoCm:Number(cotacaoCorreios.comprimento_cm), larguraCm:Number(cotacaoCorreios.largura_cm), alturaCm:Number(cotacaoCorreios.altura_cm) };
      if (!cotacaoCorreios.carrinho_hash || assinaturaCarrinho(processados) !== cotacaoCorreios.carrinho_hash) throw erroValidacao("A cotação não pertence ao carrinho atual. Calcule o frete dos Correios novamente.");
      if (pacoteAtual.pesoGramas !== pacoteCotado.pesoGramas || pacoteAtual.comprimentoCm !== pacoteCotado.comprimentoCm || pacoteAtual.larguraCm !== pacoteCotado.larguraCm || pacoteAtual.alturaCm !== pacoteCotado.alturaCm) throw erroValidacao("O carrinho mudou depois da cotação. Calcule o frete dos Correios novamente.");
      frete = dinheiro(cotacaoCorreios.valor);
    }
    const total = dinheiro(subtotal + frete);
    const venda = await client.query(`INSERT INTO vendas (cliente_id,usuario_id,subtotal,desconto,frete_valor,total,total_pago,troco,valor_faltante,forma_pagamento,parcelas,canal_venda,origem_venda,tem_entrega,status_pagamento,status_entrega,caixa_id,maquininha_id,status,observacoes,enviar_comprovante_email) VALUES ($1,NULL,$2,0,$3,$4,0,0,$4,$5,$6,'site','checkout_publico',$7,'pendente',$8,NULL,NULL,'pendente',$9,$10) RETURNING id,total,status_pagamento,parcelas,enviar_comprovante_email`, [clienteId,subtotal,frete,total,formaPagamento,parcelas,tipoEntrega !== "retirada","pendente",texto(req.body.observacoes),enviarComprovanteEmail]);
    const vendaId = venda.rows[0].id;
    for (const item of processados) {
      await client.query(`INSERT INTO itens_venda (venda_id,produto_id,produto_variacao_id,produto_nome,tamanho,cor,codigo_ref,codigo_barras,quantidade,preco_unitario,subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [vendaId,item.produto_id,item.variacao_id,item.produto_nome,item.tamanho,item.cor,item.codigo_ref,item.codigo_barras,item.quantidade,item.preco,item.subtotal]);
      await client.query(`UPDATE estoque SET quantidade=quantidade-$1,updated_at=NOW() WHERE produto_variacao_id=$2`, [item.quantidade,item.variacao_id]);
      await client.query(`INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes) VALUES ($1,$2,'saida',$3,'Pedido pelo site','Checkout público',$4)`, [item.produto_id,item.variacao_id,item.quantidade,`Venda #${vendaId}`]);
    }
    if (tipoEntrega === "entrega_local") {
      await client.query(`INSERT INTO venda_entregas (venda_id,tipo_entrega,status_entrega,valor_frete,destinatario_nome,destinatario_telefone,estado,cidade,bairro,endereco,numero,complemento,referencia,observacoes) VALUES ($1,'entrega_local','pendente',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [vendaId,frete,texto(entrega.destinatario_nome)||texto(cliente.nome),texto(entrega.destinatario_telefone)||texto(cliente.telefone),texto(entrega.estado)||"SP",texto(entrega.cidade),texto(entrega.bairro),texto(entrega.endereco),texto(entrega.numero),texto(entrega.complemento),texto(entrega.referencia),texto(req.body.observacoes)]);
    } else if (tipoEntrega === "correios") {
      await client.query(`INSERT INTO venda_entregas (venda_id,tipo_entrega,status_entrega,valor_frete,destinatario_nome,destinatario_telefone,cep,estado,cidade,bairro,endereco,numero,complemento,referencia,transportadora,observacoes,correios_cotacao_id,correios_servico_codigo,correios_servico_nome,prazo_dias_uteis) VALUES ($1,'correios','pendente',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Correios',$13,$14,$15,$16,$17)`, [vendaId,frete,texto(entrega.destinatario_nome)||texto(cliente.nome),texto(entrega.destinatario_telefone)||texto(cliente.telefone),sanitizarCep(entrega.cep),texto(entrega.estado).toUpperCase(),texto(entrega.cidade),texto(entrega.bairro),texto(entrega.endereco),texto(entrega.numero),texto(entrega.complemento),texto(entrega.referencia),texto(req.body.observacoes),cotacaoCorreios.id,cotacaoCorreios.servico_codigo,cotacaoCorreios.servico_nome,cotacaoCorreios.prazo_dias_uteis]);
    }
    await client.query("COMMIT");
    let mercadoPago={disponivel:false,status:"nao_aplicavel",message:"Forma de pagamento sem link Mercado Pago."};
    if(["pix","cartao"].includes(formaPagamento)){
      try{
        const preferencia=await criarOuObterPreferenciaVenda(vendaId),paymentLink=preferencia.url_pagamento||preferencia.sandbox_init_point||preferencia.init_point;
        mercadoPago=paymentLink?{disponivel:true,status:formaPagamento==="pix"?"pix_aguardando_pagamento":"link_gerado",preference_id:preferencia.preference_id,payment_id:preferencia.payment_id,payment_link:paymentLink,qr_code:preferencia.qr_code||null,qr_code_base64:preferencia.qr_code_base64||null,ambiente:preferencia.ambiente}:{disponivel:false,status:"erro",message:"Pedido criado, mas não foi possível gerar o pagamento agora."};
      }catch(error){console.error(`Mercado Pago automático indisponível para venda #${vendaId}:`,error.code||error.message);const pixSemChave=error.code==="MP_PIX_KEY_REQUIRED";mercadoPago={disponivel:false,status:pixSemChave?"pix_nao_habilitado":error.statusCode===409?"indisponivel":"erro",message:pixSemChave?"O PIX da loja ainda não está habilitado no Mercado Pago. Entre em contato com a loja para concluir o pagamento.":"Pedido criado, mas não foi possível gerar o link de pagamento agora."};}
    }
    res.status(201).json({ ok:true,venda_id:vendaId,total,status_pagamento:"pendente",parcelas,mensagem:"Pedido recebido com sucesso.",mercado_pago:mercadoPago });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode === 400 || error.statusCode === 401) return res.status(error.statusCode).json({ message:error.message });
    console.error("Erro no checkout público:", error);
    res.status(500).json({ message:"Não foi possível receber o pedido agora." });
  } finally { client.release(); }
}

module.exports = { checkoutPublico, cotacoesCorreiosPublicas };
