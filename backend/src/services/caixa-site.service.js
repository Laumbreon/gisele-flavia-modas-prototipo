function formaCaixa(value) {
  const forma = String(value || "").toLowerCase();
  if (["pix", "dinheiro", "debito", "credito", "vale_haver", "cartao_solocard", "cartao_brasil_card", "cartao_asu"].includes(forma)) return forma;
  if (["cartao", "credit_card"].includes(forma)) return "credito";
  if (forma === "debit_card") return "debito";
  return "pix";
}

async function registrarVendaSiteNoCaixa(client, { vendaId, formaPagamento, valor, usuarioId = null, caixaId = null }) {
  const id = Number(vendaId);
  if (!Number.isInteger(id) || id <= 0) return null;
  await client.query("SELECT pg_advisory_xact_lock(82001,$1)", [id]);
  const existente = (await client.query("SELECT * FROM caixa_movimentacoes WHERE venda_id=$1 AND descricao LIKE 'Venda do site%' LIMIT 1", [id])).rows[0];
  if (existente) return existente;
  const caixa = caixaId
    ? (await client.query("SELECT id FROM caixas WHERE id=$1 AND status='aberto'", [caixaId])).rows[0]
    : (await client.query("SELECT id FROM caixas WHERE status='aberto' ORDER BY data_abertura DESC LIMIT 1")).rows[0];
  if (!caixa) return null;
  const forma = formaCaixa(formaPagamento);
  const movimento = (await client.query(
    `INSERT INTO caixa_movimentacoes (caixa_id,usuario_id,tipo,forma_pagamento,valor,descricao,venda_id)
     VALUES ($1,$2,'venda',$3,$4,$5,$6) RETURNING *`,
    [caixa.id, usuarioId, forma, Number(valor || 0), `Venda do site #${id}`, id]
  )).rows[0];
  await client.query("UPDATE vendas SET caixa_id=COALESCE(caixa_id,$2),updated_at=NOW() WHERE id=$1", [id, caixa.id]);
  await client.query("UPDATE pagamentos_venda SET caixa_id=COALESCE(caixa_id,$2) WHERE venda_id=$1 AND status='pago'", [id, caixa.id]);
  return movimento;
}

async function importarVendasSitePendentes(client, caixaId, usuarioId = null) {
  const vendas = (await client.query(
    `SELECT v.id,v.total_pago,v.total,v.forma_pagamento,
            COALESCE((SELECT pv.forma_pagamento FROM pagamentos_venda pv WHERE pv.venda_id=v.id AND pv.status='pago' ORDER BY pv.id DESC LIMIT 1),v.forma_pagamento) forma_confirmada
     FROM vendas v WHERE v.canal_venda='site' AND v.status_pagamento='pago' AND v.caixa_id IS NULL ORDER BY v.id`
  )).rows;
  for (const venda of vendas) await registrarVendaSiteNoCaixa(client, { vendaId:venda.id, formaPagamento:venda.forma_confirmada, valor:venda.total_pago || venda.total, usuarioId, caixaId });
  return vendas.length;
}

module.exports = { formaCaixa, registrarVendaSiteNoCaixa, importarVendasSitePendentes };
