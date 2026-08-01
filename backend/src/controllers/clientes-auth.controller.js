const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, query } = require("../config/db");
const { smtpConfigurado, enviarEmailRecuperacaoSenha } = require("../services/email.service");
const { criarOuObterPreferenciaVenda } = require("./mercado-pago.controller");
const { consultarPagamento, cancelarPagamentoPendente } = require("../services/mercado-pago.service");

const emailValido = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const texto = (valor, limite) => String(valor || "").trim().slice(0, limite);
const emailNormalizado = valor => texto(valor, 160).toLowerCase();
const cpfNormalizado = valor => String(valor || "").replace(/\D/g, "") || null;
const clienteSeguro = cliente => ({ id:cliente.id,nome:cliente.nome,email:cliente.email,telefone:cliente.telefone,cpf:cliente.cpf,cep:cliente.cep,cidade:cliente.cidade,estado:cliente.estado,endereco:cliente.endereco,ativo:cliente.ativo,email_verificado:cliente.email_verificado === true });
const jwtSecret = () => process.env.JWT_SECRET || "dev_secret_altere_no_env";
const gerarToken = cliente => jwt.sign({ tipo:"cliente",cliente_id:Number(cliente.id),email:cliente.email },jwtSecret(),{ expiresIn:process.env.CLIENTE_JWT_EXPIRES_IN || "30d" });

async function cadastro(req,res){
  const nome=texto(req.body?.nome,120),email=emailNormalizado(req.body?.email),telefone=texto(req.body?.telefone,30),cpf=cpfNormalizado(req.body?.cpf),senha=String(req.body?.senha||""),confirmar=req.body?.confirmarSenha;
  if(!nome||!email||!telefone||!senha)return res.status(400).json({message:"Nome, e-mail, telefone e senha são obrigatórios."});
  if(!emailValido(email))return res.status(400).json({message:"Informe um e-mail válido."});
  if(cpf&&cpf.length!==11)return res.status(400).json({message:"O CPF deve conter exatamente 11 dígitos."});
  if(senha.length<6)return res.status(400).json({message:"A senha deve ter pelo menos 6 caracteres."});
  if(confirmar!==undefined&&senha!==String(confirmar))return res.status(400).json({message:"A confirmação da senha não confere."});
  const client=await pool.connect();
  try{await client.query("BEGIN");const existente=(await client.query("SELECT * FROM clientes WHERE LOWER(email)=$1 FOR UPDATE",[email])).rows[0];
    if(existente?.senha_hash)throw Object.assign(new Error("Este e-mail já possui cadastro. Use a opção Entrar."),{statusCode:409});
    if(existente&&texto(existente.telefone,30)!==telefone)throw Object.assign(new Error("Este e-mail já está associado a outro cadastro. Fale com a loja para recuperar o acesso."),{statusCode:409});
    const hash=await bcrypt.hash(senha,10);let cliente;
    if(existente)cliente=(await client.query(`UPDATE clientes SET nome=$2,telefone=$3,whatsapp=$3,cpf=COALESCE($4,cpf),senha_hash=$5,ativo=TRUE,updated_at=NOW() WHERE id=$1 RETURNING *`,[existente.id,nome,telefone,cpf,hash])).rows[0];
    else cliente=(await client.query(`INSERT INTO clientes (nome,email,telefone,whatsapp,cpf,senha_hash,ativo) VALUES ($1,$2,$3,$3,$4,$5,TRUE) RETURNING *`,[nome,email,telefone,cpf,hash])).rows[0];
    await client.query("COMMIT");res.status(201).json({message:"Conta criada com sucesso.",token:gerarToken(cliente),cliente:clienteSeguro(cliente)});
  }catch(error){await client.query("ROLLBACK");if(error.code==="23505")return res.status(409).json({message:"Este e-mail já está cadastrado."});res.status(error.statusCode||500).json({message:error.statusCode?error.message:"Não foi possível criar sua conta agora."});}finally{client.release();}
}

