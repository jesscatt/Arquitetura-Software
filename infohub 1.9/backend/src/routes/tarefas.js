const express = require("express");
const { Tarefa, Equipe, Usuario } = require("../models");
const router = express.Router();
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
router.use(autenticar);
const includePadrao = [
  { model: Equipe, as: "equipe", attributes: ["id", "nomeProjeto", "mentorId", "liderId"] },
  { model: Usuario, as: "criador", attributes: ["id", "nome"] },
];

router.get("/", exigirPermissao("tarefas.visualizar"), async (req, res, next) => {
  try {
    const where = req.query.equipeId ? { equipeId: req.query.equipeId } : {};
    let tarefas = await Tarefa.findAll({ where, include: includePadrao, order: [["dataEntrega", "ASC"]] });
    if (req.usuario.tipo !== "admin") {
      const filtradas = [];
      for (const tarefa of tarefas) if (await escopoEquipe(tarefa.equipe, req.usuario)) filtradas.push(tarefa);
      tarefas = filtradas;
    }
    res.json(tarefas);
  } catch (e) { next(e); }
});

router.get("/:id", exigirPermissao("tarefas.visualizar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: includePadrao });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta tarefa." });
    res.json(tarefa);
  } catch (e) { next(e); }
});

router.post("/", exigirPermissao("tarefas.criar"), async (req, res, next) => {
  try {
    const { equipeId, titulo, descricao, etapaRelacionada, dataEntrega, modeloTarefaId } = req.body;
    if (!equipeId || !titulo || !etapaRelacionada || !dataEntrega) return res.status(400).json({ erro: "equipeId, titulo, etapaRelacionada e dataEntrega são obrigatórios." });
    const equipe = await Equipe.findByPk(equipeId);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode criar tarefas para esta equipe." });
    const tarefa = await Tarefa.create({ equipeId, titulo: titulo.trim(), descricao, etapaRelacionada, dataEntrega, criadoPor: req.usuario.id, modeloTarefaId: modeloTarefaId || null });
    res.status(201).json(tarefa);
  } catch (e) { next(e); }
});

router.patch("/:id", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode editar esta tarefa." });
    const allowed = ["titulo", "descricao", "etapaRelacionada", "dataEntrega", "status", "modeloTarefaId"];
    const data = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    await tarefa.update(data);
    res.json(tarefa);
  } catch (e) { next(e); }
});

router.delete("/:id", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode excluir esta tarefa." });
    await tarefa.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
});
module.exports = router;
