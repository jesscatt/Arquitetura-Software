// =====================================================================
// Camada de notificacoes por e-mail do InfoHub.
// Cobre RF-05, RF-18, RF-19, RF-20 e RF-21 (preferencias) e registra
// cada disparo em emails_log para rastreabilidade (RNF-05 / RNF-06).
// =====================================================================
const { Usuario, Equipe, IntegranteEquipe, EmailLog } = require("../models");
const { enviarEmail, layoutInstitucional, appUrl, escapeHtml } = require("./mailer");

const TENTATIVAS = 3;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatarData(valor) {
  if (!valor) return "sem prazo definido";
  const data = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Envia com retentativa (RNF-06) e grava o resultado no log de e-mails.
async function despachar({ para, assunto, texto, html, tipo, equipeId = null, tarefaId = null }) {
  if (!para) return null;
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      await enviarEmail({ para, assunto, texto, html });
      await EmailLog.create({ destinatario: para, assunto, tipo, status: "enviado", tentativas: tentativa, equipeId, tarefaId });
      return true;
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < TENTATIVAS) await esperar(1500 * tentativa);
    }
  }
  console.error(`[EMAIL] Falha ao enviar "${assunto}" para ${para}: ${ultimoErro?.message}`);
  await EmailLog.create({
    destinatario: para,
    assunto,
    tipo,
    status: "falhou",
    erro: ultimoErro?.message?.slice(0, 500) || "erro desconhecido",
    tentativas: TENTATIVAS,
    equipeId,
    tarefaId,
  }).catch(() => {});
  return false;
}

