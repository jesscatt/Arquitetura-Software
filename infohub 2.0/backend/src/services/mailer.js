const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST || "mailpit";
const smtpPort = Number(process.env.SMTP_PORT || 1025);
const smtpSecure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || "",
  } : undefined,
});

async function enviarConvite({ nome, email, senhaTemporaria, motivo = "sua conta foi criada" }) {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const from = process.env.MAIL_FROM || "InfoHub <no-reply@infohub.local>";
  const assunto = motivo.includes("reset") ? "InfoHub — sua senha foi redefinida" : "InfoHub — convite para acessar sua conta";

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: assunto,
    text: `Olá, ${nome}!\n\n${motivo}.\n\nAcesse o InfoHub em ${appUrl}\nE-mail: ${email}\nSenha temporária: ${senhaTemporaria}\n\nNo primeiro login, você será obrigado a criar uma nova senha.\n\nSe você não esperava este acesso, fale com o administrador do InfoHub.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">
      <h2>InfoHub</h2>
      <p>Olá, <strong>${escapeHtml(nome)}</strong>!</p>
      <p>${escapeHtml(motivo)}.</p>
      <p><a href="${appUrl}">Acessar o InfoHub</a></p>
      <p><strong>E-mail:</strong> ${escapeHtml(email)}<br><strong>Senha temporária:</strong> ${escapeHtml(senhaTemporaria)}</p>
      <p>Por segurança, no primeiro login você será obrigado a criar uma nova senha.</p>
      <p>Se você não esperava este acesso, fale com o administrador do InfoHub.</p>
    </div>`,
  });
  console.log(`[EMAIL] Convite enviado para ${email}: ${info.messageId}`);
  return info;
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function enviarEmailTeste({ email, nome = "Administrador" }) {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const from = process.env.MAIL_FROM || "InfoHub <no-reply@infohub.local>";
  return transporter.sendMail({
    from,
    to: email,
    subject: "InfoHub — teste de e-mail",
    text: `Olá, ${nome}!\n\nEste é um e-mail de teste do InfoHub. O envio SMTP está funcionando.\n\nAcessar: ${appUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>InfoHub</h2><p>Olá, <strong>${escapeHtml(nome)}</strong>!</p><p>Este é um e-mail de teste do InfoHub. O envio SMTP está funcionando.</p><p><a href="${appUrl}">Acessar o InfoHub</a></p></div>`,
  });
}

async function verificarSMTP() {
  await transporter.verify();
  console.log(`[EMAIL] SMTP disponível em ${smtpHost}:${smtpPort}`);
}

module.exports = { enviarConvite, enviarEmailTeste, verificarSMTP };
