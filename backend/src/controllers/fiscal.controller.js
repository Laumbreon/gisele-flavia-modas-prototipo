const { pool } = require("../config/db");

const text = value => { const result=String(value ?? "").trim(); return result || null; };
const numberOrNull = value => value === "" || value === null || value === undefined ? null : Number(value);
const bool = value => value === true || value === "true" || value === 1;
const validId = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

async function obterConfig(req,res) {
  try { const result=await pool.query("SELECT * FROM configuracoes_fiscais_empresa ORDER BY id LIMIT 1"); res.json(result.rows[0] || null); }
  catch(error){ console.error("Erro ao buscar configuração fiscal:",error); res.status(500).json({message:"Não foi possível carregar a configuração fiscal."}); }
}

async function salvarConfig(req,res) {
  const b=req.body||{};
  const ambiente=["homologacao","producao"].includes(b.ambiente_fiscal)?b.ambiente_fiscal:"homologacao";
  const values=[text(b.razao_social),text(b.nome_fantasia),text(b.cnpj),text(b.inscricao_estadual),text(b.inscricao_municipal),text(b.regime_tributario),text(b.crt),text(b.estado)?.toUpperCase(),text(b.cidade),text(b.cep),text(b.endereco),text(b.numero),text(b.bairro),text(b.complemento),ambiente,text(b.provedor_fiscal),bool(b.emitir_nfce),bool(b.emitir_nfe),numberOrNull(b.serie_nfce),numberOrNull(b.serie_nfe),numberOrNull(b.proximo_numero_nfce),numberOrNull(b.proximo_numero_nfe),text(b.csc_id),text(b.csc_hash),text(b.observacoes)];
  try {
    const result=await pool.query(`INSERT INTO configuracoes_fiscais_empresa (id,razao_social,nome_fantasia,cnpj,inscricao_estadual,inscricao_municipal,regime_tributario,crt,estado,cidade,cep,endereco,numero,bairro,complemento,ambiente_fiscal,provedor_fiscal,emitir_nfce,emitir_nfe,serie_nfce,serie_nfe,proximo_numero_nfce,proximo_numero_nfe,csc_id,csc_hash,observacoes)
      VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      ON CONFLICT (id) DO UPDATE SET razao_social=$1,nome_fantasia=$2,cnpj=$3,inscricao_estadual=$4,inscricao_municipal=$5,regime_tributario=$6,crt=$7,estado=$8,cidade=$9,cep=$10,endereco=$11,numero=$12,bairro=$13,complemento=$14,ambiente_fiscal=$15,provedor_fiscal=$16,emitir_nfce=$17,emitir_nfe=$18,serie_nfce=$19,serie_nfe=$20,proximo_numero_nfce=$21,proximo_numero_nfe=$22,csc_id=$23,csc_hash=$24,observacoes=$25,updated_at=NOW() RETURNING *`,values);
    res.json(result.rows[0]);
  } catch(error){ console.error("Erro ao salvar configuração fiscal:",error); res.status(500).json({message:"Não foi possível salvar a configuração fiscal."}); }
}

async function listarProdutos(req,res) {
  try { const result=await pool.query(`SELECT p.id produto_id,p.nome produto,p.categoria,pv.id produto_variacao_id,pv.tamanho,pv.cor,pv.sku,pv.codigo_barras,pv.codigo_interno,
      COALESCE(pfv.id,pfb.id) fiscal_id,COALESCE(pfv.ncm,pfb.ncm) ncm,COALESCE(pfv.cest,pfb.cest) cest,COALESCE(pfv.cfop,pfb.cfop) cfop,COALESCE(pfv.origem,pfb.origem) origem,
      COALESCE(pfv.unidade_comercial,pfb.unidade_comercial,'UN') unidade_comercial,COALESCE(pfv.csosn,pfb.csosn) csosn,COALESCE(pfv.cst_icms,pfb.cst_icms) cst_icms,
      COALESCE(pfv.cst_pis,pfb.cst_pis) cst_pis,COALESCE(pfv.cst_cofins,pfb.cst_cofins) cst_cofins,
      CASE WHEN COALESCE(pfv.ncm,pfb.ncm) IS NOT NULL AND COALESCE(pfv.cfop,pfb.cfop) IS NOT NULL AND (COALESCE(pfv.csosn,pfb.csosn) IS NOT NULL OR COALESCE(pfv.cst_icms,pfb.cst_icms) IS NOT NULL) THEN 'completo' ELSE 'incompleto' END status_fiscal
      FROM produtos p LEFT JOIN produto_variacoes pv ON pv.produto_id=p.id AND pv.ativo=TRUE
      LEFT JOIN produto_fiscal pfb ON pfb.produto_id=p.id AND pfb.produto_variacao_id IS NULL AND pfb.ativo=TRUE
      LEFT JOIN produto_fiscal pfv ON pfv.produto_id=p.id AND pfv.produto_variacao_id=pv.id AND pfv.ativo=TRUE
      ORDER BY p.nome,pv.tamanho,pv.cor`); res.json(result.rows); }
  catch(error){ console.error("Erro ao listar fiscal de produtos:",error); res.status(500).json({message:"Não foi possível carregar os dados fiscais dos produtos."}); }
}

