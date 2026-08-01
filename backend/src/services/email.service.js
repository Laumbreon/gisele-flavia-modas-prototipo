const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

function smtpConfigurado() {
  return String(process.env.EMAIL_ENVIO_ATIVO || "false").toLowerCase() === "true"
    && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL);
}

function escapeHtml(valor) {
  return String(valor || "").replace(/[&<>"']/g, caractere => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[caractere]));
}

function gerarComprovantePdf({ nome, pedido }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size:"A4", margin:48, info:{ Title:`Comprovante de compra #${pedido.id}`, Author:"Gisele Flávia Modas", Subject:"Comprovante de compra" } });
    const chunks=[];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const moeda=valor=>Number(valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    doc.fillColor("#F80080").fontSize(22).text("Gisele Flávia Modas",{align:"center"});
    doc.fillColor("#222222").fontSize(15).text(`Comprovante de compra #${Number(pedido.id)}`,{align:"center"});
    doc.moveDown().fontSize(10).text(`Cliente: ${nome || "Consumidor não identificado"}`);
    if(pedido.tipo_entrega==="entrega_local") doc.text(`Entrega: ${[pedido.endereco,pedido.numero,pedido.bairro,pedido.cidade,pedido.estado].filter(Boolean).join(", ")}`).text(`Taxa de entrega: ${moeda(pedido.frete_valor)}`);
    else doc.text(`Retirada na loja · Telefone: ${pedido.telefone || "Não informado"}`);
    doc.moveDown().strokeColor("#F3B4D3").moveTo(48,doc.y).lineTo(547,doc.y).stroke().moveDown(.7);
    (pedido.itens||[]).forEach(item=>{
      const descricao=[item.produto_nome,[item.tamanho,item.cor].filter(Boolean).join(" / ")].filter(Boolean).join(" · ");
      doc.fontSize(10).fillColor("#222222").text(`${Number(item.quantidade)}x ${descricao}`,{continued:true}).text(moeda(item.subtotal),{align:"right"});
      doc.fontSize(8).fillColor("#666666").text(`Ref.: ${item.codigo_ref||item.codigo_interno||item.sku||"—"} · Código de barras: ${item.codigo_barras||"—"}`).moveDown(.5);
    });
    doc.moveDown().strokeColor("#F3B4D3").moveTo(48,doc.y).lineTo(547,doc.y).stroke().moveDown(.7);
    doc.fillColor("#222222").fontSize(10).text(`Subtotal: ${moeda(pedido.subtotal)}`,{align:"right"}).text(`Frete: ${moeda(pedido.frete_valor)}`,{align:"right"});
    doc.fillColor("#AD0257").fontSize(15).text(`Total: ${moeda(pedido.total)}`,{align:"right"});
    doc.moveDown(2).fillColor("#444444").fontSize(9).text("CNPJ: 11.293.505/0001-08",{align:"center"}).text("Rua Amando de Barros, 993 — Centro · CEP 18.600-050",{align:"center"}).moveDown().text("Obrigada pela preferência!",{align:"center"});
    doc.end();
  });
}

async function enviarEmailRecuperacaoSenha({ para, nome, codigo, expiresMinutes }) {
  if (!smtpConfigurado()) {
    if (process.env.NODE_ENV === "production") {
      const error = new Error("Envio de e-mail ainda não configurado.");
      error.code = "SMTP_NOT_CONFIGURED";
      throw error;
    }
    console.warn("SMTP não configurado: e-mail de recuperação não enviado no ambiente local.");
    return { enviado:false };
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: { user:process.env.SMTP_USER, pass:process.env.SMTP_PASS },
  });
  const loja=process.env.SMTP_FROM_NAME || "Gisele Flávia Modas";
  const saudacao=nome?`Olá, ${escapeHtml(nome)}!`:"Olá!";
  const html=`<!doctype html><html><body style="margin:0;background:#fff5fa;font-family:Arial,sans-serif;color:#25302b"><div style="padding:28px 12px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #f7c8df;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(31,41,55,.08)"><div style="padding:22px;background:#F80080;color:#fff;text-align:center"><strong style="font-size:22px">Gisele Flávia Modas</strong><div style="margin-top:4px;font-size:12px;letter-spacing:1.5px">BOUTIQUE FEMININA</div></div><div style="padding:28px"><h1 style="margin:0 0 18px;font-size:20px;color:#063F2B">${saudacao}</h1><p style="font-size:15px;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta.</p><div style="margin:24px 0;padding:20px;border-radius:14px;background:#fff0f8;text-align:center"><span style="display:block;margin-bottom:8px;font-size:12px;color:#6b7280">SEU CÓDIGO</span><strong style="font-size:34px;letter-spacing:8px;color:#F80080">${escapeHtml(codigo)}</strong></div><p style="font-size:14px;line-height:1.6">O código é válido por <strong>${Number(expiresMinutes)} minutos</strong> e só pode ser usado uma vez.</p><p style="font-size:13px;line-height:1.6;color:#6b7280">Se você não solicitou esta alteração, ignore esta mensagem. Sua senha continuará a mesma.</p><p style="margin-top:26px;font-size:14px">Com carinho,<br><strong>Equipe Gisele Flávia Modas</strong></p></div></div></div></body></html>`;
  await transport.sendMail({ from:{ name:loja,address:process.env.SMTP_FROM_EMAIL },to:para,subject:"Código para redefinir sua senha | Gisele Flávia Modas",html });
  return { enviado:true };
}

