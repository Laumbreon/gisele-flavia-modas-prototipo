const { pool } = require("../config/db");
const { enviarEmailCupomPedido } = require("./email.service");

async function enviarComprovanteVendaPaga(vendaId) {
  const id = Number(vendaId);
  if (!Number.isInteger(id) || id <= 0) return { enviado:false, motivo:"venda_invalida" };

  const claim = await pool.query(
    `UPDATE vendas SET comprovante_enviado_em=NOW(),updated_at=NOW()
     WHERE id=$1 AND canal_venda='site' AND status_pagamento='pago' AND comprovante_enviado_em IS NULL
     RETURNING id`,
    [id]
  );
  if (!claim.rows[0]) return { enviado:false, motivo:"indisponivel_ou_ja_enviado" };

  try {
    const venda = (await pool.query(
      `SELECT v.*,c.nome,c.email,c.telefone,ve.tipo_entrega,ve.estado,ve.cidade,ve.bairro,ve.endereco,ve.numero
       FROM vendas v JOIN clientes c ON c.id=v.cliente_id
       LEFT JOIN venda_entregas ve ON ve.venda_id=v.id
       WHERE v.id=$1 LIMIT 1`,
      [id]
    )).rows[0];
    if (!venda?.email) return { enviado:false, motivo:"cliente_sem_email" };
    const itens = (await pool.query(
      `SELECT iv.*,pv.sku,pv.codigo_interno,COALESCE(iv.codigo_ref,pv.codigo_ref) codigo_ref,
              COALESCE(iv.codigo_barras,pv.codigo_barras) codigo_barras
       FROM itens_venda iv LEFT JOIN produto_variacoes pv ON pv.id=iv.produto_variacao_id
       WHERE iv.venda_id=$1 ORDER BY iv.id`,
      [id]
    )).rows;
    const resultado = await enviarEmailCupomPedido({
      para:venda.email,
      nome:venda.nome,
      pedido:{...venda,itens,id:venda.id,frete_valor:venda.frete_valor,tipo_entrega:venda.tipo_entrega||(venda.tem_entrega?"entrega_local":"retirada")},
    });
    if (!resultado.enviado) await pool.query("UPDATE vendas SET comprovante_enviado_em=NULL WHERE id=$1", [id]);
    return resultado;
  } catch (error) {
    await pool.query("UPDATE vendas SET comprovante_enviado_em=NULL WHERE id=$1", [id]).catch(() => {});
    console.error(`Falha ao enviar comprovante da venda #${id}:`, error.code || error.message);
    return { enviado:false, motivo:"falha_envio" };
  }
}

module.exports = { enviarComprovanteVendaPaga };