async function login(req,res){
  const email=emailNormalizado(req.body?.email),senha=String(req.body?.senha||"");if(!email||!senha)return res.status(400).json({message:"E-mail e senha são obrigatórios."});
  try{const cliente=(await query("SELECT * FROM clientes WHERE LOWER(email)=$1 LIMIT 1",[email])).rows[0];if(!cliente||!cliente.ativo||!cliente.senha_hash||!await bcrypt.compare(senha,cliente.senha_hash))return res.status(401).json({message:"E-mail ou senha inválidos."});const atualizado=(await query("UPDATE clientes SET ultimo_login_em=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *",[cliente.id])).rows[0];res.json({message:"Login realizado com sucesso.",token:gerarToken(atualizado),cliente:clienteSeguro(atualizado)});}catch(error){console.error("Erro no login de cliente:",error);res.status(500).json({message:"Não foi possível entrar no momento."});}
}

async function me(req,res){try{const cliente=(await query("SELECT * FROM clientes WHERE id=$1 AND ativo=TRUE",[req.cliente.cliente_id])).rows[0];if(!cliente)return res.status(404).json({message:"Cliente não encontrado."});res.json({cliente:clienteSeguro(cliente)});}catch{res.status(500).json({message:"Não foi possível carregar sua conta."});}}