// Destinatarios do lado do aluno: lider + integrantes que possuem conta,
// respeitando a preferencia individual de notificacao (RF-21).
async function destinatariosDaEquipe(equipeId) {
  const equipe = await Equipe.findByPk(equipeId, {
    include: [
      { model: Usuario, as: "lider", attributes: ["id", "nome", "email", "ativo", "notificacoesEmail"] },
      { model: IntegranteEquipe, as: "integrantes", include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome", "email", "ativo", "notificacoesEmail"] }] },
    ],
  });
  if (!equipe) return [];
  const pessoas = [equipe.lider, ...(equipe.integrantes || []).map((i) => i.usuario)];
  const vistos = new Set();
  return pessoas.filter((p) => {
    if (!p || !p.email || p.ativo === false || p.notificacoesEmail === false) return false;
    if (vistos.has(p.email)) return false;
    vistos.add(p.email);
    return true;
  });
}

async function administradores() {
  return Usuario.findAll({ where: { tipo: "admin", ativo: true }, attributes: ["id", "nome", "email", "notificacoesEmail"] });
}

// Admins + mentor responsavel pela equipe.
async function gestoresDaEquipe(equipe) {
  const lista = await administradores();
  if (equipe?.mentorId) {
    const mentor = await Usuario.findByPk(equipe.mentorId, { attributes: ["id", "nome", "email", "ativo", "notificacoesEmail"] });
    if (mentor?.ativo && mentor.email) lista.push(mentor);
  }
  const vistos = new Set();
  return lista.filter((p) => p.email && p.notificacoesEmail !== false && !vistos.has(p.email) && vistos.add(p.email) !== false);
}

// --- RF-05 / RF-19: nova inscricao recebida -------------------------------
async function novaInscricao({ equipe, aluno }) {
  const gestores = await administradores();
  const corpo = `<p>Uma nova ideia foi inscrita no InfoHub e entrou na <strong>Etapa 1 &mdash; Envio da ideia</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#66708a;width:150px">Projeto</td><td style="padding:6px 0"><strong>${escapeHtml(equipe.nomeProjeto)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Aluno responsavel</td><td style="padding:6px 0">${escapeHtml(aluno.nome)}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">E-mail</td><td style="padding:6px 0">${escapeHtml(aluno.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Telefone</td><td style="padding:6px 0">${escapeHtml(aluno.telefone || "nao informado")}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Curso</td><td style="padding:6px 0">${escapeHtml(aluno.curso || "nao informado")} ${escapeHtml(aluno.semestre || "")}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Area</td><td style="padding:6px 0">${escapeHtml(equipe.areaSetor)}</td></tr>
    </table>`;
  for (const gestor of gestores) {
    await despachar({
      para: gestor.email,
      assunto: `InfoHub - nova ideia inscrita: ${equipe.nomeProjeto}`,
      texto: `Nova inscricao recebida no InfoHub.\n\nProjeto: ${equipe.nomeProjeto}\nAluno: ${aluno.nome} (${aluno.email})\nArea: ${equipe.areaSetor}\n\nAcesse o painel: ${appUrl()}`,
      html: layoutInstitucional({ titulo: "Nova inscricao recebida", saudacao: `Prezado(a) ${gestor.nome},`, corpoHtml: corpo, acaoTexto: "Abrir painel do InfoHub", acaoUrl: appUrl() }),
      tipo: "nova_inscricao",
      equipeId: equipe.id,
    });
  }
}

// --- RF-18: nova tarefa atribuida ----------------------------------------
async function tarefaAtribuida(tarefa, equipe) {
  const alunos = await destinatariosDaEquipe(tarefa.equipeId);
  const corpo = `<p>Uma nova atividade foi atribuida a equipe <strong>${escapeHtml(equipe?.nomeProjeto || "")}</strong>.</p>
    <div style="background:#f6f8fb;border:1px solid #e2e7f0;border-radius:6px;padding:16px">
      <p style="margin:0 0 6px;font-size:15px"><strong>${escapeHtml(tarefa.titulo)}</strong></p>
      <p style="margin:0 0 10px;color:#4a556b">${escapeHtml(tarefa.descricao || "Sem instrucoes adicionais.")}</p>
      <p style="margin:0"><strong>Prazo de entrega:</strong> ${formatarData(tarefa.dataEntrega)}</p>
      <p style="margin:6px 0 0"><strong>Etapa:</strong> ${tarefa.etapaRelacionada} de 6${tarefa.obrigatoria ? " &middot; entrega obrigatoria" : ""}</p>
    </div>`;
  for (const aluno of alunos) {
    await despachar({
      para: aluno.email,
      assunto: `InfoHub - nova tarefa: ${tarefa.titulo}`,
      texto: `Prezado(a) ${aluno.nome},\n\nUma nova tarefa foi atribuida a sua equipe.\n\n${tarefa.titulo}\nPrazo: ${formatarData(tarefa.dataEntrega)}\n\nAcesse: ${appUrl()}`,
      html: layoutInstitucional({ titulo: "Nova tarefa atribuida", saudacao: `Prezado(a) ${aluno.nome},`, corpoHtml: corpo, acaoTexto: "Ver minhas tarefas", acaoUrl: appUrl() }),
      tipo: "tarefa_atribuida",
      equipeId: tarefa.equipeId,
      tarefaId: tarefa.id,
    });
  }
}

// --- RF-18: lembrete de prazo (antecedencia ou dia do vencimento) --------
async function lembretePrazo(tarefa, equipe, diasAntes) {
  const alunos = await destinatariosDaEquipe(tarefa.equipeId);
  const quando = diasAntes > 0 ? `faltam ${diasAntes} dia(s) para o prazo` : "o prazo termina hoje";
  const corpo = `<p>Este e um lembrete automatico: <strong>${escapeHtml(quando)}</strong> da atividade abaixo.</p>
    <div style="background:#fff8ec;border:1px solid #f0dcb8;border-radius:6px;padding:16px">
      <p style="margin:0 0 6px;font-size:15px"><strong>${escapeHtml(tarefa.titulo)}</strong></p>
      <p style="margin:0"><strong>Prazo:</strong> ${formatarData(tarefa.dataEntrega)}</p>
      <p style="margin:6px 0 0;color:#4a556b">Equipe: ${escapeHtml(equipe?.nomeProjeto || "")}</p>
    </div>`;
  for (const aluno of alunos) {
    await despachar({
      para: aluno.email,
      assunto: `InfoHub - lembrete de prazo: ${tarefa.titulo}`,
      texto: `Prezado(a) ${aluno.nome},\n\nLembrete: ${quando} da tarefa "${tarefa.titulo}".\nPrazo: ${formatarData(tarefa.dataEntrega)}\n\nAcesse: ${appUrl()}`,
      html: layoutInstitucional({ titulo: "Lembrete de prazo", saudacao: `Prezado(a) ${aluno.nome},`, corpoHtml: corpo, acaoTexto: "Enviar entrega", acaoUrl: appUrl() }),
      tipo: "lembrete_prazo",
      equipeId: tarefa.equipeId,
      tarefaId: tarefa.id,
    });
  }
}

// --- RF-18 / RF-19: prazo vencido sem entrega ----------------------------
async function prazoVencido(tarefa, equipe) {
  const alunos = await destinatariosDaEquipe(tarefa.equipeId);
  const corpo = `<p>A atividade abaixo teve o prazo encerrado sem o registro de entrega no sistema.</p>
    <div style="background:#fdf1f1;border:1px solid #f0c9c9;border-radius:6px;padding:16px">
      <p style="margin:0 0 6px;font-size:15px"><strong>${escapeHtml(tarefa.titulo)}</strong></p>
      <p style="margin:0"><strong>Prazo:</strong> ${formatarData(tarefa.dataEntrega)}</p>
    </div>
    <p>Regularize a entrega o quanto antes ou entre em contato com a equipe do InfoHub.</p>`;
  for (const aluno of alunos) {
    await despachar({
      para: aluno.email,
      assunto: `InfoHub - prazo encerrado: ${tarefa.titulo}`,
      texto: `Prezado(a) ${aluno.nome},\n\nO prazo da tarefa "${tarefa.titulo}" encerrou sem entrega registrada.\n\nAcesse: ${appUrl()}`,
      html: layoutInstitucional({ titulo: "Prazo encerrado sem entrega", saudacao: `Prezado(a) ${aluno.nome},`, corpoHtml: corpo, acaoTexto: "Regularizar entrega", acaoUrl: appUrl() }),
      tipo: "prazo_vencido",
      equipeId: tarefa.equipeId,
      tarefaId: tarefa.id,
    });
  }
  const gestores = await gestoresDaEquipe(equipe);
  for (const gestor of gestores) {
    await despachar({
      para: gestor.email,
      assunto: `InfoHub - tarefa atrasada: ${equipe?.nomeProjeto || ""}`,
      texto: `A tarefa "${tarefa.titulo}" da equipe ${equipe?.nomeProjeto || ""} esta atrasada.`,
      html: layoutInstitucional({ titulo: "Tarefa atrasada", saudacao: `Prezado(a) ${gestor.nome},`, corpoHtml: `<p>A tarefa <strong>${escapeHtml(tarefa.titulo)}</strong>, da equipe <strong>${escapeHtml(equipe?.nomeProjeto || "")}</strong>, venceu em ${formatarData(tarefa.dataEntrega)} sem entrega registrada.</p>`, acaoTexto: "Abrir painel", acaoUrl: appUrl() }),
      tipo: "tarefa_atrasada_admin",
      equipeId: tarefa.equipeId,
      tarefaId: tarefa.id,
    });
  }
}

// --- RF-19: entrega recebida ---------------------------------------------
async function entregaRecebida({ tarefa, equipe, entrega, autor }) {
  const gestores = await gestoresDaEquipe(equipe);
  const descricao = entrega.tipo === "link" ? `Link enviado: ${entrega.arquivoUrl}` : `Arquivo: ${entrega.nomeArquivo}`;
  const corpo = `<p>Uma nova entrega foi registrada e aguarda avaliacao.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#66708a;width:150px">Equipe</td><td style="padding:6px 0"><strong>${escapeHtml(equipe?.nomeProjeto || "")}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Tarefa</td><td style="padding:6px 0">${escapeHtml(tarefa.titulo)}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Enviado por</td><td style="padding:6px 0">${escapeHtml(autor?.nome || "")}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Versao</td><td style="padding:6px 0">${entrega.versao}</td></tr>
      <tr><td style="padding:6px 0;color:#66708a">Conteudo</td><td style="padding:6px 0">${escapeHtml(descricao)}</td></tr>
    </table>`;
  for (const gestor of gestores) {
    await despachar({
      para: gestor.email,
      assunto: `InfoHub - entrega recebida: ${equipe?.nomeProjeto || ""}`,
      texto: `Nova entrega da equipe ${equipe?.nomeProjeto || ""} para a tarefa "${tarefa.titulo}".\n${descricao}\n\nAcesse: ${appUrl()}`,
      html: layoutInstitucional({ titulo: "Entrega recebida", saudacao: `Prezado(a) ${gestor.nome},`, corpoHtml: corpo, acaoTexto: "Avaliar entrega", acaoUrl: appUrl() }),
      tipo: "entrega_recebida",
      equipeId: equipe?.id || null,
      tarefaId: tarefa.id,
    });
  }
}

// --- RF-18: entrega aprovada ou devolvida para ajustes -------------------
async function entregaAvaliada({ tarefa, equipe, aprovada, comentario }) {
  const alunos = await destinatariosDaEquipe(tarefa.equipeId);
  const titulo = aprovada ? "Entrega aprovada" : "Entrega devolvida para ajustes";
  const cor = aprovada ? "#eef7ef;border:1px solid #c9e3cd" : "#fff8ec;border:1px solid #f0dcb8";
  const corpo = `<p>${aprovada ? "A entrega da atividade abaixo foi aprovada pela equipe do InfoHub." : "A entrega da atividade abaixo precisa de ajustes antes da aprovacao."}</p>
    <div style="background:${cor};border-radius:6px;padding:16px">
      <p style="margin:0 0 6px;font-size:15px"><strong>${escapeHtml(tarefa.titulo)}</strong></p>
      <p style="margin:0;color:#4a556b">Equipe: ${escapeHtml(equipe?.nomeProjeto || "")}</p>
      ${comentario ? `<p style="margin:10px 0 0"><strong>Observacoes do avaliador:</strong><br>${escapeHtml(comentario)}</p>` : ""}
    </div>`;
  for (const aluno of alunos) {
    await despachar({
      para: aluno.email,
      assunto: `InfoHub - ${aprovada ? "entrega aprovada" : "ajustes solicitados"}: ${tarefa.titulo}`,
      texto: `Prezado(a) ${aluno.nome},\n\n${titulo}: ${tarefa.titulo}\n${comentario ? `Observacoes: ${comentario}\n` : ""}\nAcesse: ${appUrl()}`,
      html: layoutInstitucional({ titulo, saudacao: `Prezado(a) ${aluno.nome},`, corpoHtml: corpo, acaoTexto: "Acessar o sistema", acaoUrl: appUrl() }),
      tipo: aprovada ? "entrega_aprovada" : "entrega_ajustes",
      equipeId: tarefa.equipeId,
      tarefaId: tarefa.id,
    });
  }
}

// --- RF-20: lembrete manual avulso ---------------------------------------
async function lembreteManual({ equipe, assunto, mensagem, autor }) {
  const alunos = await destinatariosDaEquipe(equipe.id);
  if (!alunos.length) return 0;
  const corpo = `<div style="white-space:pre-line">${escapeHtml(mensagem)}</div>`;
  let enviados = 0;
  for (const aluno of alunos) {
    const ok = await despachar({
      para: aluno.email,
      assunto: `InfoHub - ${assunto}`,
      texto: `Prezado(a) ${aluno.nome},\n\n${mensagem}\n\n${autor?.nome || "Equipe InfoHub"}`,
      html: layoutInstitucional({ titulo: assunto, saudacao: `Prezado(a) ${aluno.nome},`, corpoHtml: corpo, acaoTexto: "Acessar o sistema", acaoUrl: appUrl(), rodape: `Mensagem enviada por ${autor?.nome || "equipe InfoHub"}.` }),
      tipo: "lembrete_manual",
      equipeId: equipe.id,
    });
    if (ok) enviados += 1;
  }
  return enviados;
}

// --- Equipe pronta para o InovAMF ----------------------------------------
async function equipeProntaInovamf(equipe) {
  const gestores = await administradores();
  for (const gestor of gestores) {
    await despachar({
      para: gestor.email,
      assunto: `InfoHub - equipe pronta para o InovAMF: ${equipe.nomeProjeto}`,
      texto: `A equipe ${equipe.nomeProjeto} concluiu a Etapa 6 e esta pronta para o InovAMF.`,
      html: layoutInstitucional({ titulo: "Equipe pronta para o InovAMF", saudacao: `Prezado(a) ${gestor.nome},`, corpoHtml: `<p>A equipe <strong>${escapeHtml(equipe.nomeProjeto)}</strong> concluiu a Etapa 6 com todos os entregaveis obrigatorios aprovados e foi marcada como <strong>pronta para o InovAMF</strong>.</p>`, acaoTexto: "Abrir painel", acaoUrl: appUrl() }),
      tipo: "pronta_inovamf",
      equipeId: equipe.id,
    });
  }
}

module.exports = {
  novaInscricao,
  tarefaAtribuida,
  lembretePrazo,
  prazoVencido,
  entregaRecebida,
  entregaAvaliada,
  lembreteManual,
  equipeProntaInovamf,
  destinatariosDaEquipe,
};
