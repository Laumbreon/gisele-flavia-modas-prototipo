const { pool } = require("../config/db");

function erroValidacao(message) { const error = new Error(message); error.statusCode = 400; return error; }
function texto(value) { const result = String(value || "").trim(); return result || null; }
function dinheiro(value) { return Math.round(Number(value || 0) * 100) / 100; }

async function checkoutPublico(req, res) {
  const cliente = req.body.cliente || {};
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const tipoEntrega = req.body.tipo_entrega === "entrega_local" ? "entrega_local" : "retirada";
  const entrega = req.body.entrega || {};
  const formaPagamento = ["pix", "dinheiro", "cartao"].includes(req.body.forma_pagamento) ? req.body.forma_pagamento : null;

  if (!texto(cliente.nome) || !texto(cliente.telefone)) return res.status(400).json({ message: "Nome e telefone são obrigatórios." });
  if (!itens.length) return res.status(400).json({ message: "Adicione ao menos um item ao pedido." });
  if (!formaPagamento) return res.status(400).json({ message: "Selecione uma forma de pagamento válida." });
  if (tipoEntrega === "entrega_local" && (!texto(entrega.bairro) || !texto(entrega.cidade) || !texto(entrega.endereco) || !texto(entrega.numero))) {
    return res.status(400).json({ message: "Preencha os dados obrigatórios da entrega." });
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
    const existente = await client.query(`SELECT id FROM clientes WHERE telefone = $1 OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2)) ORDER BY id LIMIT 1`, [texto(cliente.telefone), texto(cliente.email)]);
    if (existente.rows[0]) {
      clienteId = existente.rows[0].id;
      await client.query(`UPDATE clientes SET nome=$1, telefone=$2, whatsapp=$2, email=COALESCE($3,email), updated_at=NOW() WHERE id=$4`, [texto(cliente.nome), texto(cliente.telefone), texto(cliente.email), clienteId]);
    } else {
      const criado = await client.query(`INSERT INTO clientes (nome,telefone,whatsapp,email,ativo) VALUES ($1,$2,$2,$3,TRUE) RETURNING id`, [texto(cliente.nome), texto(cliente.telefone), texto(cliente.email)]);
      clienteId = criado.rows[0].id;
    }

    let subtotal = 0;
    const processados = [];
    for (const item of itensAgrupados) {
      const produtoId = Number(item.produto_id), variacaoId = Number(item.variacao_id), quantidade = Number(item.quantidade);
      if (!Number.isInteger(produtoId) || !Number.isInteger(variacaoId) || !Number.isInteger(quantidade) || quantidade <= 0) throw erroValidacao("Item ou quantidade inválida.");
      const result = await client.query(`SELECT p.id produto_id,p.nome produto_nome,p.preco produto_preco,p.preco_promocional produto_promocional,pv.id variacao_id,pv.tamanho,pv.cor,pv.preco_venda,pv.preco_promocional,e.quantidade estoque FROM produto_variacoes pv JOIN produtos p ON p.id=pv.produto_id JOIN estoque e ON e.produto_variacao_id=pv.id WHERE p.id=$1 AND pv.id=$2 AND p.status='ativo' AND pv.ativo=TRUE FOR UPDATE OF e`, [produtoId, variacaoId]);
      const row = result.rows[0];
      if (!row) throw erroValidacao("Produto ou variação não encontrado.");
      if (Number(row.estoque) < quantidade) throw erroValidacao(`Estoque insuficiente para ${row.produto_nome} (${row.tamanho}/${row.cor}).`);
      const preco = dinheiro(row.preco_promocional ?? row.preco_venda ?? row.produto_promocional ?? row.produto_preco);
      subtotal = dinheiro(subtotal + preco * quantidade);
      processados.push({ ...row, quantidade, preco, subtotal: dinheiro(preco * quantidade) });
    }

    let frete = 0;
    if (tipoEntrega === "entrega_local") {
      const result = await client.query(`SELECT valor,prazo_estimado FROM fretes_bairro WHERE ativo=TRUE AND LOWER(bairro)=LOWER($1) AND LOWER(cidade)=LOWER($2) AND LOWER(estado)=LOWER($3) LIMIT 1`, [texto(entrega.bairro), texto(entrega.cidade), texto(entrega.estado) || "SP"]);
      if (!result.rows[0]) throw erroValidacao("Este bairro ainda não é atendido para entrega local.");
      frete = dinheiro(result.rows[0].valor);
    }
    const total = dinheiro(subtotal + frete);
    const venda = await client.query(`INSERT INTO vendas (cliente_id,usuario_id,subtotal,desconto,frete_valor,total,total_pago,troco,valor_faltante,forma_pagamento,canal_venda,origem_venda,tem_entrega,status_pagamento,status_entrega,caixa_id,maquininha_id,status,observacoes) VALUES ($1,NULL,$2,0,$3,$4,0,0,$4,$5,'site','checkout_publico',$6,'pendente',$7,NULL,NULL,'pendente',$8) RETURNING id,total,status_pagamento`, [clienteId,subtotal,frete,total,formaPagamento,tipoEntrega === "entrega_local",tipoEntrega === "entrega_local" ? "pendente" : "sem_entrega",texto(req.body.observacoes)]);
    const vendaId = venda.rows[0].id;
    for (const item of processados) {
      await client.query(`INSERT INTO itens_venda (venda_id,produto_id,produto_variacao_id,produto_nome,tamanho,cor,quantidade,preco_unitario,subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [vendaId,item.produto_id,item.variacao_id,item.produto_nome,item.tamanho,item.cor,item.quantidade,item.preco,item.subtotal]);
      await client.query(`UPDATE estoque SET quantidade=quantidade-$1,updated_at=NOW() WHERE produto_variacao_id=$2`, [item.quantidade,item.variacao_id]);
      await client.query(`INSERT INTO movimentacoes_estoque (produto_id,produto_variacao_id,tipo,quantidade,motivo,responsavel,observacoes) VALUES ($1,$2,'saida',$3,'Pedido pelo site','Checkout público',$4)`, [item.produto_id,item.variacao_id,item.quantidade,`Venda #${vendaId}`]);
    }
    if (tipoEntrega === "entrega_local") {
      await client.query(`INSERT INTO venda_entregas (venda_id,tipo_entrega,status_entrega,valor_frete,destinatario_nome,destinatario_telefone,estado,cidade,bairro,endereco,numero,complemento,referencia,observacoes) VALUES ($1,'entrega_local','pendente',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [vendaId,frete,texto(entrega.destinatario_nome)||texto(cliente.nome),texto(entrega.destinatario_telefone)||texto(cliente.telefone),texto(entrega.estado)||"SP",texto(entrega.cidade),texto(entrega.bairro),texto(entrega.endereco),texto(entrega.numero),texto(entrega.complemento),texto(entrega.referencia),texto(req.body.observacoes)]);
    }
    await client.query("COMMIT");
    res.status(201).json({ ok:true,venda_id:vendaId,total,status_pagamento:"pendente",mensagem:"Pedido recebido com sucesso." });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.statusCode === 400) return res.status(400).json({ message:error.message });
    console.error("Erro no checkout público:", error);
    res.status(500).json({ message:"Não foi possível receber o pedido agora." });
  } finally { client.release(); }
}

module.exports = { checkoutPublico };