async function atualizarMe(req,res){
  const id=Number(req.cliente.cliente_id),nome=texto(req.body?.nome,120),email=emailNormalizado(req.body?.email),telefone=texto(req.body?.telefone,30),cpf=cpfNormalizado(req.body?.cpf),cep=texto(req.body?.cep,12)||null,cidade=texto(req.body?.cidade,100)||null,estado=texto(req.body?.estado,2).toUpperCase()||null,endereco=texto(req.body?.endereco,500)||null,senhaAtual=String(req.body?.senha_atual||"");
  if(!nome||!email||!telefone)return res.status(400).json({message:"Nome, e-mail e telefone são obrigatórios."});
  if(!emailValido(email))return res.status(400).json({message:"Informe um e-mail válido."});
  if(cpf&&cpf.length!==11)return res.status(400).json({message:"O CPF deve conter exatamente 11 dígitos."});
  if(estado&&!/^[A-Z]{2}$/.test(estado))return res.status(400).json({message:"Informe o estado com 2 letras."});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const atual=(await client.query("SELECT * FROM clientes WHERE id=$1 AND ativo=TRUE FOR UPDATE",[id])).rows[0];
    if(!atual)throw Object.assign(new Error("Cliente não encontrado."),{statusCode:404});
    const mudouEmail=email!==emailNormalizado(atual.email);
    if(mudouEmail){
      if(!senhaAtual||!atual.senha_hash||!await bcrypt.compare(senhaAtual,atual.senha_hash))throw Object.assign(new Error("Informe sua senha atual para alterar o e-mail."),{statusCode:400});
      const emUso=(await client.query("SELECT 1 FROM clientes WHERE LOWER(email)=$1 AND id<>$2 LIMIT 1",[email,id])).rows[0];
      if(emUso)throw Object.assign(new Error("Este e-mail já está cadastrado."),{statusCode:409});
    }
    const atualizado=(await client.query(`UPDATE clientes SET nome=$2,email=$3::varchar,telefone=$4,whatsapp=$4,cpf=$5,cep=$6,cidade=$7,estado=$8,endereco=$9,email_verificado=CASE WHEN LOWER(COALESCE(email,''))<>LOWER($3::text) THEN FALSE ELSE email_verificado END,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,nome,email,telefone,cpf,cep,cidade,estado,endereco])).rows[0];
    await client.query("COMMIT");
    res.json({message:"Dados atualizados com sucesso.",token:gerarToken(atualizado),cliente:clienteSeguro(atualizado)});
  }catch(error){
    await client.query("ROLLBACK");
    if(error.code==="23505")return res.status(409).json({message:"Este e-mail já está cadastrado."});
    console.error("Erro ao atualizar dados do cliente:",error);
    res.status(error.statusCode||500).json({message:error.statusCode?error.message:"Não foi possível atualizar seus dados agora."});
  }finally{client.release();}
}

async function meusPedidos(req,res){try{const result=await query(`SELECT v.id,v.created_at,v.total,v.status_pagamento,v.status_entrega,v.forma_pagamento,v.parcelas,v.tem_entrega,CASE WHEN v.tem_entrega THEN 'entrega_local' ELSE 'retirada' END tipo_entrega,COALESCE(json_agg(json_build_object('produto',iv.produto_nome,'tamanho',iv.tamanho,'cor',iv.cor,'quantidade',iv.quantidade,'subtotal',iv.subtotal) ORDER BY iv.id) FILTER (WHERE iv.id IS NOT NULL),'[]'::json) itens FROM vendas v LEFT JOIN itens_venda iv ON iv.venda_id=v.id WHERE v.cliente_id=$1 AND v.canal_venda='site' GROUP BY v.id ORDER BY v.created_at DESC LIMIT 50`,[req.cliente.cliente_id]);res.json(result.rows.map(pedido=>({...pedido,status_entrega:pedido.status_entrega==="sem_entrega"?"pendente":pedido.status_entrega})));}catch(error){console.error("Erro ao listar pedidos do cliente:",error);res.status(500).json({message:"Não foi possível carregar seus pedidos."});}}

async function cancelarMeuPedido(req,res){
  const vendaId=Number(req.params.venda_id),clienteId=Number(req.cliente.cliente_id);
  if(!Number.isInteger(vendaId)||vendaId<=0)return res.status(400).json({message:"Pedido inválido."});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const venda=(await client.query("SELECT * FROM vendas WHERE id=$1 AND cliente_id=$2 AND canal_venda='site' FOR UPDATE",[vendaId,clienteId])).rows[0];
    if(!venda){await client.query("ROLLBACK");return res.status(404).json({message:"Pedido não encontrado na sua conta."});}
    if(venda.status_pagamento==="pago"||Number(venda.total_pago||0)>0)throw Object.assign(new Error("A compra não pode ser cancelada depois que o pagamento foi efetivado."),{statusCode:409});
    if(["cancelado","cancelada"].includes(String(venda.status_pagamento).toLowerCase())||["cancelado","cancelada"].includes(String(venda.status).toLowerCase()))throw Object.assign(new Error("Este pedido já foi cancelado."),{statusCode:409});
    const mp=(await client.query("SELECT * FROM mercado_pago_pagamentos WHERE venda_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[vendaId])).rows[0];
    if(mp?.payment_id){
      const pagamento=await consultarPagamento(mp.payment_id);
      if(String(pagamento.status).toLowerCase()==="approved")throw Object.assign(new Error("O pagamento já foi aprovado e a compra não pode mais ser cancelada."),{statusCode:409});
      if(["pending","in_process","authorized"].includes(String(pagamento.status).toLowerCase()))await cancelarPagamentoPendente(mp.payment_id);
    }
    const itens=(await client.query("SELECT produto_id,produto_variacao_id,produto_nome,quantidade FROM itens_venda WHERE venda_id=$1",[vendaId])).rows;
    for(const item of itens){
      if(item.produto_variacao_id)await client.query("UPDATE estoque SET quantidade=quantidade+$1,updated_at=NOW() WHERE produto_variacao_id=$2",[item.quantidade,item.produto_variacao_id]);
      await client.query("INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes) VALUES ($1,$2,'entrada',$3,$4,$5,$6)",[item.produto_id,item.produto_variacao_id,item.quantidade,`Cancelamento pela cliente · pedido #${vendaId}`,"Cliente",item.produto_nome]);
    }
    await client.query("UPDATE vendas SET status='cancelada',status_pagamento='cancelado',status_entrega='cancelado',updated_at=NOW() WHERE id=$1",[vendaId]);
    await client.query("UPDATE pagamentos_venda SET status='cancelado' WHERE venda_id=$1",[vendaId]);
    await client.query("UPDATE venda_entregas SET status_entrega='cancelado',updated_at=NOW() WHERE venda_id=$1",[vendaId]);
    await client.query("UPDATE mercado_pago_pagamentos SET status='cancelled',payment_status='cancelled',resultado_processamento='cancelado_pela_cliente',updated_at=NOW() WHERE venda_id=$1",[vendaId]);
    await client.query("COMMIT");
    res.json({ok:true,message:"Compra cancelada e estoque devolvido.",pedido_id:vendaId});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Erro ao cancelar pedido pela cliente:",error.message);
    res.status(error.statusCode||500).json({message:error.statusCode?error.message:"Não foi possível cancelar a compra agora."});
  }finally{client.release();}
}

