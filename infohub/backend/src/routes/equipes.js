const express = require("express");
const { Op } = require("sequelize");
const { Equipe, Usuario, IntegranteEquipe, Tarefa, HistoricoEtapa, Anotacao, Entrega } = require("../models");
const router = express.Router();
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
const config = require("../services/configuracoes");
const notificacoes = require("../services/notificacoes");
router.use(autenticar);

// RN-01 / RN-02 - uma etapa so pode ser concluida com as tarefas
// obrigatorias daquela etapa aprovadas pelo administrador.
async function pendenciasDaEtapa(equipeId, etapa) {
  const tarefas = await Tarefa.findAll({ where: { equipeId, etapaRelacionada: etapa, obrigatoria: true } });
  return tarefas.filter((t) => t.status !== "aprovada").map((t) => ({ id: t.id, titulo: t.titulo, status: t.status }));
}

const includePadrao = [
  { model: Usuario, as: "lider", attributes: ["id", "nome", "email"] },
  { model: Usuario, as: "mentor", attributes: ["id", "nome", "email"] },
  { model: IntegranteEquipe, as: "integrantes", include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] }] },
];

async function carregarEquipe(id) {
  return Equipe.findByPk(id, { include: [...includePadrao, { model: Tarefa, as: "tarefas" }, { model: HistoricoEtapa, as: "historicoEtapas", order: [["alteradoEm", "DESC"]] }] });
}

router.get("/", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    let where = {};
    if (req.usuario.tipo === "mentor") where = { mentorId: req.usuario.id };
    else if (req.usuario.tipo === "aluno") where = { liderId: req.usuario.id };
    else if (req.usuario.tipo === "integrante") {
      const participacoes = await IntegranteEquipe.findAll({ where: { usuarioId: req.usuario.id }, attributes: ["equipeId"] });
      where = { id: participacoes.map((p) => p.equipeId) };
    }
    // RF-07 / RF-24 - filtros por ciclo, etapa, area, status e texto livre.
    if (req.query.ciclo) where.ciclo = req.query.ciclo;
    if (req.query.etapa) where.etapaAtual = Number(req.query.etapa);
    if (req.query.area) where.areaSetor = req.query.area;
    if (req.query.status) where.status = req.query.status;
    if (req.query.mentorId) where.mentorId = Number(req.query.mentorId);
    if (req.query.busca) {
      where[Op.or] = [
        { nomeProjeto: { [Op.iLike]: `%${req.query.busca}%` } },
        { descricaoInicial: { [Op.iLike]: `%${req.query.busca}%` } },
      ];
    }
    const equipes = await Equipe.findAll({ where, include: includePadrao, order: [["id", "ASC"]] });
    res.json(equipes);
  } catch (e) { next(e); }
});

router.get("/:id", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    const equipe = await carregarEquipe(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta equipe." });
    res.json(equipe);
  } catch (e) { next(e); }
});

router.post("/", exigirPermissao("equipes.criar"), async (req, res, next) => {
  const transaction = await Equipe.sequelize.transaction();
  try {
    let { liderId, nomeProjeto, descricaoInicial, areaSetor, estagioAtual, origemDivulgacao, mentorId, integrantes = [] } = req.body;
    if (req.usuario.tipo === "mentor") mentorId = req.usuario.id;
    if (!liderId || !nomeProjeto || !descricaoInicial || !areaSetor || !estagioAtual) {
      await transaction.rollback();
      return res.status(400).json({ erro: "liderId, nomeProjeto, descricaoInicial, areaSetor e estagioAtual são obrigatórios." });
    }
    const lider = await Usuario.findByPk(liderId, { transaction });
    if (!lider || !lider.ativo) { await transaction.rollback(); return res.status(400).json({ erro: "Líder inválido." }); }
    const mentor = mentorId ? await Usuario.findByPk(mentorId, { transaction }) : null;
    if (mentorId && (!mentor || mentor.tipo !== "mentor" || !mentor.ativo)) { await transaction.rollback(); return res.status(400).json({ erro: "Mentor inválido." }); }
    const maxIntegrantes = await config.numero("equipe.max_integrantes");
    if (Array.isArray(integrantes) && integrantes.length + 1 > maxIntegrantes) {
      await transaction.rollback();
      return res.status(400).json({ erro: `A equipe pode ter no máximo ${maxIntegrantes} integrantes, incluindo o líder.` });
    }
    const equipe = await Equipe.create({ liderId, nomeProjeto: nomeProjeto.trim(), descricaoInicial, areaSetor, estagioAtual, origemDivulgacao, mentorId: mentorId || null, ciclo: req.body.ciclo || (await config.texto("ciclo.atual")) }, { transaction });
    const rows = Array.isArray(integrantes) ? integrantes.filter((i) => i && i.nome && (i.email || i.curso)).map((i) => ({ equipeId: equipe.id, usuarioId: i.usuarioId || null, nome: i.nome, email: i.email || null, curso: i.curso || null, semestre: i.semestre || null, tipo: i.tipo === "lider" ? "lider" : "integrante" })) : [];
    if (rows.length) await IntegranteEquipe.bulkCreate(rows, { transaction });
    await transaction.commit();
    res.status(201).json(await carregarEquipe(equipe.id));
  } catch (e) { await transaction.rollback(); next(e); }
});

