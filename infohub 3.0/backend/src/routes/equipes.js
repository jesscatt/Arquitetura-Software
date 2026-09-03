const express = require("express");
const { Equipe, Usuario, IntegranteEquipe, Tarefa, HistoricoEtapa } = require("../models");
const router = express.Router();
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
router.use(autenticar);

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
    const equipe = await Equipe.create({ liderId, nomeProjeto: nomeProjeto.trim(), descricaoInicial, areaSetor, estagioAtual, origemDivulgacao, mentorId: mentorId || null }, { transaction });
    const rows = Array.isArray(integrantes) ? integrantes.filter((i) => i && i.nome && i.curso).map((i) => ({ equipeId: equipe.id, usuarioId: i.usuarioId || null, nome: i.nome, curso: i.curso, semestre: i.semestre || null, tipo: i.tipo === "lider" ? "lider" : "integrante" })) : [];
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
    const { nome, curso, semestre, tipo = "integrante", usuarioId = null } = req.body;
    if (!nome || !curso) return res.status(400).json({ erro: "Nome e curso são obrigatórios." });
    if (usuarioId) {
      const usuario = await Usuario.findByPk(usuarioId);
      if (!usuario || !usuario.ativo) return res.status(400).json({ erro: "Usuário inválido." });
      const existente = await IntegranteEquipe.findOne({ where: { equipeId: equipe.id, usuarioId } });
      if (existente) return res.status(409).json({ erro: "Este usuário já pertence à equipe." });
    }
    const integrante = await IntegranteEquipe.create({ equipeId: equipe.id, nome: nome.trim(), curso: curso.trim(), semestre: semestre || null, tipo: tipo === "lider" ? "lider" : "integrante", usuarioId: usuarioId || null });
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
      if (nova !== anterior) await HistoricoEtapa.create({ equipeId: equipe.id, etapaAnterior: anterior, etapaNova: nova, alteradoPor: req.usuario.id, motivo: req.body.motivo || null });
      data.etapaAtual = nova;
    }
    await equipe.update(data);
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

module.exports = router;