async function cupomPedido(req,res){
  const vendaId=Number(req.params.venda_id);if(!Number.isInteger(vendaId)||vendaId<=0)return res.status(400).json({message:"Pedido inválido."});
  try{
    const venda=(await query(`SELECT v.*,c.nome cliente_nome,c.telefone cliente_telefone,c.email cliente_email,ve.tipo_entrega,ve.valor_frete,ve.destinatario_nome,ve.destinatario_telefone,ve.estado,ve.cidade,ve.bairro,ve.endereco,ve.numero,ve.complemento,ve.referencia FROM vendas v JOIN clientes c ON c.id=v.cliente_id LEFT JOIN venda_entregas ve ON ve.venda_id=v.id WHERE v.id=$1 AND v.cliente_id=$2 AND v.canal_venda='site' LIMIT 1`,[vendaId,req.cliente.cliente_id])).rows[0];
    if(!venda)return res.status(404).json({message:"Cupom não encontrado."});
    if(venda.status_pagamento!=="pago")return res.status(409).json({message:"O comprovante estará disponível após a confirmação do pagamento."});
    const itens=(await query(`SELECT iv.produto_nome,iv.tamanho,iv.cor,iv.quantidade,iv.preco_unitario,iv.subtotal,pv.sku,pv.codigo_interno,COALESCE(iv.codigo_ref,pv.codigo_ref) codigo_ref,COALESCE(iv.codigo_barras,pv.codigo_barras) codigo_barras FROM itens_venda iv LEFT JOIN produto_variacoes pv ON pv.id=iv.produto_variacao_id WHERE iv.venda_id=$1 ORDER BY iv.id`,[vendaId])).rows;
    const pagamentos=(await query("SELECT forma_pagamento,valor,status FROM pagamentos_venda WHERE venda_id=$1 ORDER BY id",[vendaId])).rows;
    res.json({...venda,tipo_entrega:venda.tipo_entrega||(venda.tem_entrega?"entrega_local":"retirada"),itens,pagamentos});
  }catch(error){console.error("Erro ao carregar cupom do cliente:",error);res.status(500).json({message:"Não foi possível carregar o cupom."});}
}

function listaCompraSegura(valor,limite){
  if(!Array.isArray(valor))return[];
  return valor.slice(0,limite);
}

async function comprasSalvas(req,res){
  try{
    const result=await query("SELECT carrinho,favoritos,updated_at FROM cliente_compras_salvas WHERE cliente_id=$1",[req.cliente.cliente_id]);
    const dados=result.rows[0];
    res.json({carrinho:dados?.carrinho||[],favoritos:dados?.favoritos||[],updated_at:dados?.updated_at||null,existe:Boolean(dados)});
  }catch(error){
    console.error("Erro ao carregar carrinho e favoritos:",error);
    res.status(500).json({message:"Não foi possível carregar seus itens salvos."});
  }
}