router.post("/:id/integrantes", exigirPermissao("equipes.editar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode editar esta equipe." });
    const { nome, email, curso, semestre, tipo = "integrante", usuarioId = null } = req.body;
    if (!nome || (!email && !curso)) return res.status(400).json({ erro: "Nome e e-mail (ou curso) são obrigatórios." });
    if (usuarioId) {
      const usuario = await Usuario.findByPk(usuarioId);
      if (!usuario || !usuario.ativo) return res.status(400).json({ erro: "Usuário inválido." });
      const existente = await IntegranteEquipe.findOne({ where: { equipeId: equipe.id, usuarioId } });
      if (existente) return res.status(409).json({ erro: "Este usuário já pertence à equipe." });
    }
    const integrante = await IntegranteEquipe.create({ equipeId: equipe.id, nome: nome.trim(), email: email ? email.trim() : null, curso: curso ? curso.trim() : null, semestre: semestre || null, tipo: tipo === "lider" ? "lider" : "integrante", usuarioId: usuarioId || null });
    res.status(201).json(integrante);
  } catch (e) { next(e); }
});

router.delete("/:id/integrantes/:integranteId", exigirPermissao("equipes.editar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode editar esta equipe." });
    const integrante = await IntegranteEquipe.findOne({ where: { id: req.params.integranteId, equipeId: equipe.id } });
    if (!integrante) return res.status(404).json({ erro: "Integrante não encontrado." });
    if (integrante.tipo === "lider" || Number(integrante.usuarioId) === Number(equipe.liderId)) return res.status(400).json({ erro: "O líder não pode ser removido por esta ação." });
    await integrante.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
});

router.patch("/:id", exigirPermissao("equipes.editar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode editar esta equipe." });
    const allowed = ["nomeProjeto", "descricaoInicial", "areaSetor", "estagioAtual", "origemDivulgacao", "status", "mentorId"];
    if (req.usuario.tipo !== "admin") allowed.splice(allowed.indexOf("mentorId"), 1);
    const data = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    if (data.mentorId !== undefined) {
      const mentor = data.mentorId === null ? null : await Usuario.findByPk(data.mentorId);
      if (data.mentorId !== null && (!mentor || mentor.tipo !== "mentor" || !mentor.ativo)) return res.status(400).json({ erro: "Mentor inválido." });
    }
    if (req.body.etapaAtual !== undefined) {
      const nova = Number(req.body.etapaAtual);
      if (!Number.isInteger(nova) || nova < 1 || nova > 6) return res.status(400).json({ erro: "A etapa deve estar entre 1 e 6." });
      const anterior = Number(equipe.etapaAtual);

      // RN-01 - ao avancar, as tarefas obrigatorias da etapa atual precisam
      // estar aprovadas. O mentor pode forcar o avanco com justificativa.
      if (nova > anterior && !req.body.forcar && (await config.booleano("jornada.exigir_tarefas_obrigatorias"))) {
        const pendencias = await pendenciasDaEtapa(equipe.id, anterior);
        if (pendencias.length) {
          return res.status(409).json({
            erro: `A etapa ${anterior} possui ${pendencias.length} tarefa(s) obrigatória(s) sem aprovação.`,
            codigo: "TAREFAS_OBRIGATORIAS_PENDENTES",
            pendencias,
          });
        }
      }
      if (nova !== anterior) {
        await HistoricoEtapa.create({
          equipeId: equipe.id,
          etapaAnterior: anterior,
          etapaNova: nova,
          alteradoPor: req.usuario.id,
          motivo: req.body.motivo || (req.body.forcar ? "Avanço manual autorizado pelo mentor." : null),
        });
      }
      data.etapaAtual = nova;
    }

    // RN-02 - "Pronta para o InovAMF" exige os entregaveis da Etapa 6.
    if (data.status === "pronta_inovamf" && !req.body.forcar) {
      const pendencias = await pendenciasDaEtapa(equipe.id, 6);
      if (pendencias.length) {
        return res.status(409).json({
          erro: "Para marcar a equipe como pronta para o InovAMF, todos os entregáveis obrigatórios da Etapa 6 precisam estar aprovados.",
          codigo: "ENTREGAVEIS_ETAPA6_PENDENTES",
          pendencias,
        });
      }
    }
    await equipe.update(data);
    if (data.status === "pronta_inovamf") {
      notificacoes.equipeProntaInovamf(equipe).catch((erro) => console.error("[EMAIL]", erro.message));
    }
    res.json(await carregarEquipe(equipe.id));
  } catch (e) { next(e); }
});