async function enviarEmailCupomPedido({ para, nome, pedido }) {
  if (String(process.env.EMAIL_COMPROVANTE_ATIVO || "true").toLowerCase() !== "true") return { enviado:false, motivo:"envio_comprovante_desativado" };
  if (!smtpConfigurado()) return { enviado:false, motivo:"smtp_nao_configurado" };
  const transport = nodemailer.createTransport({
    host:process.env.SMTP_HOST, port:Number(process.env.SMTP_PORT || 587),
    secure:String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS },
  });
  const loja=process.env.SMTP_FROM_NAME || "Gisele Flávia Modas";
  const moeda=valor=>Number(valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const itens=(pedido.itens||[]).map(item=>`<tr><td style="padding:9px;border-bottom:1px solid #eee"><b>${escapeHtml(item.produto_nome)}</b><br><small>${escapeHtml([item.tamanho,item.cor].filter(Boolean).join(" / "))}</small><br><small>Ref.: ${escapeHtml(item.codigo_ref||item.codigo_interno||item.sku||"—")} · Barras: ${escapeHtml(item.codigo_barras||"—")}</small></td><td style="padding:9px;text-align:center;border-bottom:1px solid #eee">${Number(item.quantidade)}</td><td style="padding:9px;text-align:right;border-bottom:1px solid #eee">${moeda(item.subtotal)}</td></tr>`).join("");
  const entrega=pedido.tipo_entrega==="entrega_local"
    ? `<p><b>Entrega:</b> ${escapeHtml([pedido.endereco,pedido.numero,pedido.bairro,pedido.cidade,pedido.estado].filter(Boolean).join(", "))}<br><b>Taxa:</b> ${moeda(pedido.frete_valor)}</p>`
    : `<p><b>Retirada na loja</b><br>Cliente: ${escapeHtml(nome)}<br>Telefone: ${escapeHtml(pedido.telefone)}</p>`;
  const html=`<!doctype html><html><body style="margin:0;background:#fff5fa;font-family:Arial,sans-serif;color:#222"><div style="max-width:620px;margin:auto;padding:24px"><div style="background:#fff;border:1px solid #f7c8df;border-radius:16px;overflow:hidden"><div style="padding:22px;background:#F80080;color:#fff;text-align:center"><b style="font-size:22px">Gisele Flávia Modas</b><div>Comprovante de compra #${Number(pedido.id)}</div></div><div style="padding:24px"><p>Olá, <b>${escapeHtml(nome)}</b>!</p><p>Seu pagamento foi confirmado. Guarde este comprovante para acompanhar a compra.</p>${entrega}<table style="width:100%;border-collapse:collapse">${itens}</table><p style="text-align:right">Subtotal: <b>${moeda(pedido.subtotal)}</b><br>Frete: <b>${moeda(pedido.frete_valor)}</b><br><span style="font-size:20px;color:#AD0257">Total: <b>${moeda(pedido.total)}</b></span></p><p style="font-size:12px;color:#666">Documento comercial sem validade fiscal.</p></div></div></div></body></html>`;
  const pdf=await gerarComprovantePdf({nome,pedido});
  const textoEmail=`Olá, ${nome || "cliente"}!\n\nSeu pagamento do pedido #${pedido.id} foi confirmado.\nTotal: ${moeda(pedido.total)}\n\nO comprovante está anexado em PDF.\n\nGisele Flávia Modas`;
  await transport.sendMail({
    from:{name:loja,address:process.env.SMTP_FROM_EMAIL},to:para,
    replyTo:process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL,
    subject:`Comprovante do pedido #${pedido.id} - Gisele Flávia Modas`,text:textoEmail,html,
    headers:{"X-Entity-Ref-ID":`pedido-${Number(pedido.id)}`},
    attachments:[{filename:`comprovante-pedido-${Number(pedido.id)}.pdf`,content:pdf,contentType:"application/pdf"}],
  });
  return {enviado:true};
}

module.exports={smtpConfigurado,enviarEmailRecuperacaoSenha,enviarEmailCupomPedido};