async function salvarCompras(req,res){
  const carrinho=listaCompraSegura(req.body?.carrinho,120),favoritos=listaCompraSegura(req.body?.favoritos,120);
  const tamanho=Buffer.byteLength(JSON.stringify({carrinho,favoritos}),"utf8");
  if(tamanho>750000)return res.status(413).json({message:"A lista de itens salvos excedeu o limite permitido."});
  try{
    const result=await query(`INSERT INTO cliente_compras_salvas (cliente_id,carrinho,favoritos) VALUES ($1,$2::jsonb,$3::jsonb) ON CONFLICT (cliente_id) DO UPDATE SET carrinho=EXCLUDED.carrinho,favoritos=EXCLUDED.favoritos,updated_at=NOW() RETURNING updated_at`,[req.cliente.cliente_id,JSON.stringify(carrinho),JSON.stringify(favoritos)]);
    res.json({message:"Carrinho e favoritos salvos.",updated_at:result.rows[0].updated_at});
  }catch(error){
    console.error("Erro ao salvar carrinho e favoritos:",error);
    res.status(500).json({message:"Não foi possível salvar seus itens agora."});
  }
}

async function gerarLinkPagamento(req,res){
  const vendaId=Number(req.params.venda_id);
  if(!Number.isInteger(vendaId)||vendaId<=0)return res.status(400).json({message:"Pedido inválido."});
  try{
    const venda=(await query(`SELECT id,status,status_pagamento,forma_pagamento FROM vendas WHERE id=$1 AND cliente_id=$2 AND canal_venda='site' LIMIT 1`,[vendaId,req.cliente.cliente_id])).rows[0];
    if(!venda)return res.status(404).json({message:"Pedido não encontrado na sua conta."});
    if(venda.status==="cancelada"||venda.status_pagamento==="cancelado")return res.status(409).json({message:"Pedido cancelado não pode receber link de pagamento."});
    if(venda.status_pagamento==="pago")return res.status(409).json({message:"Este pedido já está pago."});
    if(!["pendente","pending","aguardando_pagamento"].includes(String(venda.status_pagamento||"").toLowerCase()))return res.status(409).json({message:"O pagamento deste pedido não está pendente."});
    const preferencia=await criarOuObterPreferenciaVenda(vendaId);
    const url=preferencia.url_pagamento||preferencia.sandbox_init_point||preferencia.init_point;
    if(!url)return res.status(502).json({message:"O link de pagamento ainda não está disponível."});
    res.json({message:"Link de pagamento gerado.",pedido_id:vendaId,url_pagamento:url,ambiente:preferencia.ambiente,status:preferencia.status});
  }catch(error){
    if(error.statusCode)return res.status(error.statusCode).json({message:error.message});
    console.error("Erro ao gerar link de pagamento do cliente:",error);
    res.status(500).json({message:"Não foi possível gerar o link de pagamento agora."});
  }
}

const MENSAGEM_RECUPERACAO="Se este e-mail estiver cadastrado, enviaremos um código para redefinir sua senha.";
const inteiroEnv=(nome,padrao,minimo,maximo)=>{const valor=Number(process.env[nome]||padrao);return Number.isInteger(valor)&&valor>=minimo&&valor<=maximo?valor:padrao;};

