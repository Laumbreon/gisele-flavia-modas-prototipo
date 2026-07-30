const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, query } = require("../config/db");
const { smtpConfigurado, enviarEmailRecuperacaoSenha } = require("../services/email.service");

const emailValido = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const texto = (valor, limite) => String(valor || "").trim().slice(0, limite);
const emailNormalizado = valor => texto(valor, 160).toLowerCase();
const clienteSeguro = cliente => ({ id:cliente.id,nome:cliente.nome,email:cliente.email,telefone:cliente.telefone,cpf:cliente.cpf,ativo:cliente.ativo,email_verificado:cliente.email_verificado === true });
const jwtSecret = () => process.env.JWT_SECRET || "dev_secret_altere_no_env";
const gerarToken = cliente => jwt.sign({ tipo:"cliente",cliente_id:Number(cliente.id),email:cliente.email },jwtSecret(),{ expiresIn:process.env.CLIENTE_JWT_EXPIRES_IN || "30d" });

async function cadastro(req,res){
  const nome=texto(req.body?.nome,120),email=emailNormalizado(req.body?.email),telefone=texto(req.body?.telefone,30),cpf=texto(req.body?.cpf,20)||null,senha=String(req.body?.senha||""),confirmar=req.body?.confirmarSenha;
  if(!nome||!email||!telefone||!senha)return res.status(400).json({message:"Nome, e-mail, telefone e senha são obrigatórios."});
  if(!emailValido(email))return res.status(400).json({message:"Informe um e-mail válido."});
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

async function meusPedidos(req,res){try{const result=await query(`SELECT v.id,v.created_at,v.total,v.status_pagamento,v.status_entrega,v.forma_pagamento,v.tem_entrega,COALESCE(json_agg(json_build_object('produto',iv.produto_nome,'tamanho',iv.tamanho,'cor',iv.cor,'quantidade',iv.quantidade,'subtotal',iv.subtotal) ORDER BY iv.id) FILTER (WHERE iv.id IS NOT NULL),'[]'::json) itens FROM vendas v LEFT JOIN itens_venda iv ON iv.venda_id=v.id WHERE v.cliente_id=$1 AND v.canal_venda='site' GROUP BY v.id ORDER BY v.created_at DESC LIMIT 50`,[req.cliente.cliente_id]);res.json(result.rows);}catch(error){console.error("Erro ao listar pedidos do cliente:",error);res.status(500).json({message:"Não foi possível carregar seus pedidos."});}}

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

module.exports={cadastro,login,me,meusPedidos,esqueciSenha,redefinirSenha};