router.delete("/:id", exigirPermissao("equipes.editar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode excluir esta equipe." });
    await equipe.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// RF-10 - anotacoes internas do mentor (nunca visiveis ao aluno).
// ---------------------------------------------------------------------
function ehGestor(usuario) {
  return usuario.tipo === "admin" || usuario.tipo === "mentor";
}

router.get("/:id/anotacoes", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!ehGestor(req.usuario)) return res.status(403).json({ erro: "As anotações internas são restritas à equipe do InfoHub." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta equipe." });
    const anotacoes = await Anotacao.findAll({
      where: { equipeId: equipe.id },
      include: [{ model: Usuario, as: "autor", attributes: ["id", "nome"] }],
      order: [["criadoEm", "DESC"]],
    });
    res.json(anotacoes);
  } catch (e) { next(e); }
});

router.post("/:id/anotacoes", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!ehGestor(req.usuario)) return res.status(403).json({ erro: "Somente administradores e mentores registram anotações internas." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta equipe." });
    const texto = String(req.body.texto || "").trim();
    if (!texto) return res.status(400).json({ erro: "Escreva o conteúdo da anotação." });
    const anotacao = await Anotacao.create({ equipeId: equipe.id, autorId: req.usuario.id, texto: texto.slice(0, 4000) });
    res.status(201).json(await Anotacao.findByPk(anotacao.id, { include: [{ model: Usuario, as: "autor", attributes: ["id", "nome"] }] }));
  } catch (e) { next(e); }
});

router.delete("/:id/anotacoes/:anotacaoId", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    const anotacao = await Anotacao.findOne({ where: { id: req.params.anotacaoId, equipeId: req.params.id } });
    if (!anotacao) return res.status(404).json({ erro: "Anotação não encontrada." });
    if (!ehGestor(req.usuario) || (req.usuario.tipo !== "admin" && Number(anotacao.autorId) !== Number(req.usuario.id))) {
      return res.status(403).json({ erro: "Você só pode excluir as suas próprias anotações." });
    }
    await anotacao.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// RF-20 - lembrete manual avulso para uma equipe especifica.
// ---------------------------------------------------------------------
router.post("/:id/lembrete", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode notificar esta equipe." });
    const assunto = String(req.body.assunto || "").trim().slice(0, 120);
    const mensagem = String(req.body.mensagem || "").trim().slice(0, 4000);
    if (!assunto || !mensagem) return res.status(400).json({ erro: "Informe o assunto e a mensagem do lembrete." });
    const enviados = await notificacoes.lembreteManual({ equipe, assunto, mensagem, autor: req.usuario });
    if (!enviados) return res.status(502).json({ erro: "Nenhum e-mail pôde ser enviado. Verifique o SMTP e os destinatários da equipe." });
    res.json({ ok: true, enviados, mensagem: `Lembrete enviado para ${enviados} destinatário(s).` });
  } catch (e) { next(e); }
});

// Situacao consolidada da equipe: etapa, pendencias e entregas (RF-08).
router.get("/:id/situacao", exigirPermissao("equipes.visualizar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta equipe." });
    const tarefas = await Tarefa.findAll({ where: { equipeId: equipe.id }, include: [{ model: Entrega, as: "entregas" }], order: [["dataEntrega", "ASC"]] });
    res.json({
      etapaAtual: equipe.etapaAtual,
      status: equipe.status,
      pendenciasEtapaAtual: await pendenciasDaEtapa(equipe.id, equipe.etapaAtual),
      pendenciasEtapa6: await pendenciasDaEtapa(equipe.id, 6),
      tarefas,
    });
  } catch (e) { next(e); }
});

module.exports = router;
