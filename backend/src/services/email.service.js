const nodemailer = require("nodemailer");

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL);
}

function escapeHtml(valor) {
  return String(valor || "").replace(/[&<>"']/g, caractere => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[caractere]));
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

module.exports={smtpConfigurado,enviarEmailRecuperacaoSenha};