async function esqueciSenha(req,res){
  const email=emailNormalizado(req.body?.email);
  if(!email||!emailValido(email))return res.status(400).json({message:"Informe um e-mail válido."});
  try{
    if(process.env.NODE_ENV==="production"&&!smtpConfigurado())return res.status(503).json({message:"Envio de e-mail ainda não configurado."});
    const cliente=(await query("SELECT id,nome,email FROM clientes WHERE LOWER(email)=$1 AND ativo=TRUE AND senha_hash IS NOT NULL LIMIT 1",[email])).rows[0];
    if(!cliente)return res.json({message:MENSAGEM_RECUPERACAO});
    const codigo=String(crypto.randomInt(0,1000000)).padStart(6,"0"),expiraMinutos=inteiroEnv("CLIENTE_RESET_SENHA_EXPIRA_MINUTOS",15,5,60),codigoHash=await bcrypt.hash(codigo,10),client=await pool.connect();
    try{await client.query("BEGIN");await client.query("UPDATE cliente_recuperacao_senha SET used_at=NOW() WHERE cliente_id=$1 AND used_at IS NULL",[cliente.id]);await client.query(`INSERT INTO cliente_recuperacao_senha (cliente_id,email,codigo_hash,expires_at,ip_solicitacao,user_agent) VALUES ($1,$2,$3,NOW()+($4::text||' minutes')::interval,$5,$6)`,[cliente.id,email,codigoHash,expiraMinutos,texto(req.ip,80)||null,texto(req.get("user-agent"),2000)||null]);await client.query("COMMIT");
      try{await enviarEmailRecuperacaoSenha({para:cliente.email,nome:cliente.nome,codigo,expiresMinutes:expiraMinutos});}catch(error){console.error("Falha segura no envio do e-mail de recuperação:",error.code||error.message);}
      res.json({message:MENSAGEM_RECUPERACAO});
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }catch(error){console.error("Erro ao preparar recuperação de senha:",error.message);res.status(500).json({message:"Não foi possível processar a solicitação agora."});}
}

async function redefinirSenha(req,res){
  const email=emailNormalizado(req.body?.email),codigo=String(req.body?.codigo||"").trim(),novaSenha=String(req.body?.novaSenha||""),confirmar=String(req.body?.confirmarSenha||"");
  if(!email||!emailValido(email))return res.status(400).json({message:"Informe um e-mail válido."});
  if(!/^\d{6}$/.test(codigo))return res.status(400).json({message:"Informe o código de 6 dígitos."});
  if(novaSenha.length<6)return res.status(400).json({message:"A nova senha deve ter pelo menos 6 caracteres."});
  if(novaSenha!==confirmar)return res.status(400).json({message:"A confirmação da nova senha não confere."});
  const limite=inteiroEnv("CLIENTE_RESET_SENHA_MAX_TENTATIVAS",5,1,10),client=await pool.connect();
  try{await client.query("BEGIN");const cliente=(await client.query("SELECT id FROM clientes WHERE LOWER(email)=$1 AND ativo=TRUE AND senha_hash IS NOT NULL FOR UPDATE",[email])).rows[0];if(!cliente)throw Object.assign(new Error("Código inválido ou expirado."),{statusCode:400});const reset=(await client.query(`SELECT * FROM cliente_recuperacao_senha WHERE cliente_id=$1 AND LOWER(email)=$2 AND used_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE`,[cliente.id,email])).rows[0];if(!reset)throw Object.assign(new Error("Código inválido ou expirado."),{statusCode:400});if(Number(reset.tentativas)>=limite){await client.query("UPDATE cliente_recuperacao_senha SET used_at=NOW() WHERE id=$1",[reset.id]);await client.query("COMMIT");return res.status(429).json({message:"Limite de tentativas atingido. Solicite um novo código."});}
    const valido=await bcrypt.compare(codigo,reset.codigo_hash);if(!valido){const tentativas=Number(reset.tentativas)+1;await client.query("UPDATE cliente_recuperacao_senha SET tentativas=$2,used_at=CASE WHEN $2 >= $3 THEN NOW() ELSE used_at END WHERE id=$1",[reset.id,tentativas,limite]);await client.query("COMMIT");return res.status(tentativas>=limite?429:400).json({message:tentativas>=limite?"Limite de tentativas atingido. Solicite um novo código.":"Código inválido ou expirado."});}
    const senhaHash=await bcrypt.hash(novaSenha,10);await client.query("UPDATE clientes SET senha_hash=$2,updated_at=NOW() WHERE id=$1",[cliente.id,senhaHash]);await client.query("UPDATE cliente_recuperacao_senha SET used_at=NOW() WHERE cliente_id=$1 AND used_at IS NULL",[cliente.id]);await client.query("COMMIT");res.json({message:"Senha redefinida com sucesso."});
  }catch(error){await client.query("ROLLBACK");res.status(error.statusCode||500).json({message:error.statusCode?error.message:"Não foi possível redefinir a senha agora."});}finally{client.release();}
}

module.exports={cadastro,login,me,atualizarMe,meusPedidos,cancelarMeuPedido,cupomPedido,comprasSalvas,salvarCompras,gerarLinkPagamento,esqueciSenha,redefinirSenha};
