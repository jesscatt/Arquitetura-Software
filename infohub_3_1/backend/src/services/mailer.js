const nodemailer = require("nodemailer");

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "sim"].includes(String(value).toLowerCase());
}

function smtpConfig() {
  const provider = String(process.env.SMTP_PROVIDER || "custom").toLowerCase();
  const presets = {
    gmail: { host: "smtp.gmail.com", port: 587, secure: false },
    outlook: { host: "smtp.office365.com", port: 587, secure: false },
    microsoft: { host: "smtp.office365.com", port: 587, secure: false },
    hotmail: { host: "smtp.office365.com", port: 587, secure: false },
  };
  const preset = presets[provider];
  const host = process.env.SMTP_HOST || preset?.host || "mailpit";
  const port = Number(process.env.SMTP_PORT || preset?.port || 1025);
  const secure = boolEnv(process.env.SMTP_SECURE, preset?.secure ?? false);
  return { provider, host, port, secure };
}

const config = smtpConfig();
const hasAuth = Boolean(process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  requireTLS: !config.secure && config.port === 587,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: hasAuth ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || "",
  } : undefined,
});

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "InfoHub <no-reply@infohub.local>";
}

function loginUrl(email) {
  const url = new URL(appUrl());
  url.searchParams.set("email", email);
  return url.toString();
}

async function enviarConvite({ nome, email, senhaTemporaria, motivo = "sua conta foi criada" }) {
  const url = loginUrl(email);
  const assunto = motivo.toLowerCase().includes("reset")
    ? "InfoHub — sua senha foi redefinida"
    : "InfoHub — seu acesso foi criado";

  const info = await transporter.sendMail({
    from: mailFrom(),
    to: email,
    subject: assunto,
    text: `Olá, ${nome}!\n\n${motivo}.\n\nAcesse o InfoHub: ${url}\n\nE-mail: ${email}\nSenha temporária: ${senhaTemporaria}\n\nNo primeiro acesso, você será obrigado a criar uma nova senha.\n\nSe você não esperava este acesso, fale com o administrador do InfoHub.`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e6eaf0;border-radius:16px;overflow:hidden"><div style="padding:28px 32px;background:#172033;color:#fff"><h1 style="margin:0;font-size:24px">InfoHub</h1><p style="margin:8px 0 0;opacity:.85">Acesso à plataforma</p></div><div style="padding:32px"><p>Olá, <strong>${escapeHtml(nome)}</strong>!</p><p>${escapeHtml(motivo)}.</p><div style="margin:24px 0;text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;background:#172033;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold">Acessar o InfoHub</a></div><div style="background:#f5f7fb;border-radius:12px;padding:18px"><p style="margin:0 0 8px"><strong>E-mail:</strong> ${escapeHtml(email)}</p><p style="margin:0"><strong>Senha temporária:</strong> <span style="font-family:monospace">${escapeHtml(senhaTemporaria)}</span></p></div><p>Por segurança, no primeiro acesso você será obrigado a criar uma nova senha.</p><p style="font-size:13px;color:#697386">Se você não esperava este acesso, fale com o administrador do InfoHub.</p></div></div></body></html>`,
  });
  console.log(`[EMAIL] Convite enviado para ${email}: ${info.messageId}`);
  return info;
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function resetUrl(token) {
  const url = new URL(appUrl());
  url.searchParams.set("reset", token);
  return url.toString();
}

async function enviarLinkResetSenha({ nome, email, token }) {
  const url = resetUrl(token);
  return transporter.sendMail({
    from: mailFrom(),
    to: email,
    subject: "InfoHub — redefinição de senha",
    text: `Olá, ${nome}!\n\nRecebemos uma solicitação para redefinir sua senha do InfoHub.\n\nAcesse este link para criar uma nova senha: ${url}\n\nO link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:32px auto;padding:32px;border:1px solid #e6eaf0;border-radius:16px"><h1>InfoHub</h1><p>Olá, <strong>${escapeHtml(nome)}</strong>!</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#172033;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold">Criar nova senha</a></p><p>Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.</p></div></body></html>`,
  });
}

async function enviarEmailTeste({ email, nome = "Administrador" }) {
  const url = loginUrl(email);
  return transporter.sendMail({
    from: mailFrom(),
    to: email,
    subject: "InfoHub — teste de e-mail",
    text: `Olá, ${nome}!\n\nO envio SMTP do InfoHub está funcionando.\n\nAcessar: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:32px auto"><h2>InfoHub</h2><p>Olá, <strong>${escapeHtml(nome)}</strong>!</p><p>O envio SMTP do InfoHub está funcionando.</p><p><a href="${escapeHtml(url)}">Acessar o InfoHub</a></p></div>`,
  });
}

async function verificarSMTP() {
  await transporter.verify();
  console.log(`[EMAIL] SMTP disponível em ${config.host}:${config.port} (${config.provider})`);
}

// ---------------------------------------------------------------------
// Envio generico com layout institucional padrao do InfoHub.
// Usado por services/notificacoes.js para todos os avisos da jornada.
// ---------------------------------------------------------------------
function layoutInstitucional({ titulo, saudacao, corpoHtml, acaoTexto, acaoUrl, rodape }) {
  const botao = acaoUrl
    ? `<div style="margin:28px 0"><a href="${escapeHtml(acaoUrl)}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:bold;font-size:14px">${escapeHtml(acaoTexto || "Acessar o sistema")}</a></div>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f3f7;font-family:Arial,Helvetica,sans-serif;color:#1c2536">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #dde2ea;border-radius:8px;overflow:hidden">
    <div style="padding:22px 32px;background:#172033;color:#ffffff">
      <p style="margin:0;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;opacity:.75">Faculdade Antonio Meneghetti</p>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600">InfoHub &mdash; ${escapeHtml(titulo)}</h1>
    </div>
    <div style="padding:32px;font-size:14px;line-height:1.6">
      <p style="margin:0 0 16px">${escapeHtml(saudacao)}</p>
      ${corpoHtml}
      ${botao}
      <p style="margin:24px 0 0;font-size:12px;color:#66708a;border-top:1px solid #e6eaf0;padding-top:16px">${escapeHtml(rodape || "Mensagem automatica do sistema InfoHub. Nao responda a este e-mail.")}</p>
    </div>
  </div></body></html>`;
}

async function enviarEmail({ para, assunto, texto, html }) {
  return transporter.sendMail({ from: mailFrom(), to: para, subject: assunto, text: texto, html });
}

module.exports = { enviarConvite, enviarLinkResetSenha, enviarEmailTeste, verificarSMTP, enviarEmail, layoutInstitucional, appUrl, escapeHtml };