async function obterProduto(req,res) {
  const id=validId(req.params.produto_id); if(!id)return res.status(400).json({message:"Produto inválido."});
  try { const result=await pool.query("SELECT * FROM produto_fiscal WHERE produto_id=$1 AND ativo=TRUE ORDER BY produto_variacao_id NULLS FIRST",[id]); res.json(result.rows); }
  catch(error){ res.status(500).json({message:"Não foi possível carregar o fiscal do produto."}); }
}

async function salvarProduto(req,res) {
  const produtoId=validId(req.params.produto_id), variacaoId=validId(req.body.produto_variacao_id);
  if(!produtoId)return res.status(400).json({message:"Produto inválido."});
  const b=req.body||{}, values=[produtoId,variacaoId,text(b.ncm),text(b.cest),text(b.cfop),text(b.origem),text(b.unidade_comercial)||"UN",text(b.csosn),text(b.cst_icms),text(b.cst_pis),text(b.cst_cofins),Number(b.aliquota_icms||0),Number(b.aliquota_pis||0),Number(b.aliquota_cofins||0),text(b.codigo_beneficio_fiscal),b.ativo!==false];
  const client=await pool.connect();
  try { await client.query("BEGIN"); const existing=await client.query("SELECT id FROM produto_fiscal WHERE produto_id=$1 AND produto_variacao_id IS NOT DISTINCT FROM $2 FOR UPDATE",[produtoId,variacaoId]);
    const query=existing.rows[0]?`UPDATE produto_fiscal SET ncm=$3,cest=$4,cfop=$5,origem=$6,unidade_comercial=$7,csosn=$8,cst_icms=$9,cst_pis=$10,cst_cofins=$11,aliquota_icms=$12,aliquota_pis=$13,aliquota_cofins=$14,codigo_beneficio_fiscal=$15,ativo=$16,updated_at=NOW() WHERE id=${Number(existing.rows[0]?.id)} RETURNING *`:`INSERT INTO produto_fiscal (produto_id,produto_variacao_id,ncm,cest,cfop,origem,unidade_comercial,csosn,cst_icms,cst_pis,cst_cofins,aliquota_icms,aliquota_pis,aliquota_cofins,codigo_beneficio_fiscal,ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`;
    const result=await client.query(query,values); await client.query("COMMIT"); res.json(result.rows[0]);
  } catch(error){ await client.query("ROLLBACK"); console.error("Erro ao salvar fiscal do produto:",error); res.status(500).json({message:"Não foi possível salvar os dados fiscais."}); } finally{client.release();}
}

async function listarDocumentos(req,res){try{const result=await pool.query(`SELECT d.id,d.venda_id,d.tipo_documento,d.status,d.ambiente,d.serie,d.numero,d.mensagem_erro,d.created_at,d.updated_at,v.total,v.canal_venda FROM documentos_fiscais d JOIN vendas v ON v.id=d.venda_id ORDER BY d.created_at DESC LIMIT 200`);res.json(result.rows);}catch(error){res.status(500).json({message:"Não foi possível carregar os documentos fiscais."});}}
async function obterDocumento(req,res){const id=validId(req.params.id);if(!id)return res.status(400).json({message:"Documento inválido."});try{const result=await pool.query(`SELECT d.*,v.total,v.canal_venda FROM documentos_fiscais d JOIN vendas v ON v.id=d.venda_id WHERE d.id=$1`,[id]);if(!result.rows[0])return res.status(404).json({message:"Documento não encontrado."});res.json(result.rows[0]);}catch(error){res.status(500).json({message:"Não foi possível carregar o documento fiscal."});}}

async function prepararVenda(req,res){const vendaId=validId(req.params.venda_id);if(!vendaId)return res.status(400).json({message:"Venda inválida."});const client=await pool.connect();try{await client.query("BEGIN");
  const vendaResult=await client.query(`SELECT v.*,c.nome cliente,c.cpf,c.telefone,c.email FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.id=$1 FOR UPDATE OF v`,[vendaId]);const venda=vendaResult.rows[0];if(!venda)throw Object.assign(new Error("Venda não encontrada."),{statusCode:404});
  const active=await client.query("SELECT id FROM documentos_fiscais WHERE venda_id=$1 AND status<>'cancelado'",[vendaId]);if(active.rows[0])throw Object.assign(new Error("Esta venda já possui documento fiscal ativo."),{statusCode:409});
  const empresa=(await client.query("SELECT * FROM configuracoes_fiscais_empresa ORDER BY id LIMIT 1")).rows[0]||{};
  const itens=(await client.query(`SELECT iv.*,jsonb_build_object('ncm',pf.ncm,'cest',pf.cest,'cfop',pf.cfop,'origem',pf.origem,'unidade_comercial',pf.unidade_comercial,'csosn',pf.csosn,'cst_icms',pf.cst_icms,'cst_pis',pf.cst_pis,'cst_cofins',pf.cst_cofins,'aliquota_icms',pf.aliquota_icms,'aliquota_pis',pf.aliquota_pis,'aliquota_cofins',pf.aliquota_cofins) fiscal FROM itens_venda iv LEFT JOIN LATERAL (SELECT * FROM produto_fiscal WHERE produto_id=iv.produto_id AND ativo=TRUE AND (produto_variacao_id=iv.produto_variacao_id OR produto_variacao_id IS NULL) ORDER BY (produto_variacao_id IS NOT NULL) DESC LIMIT 1) pf ON TRUE WHERE iv.venda_id=$1 ORDER BY iv.id`,[vendaId])).rows;
  const pagamentos=(await client.query("SELECT forma_pagamento,valor,status FROM pagamentos_venda WHERE venda_id=$1 ORDER BY id",[vendaId])).rows;
  const alertas=[];if(!empresa.cnpj||!empresa.inscricao_estadual)alertas.push("Informe CNPJ e inscrição estadual da empresa.");if(!empresa.regime_tributario||!empresa.crt)alertas.push("Informe regime tributário e CRT.");if(!empresa.endereco||!empresa.numero||!empresa.bairro||!empresa.cidade||!empresa.estado)alertas.push("Complete o endereço fiscal da empresa.");
  itens.forEach(item=>{const f=item.fiscal||{};if(!f.ncm)alertas.push(`${item.produto_nome}: NCM não informado.`);if(!f.cfop)alertas.push(`${item.produto_nome}: CFOP não informado.`);if(!f.csosn&&!f.cst_icms)alertas.push(`${item.produto_nome}: CSOSN/CST não informado.`);if(!f.unidade_comercial)alertas.push(`${item.produto_nome}: unidade comercial não informada.`);});
  const payload={versao:"preparacao-v1",sem_emissao:true,alertas:[...new Set(alertas)],empresa,venda,cliente:{nome:venda.cliente,cpf:venda.cpf,cnpj:null,telefone:venda.telefone,email:venda.email},itens,pagamentos,totais:{subtotal:venda.subtotal,desconto:venda.desconto,frete:venda.frete_valor,total:venda.total}};
  const result=await client.query(`INSERT INTO documentos_fiscais (venda_id,tipo_documento,status,ambiente,serie,numero,payload_json) VALUES ($1,'nfce','rascunho',$2,$3,$4,$5) RETURNING *`,[vendaId,empresa.ambiente_fiscal||"homologacao",empresa.serie_nfce||null,empresa.proximo_numero_nfce||null,payload]);await client.query("COMMIT");res.status(201).json(result.rows[0]);
 }catch(error){await client.query("ROLLBACK");if(error.statusCode)return res.status(error.statusCode).json({message:error.message});console.error("Erro ao preparar documento fiscal:",error);res.status(500).json({message:"Não foi possível preparar o documento fiscal."});}finally{client.release();}}

async function alterarStatus(id,status,mensagem,res){try{const result=await pool.query("UPDATE documentos_fiscais SET status=$2,mensagem_erro=$3,updated_at=NOW() WHERE id=$1 AND status IN ('rascunho','erro','pronto') RETURNING *",[id,status,mensagem]);if(!result.rows[0])return res.status(404).json({message:"Documento não encontrado ou status incompatível."});res.json(result.rows[0]);}catch(error){res.status(500).json({message:"Não foi possível atualizar o documento fiscal."});}}
function marcarPronto(req,res){const id=validId(req.params.id);if(!id)return res.status(400).json({message:"Documento inválido."});return alterarStatus(id,"pronto",null,res);}
function marcarErro(req,res){const id=validId(req.params.id);if(!id)return res.status(400).json({message:"Documento inválido."});return alterarStatus(id,"erro",text(req.body.mensagem_erro)||"Erro registrado manualmente.",res);}

module.exports={obterConfig,salvarConfig,listarProdutos,obterProduto,salvarProduto,listarDocumentos,obterDocumento,prepararVenda,marcarPronto,marcarErro};
