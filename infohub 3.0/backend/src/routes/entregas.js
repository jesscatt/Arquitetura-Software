const express = require("express");
const { Entrega, Tarefa, Equipe, Usuario } = require("../models");
const router = express.Router();
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
router.use(autenticar);

const include = [
  { model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe", attributes: ["id", "nomeProjeto", "mentorId", "liderId"] }] },
  { model: Usuario, as: "remetente", attributes: ["id", "nome", "email"] },
];

router.get("/", exigirPermissao("entregas.visualizar"), async (req, res, next) => {
  try {
    let entregas = await Entrega.findAll({ include, order: [["enviadoEm", "DESC"]] });
    if (req.usuario.tipo !== "admin") {
      const filtradas = [];
      for (const entrega of entregas) if (await escopoEquipe(entrega.tarefa?.equipe, req.usuario)) filtradas.push(entrega);
      entregas = filtradas;
    }
    res.json(entregas);
  } catch (e) { next(e); }
});

router.post("/", exigirPermissao("entregas.enviar"), async (req, res, next) => {
  try {
    const { tarefaId, arquivoUrl } = req.body;
    if (!tarefaId || !arquivoUrl) return res.status(400).json({ erro: "tarefaId e arquivoUrl são obrigatórios." });
    const tarefa = await Tarefa.findByPk(tarefaId, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode enviar entrega para esta equipe." });
    const entrega = await Entrega.create({ tarefaId, enviadoPor: req.usuario.id, arquivoUrl: String(arquivoUrl).trim() });
    await tarefa.update({ status: "entregue" });
    res.status(201).json(await Entrega.findByPk(entrega.id, { include }));
  } catch (e) { next(e); }
});

router.patch("/:id/avaliacao", exigirPermissao("entregas.avaliar"), async (req, res, next) => {
  try {
    const entrega = await Entrega.findByPk(req.params.id, { include: [{ model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe" }] }] });
    if (!entrega) return res.status(404).json({ erro: "Entrega não encontrada." });
    if (!(await escopoEquipe(entrega.tarefa?.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode avaliar esta entrega." });
    const nota = req.body.nota === null || req.body.nota === undefined || req.body.nota === "" ? null : Number(req.body.nota);
    if (nota !== null && (!Number.isFinite(nota) || nota < 0 || nota > 10)) return res.status(400).json({ erro: "A nota deve estar entre 0 e 10." });
    await entrega.update({ avaliacao: req.body.avaliacao || null, nota, avaliadoPor: req.usuario.id });
    if (nota !== null) await entrega.tarefa.update({ status: nota >= 7 ? "aprovada" : "reprovada" });
    res.json(entrega);
  } catch (e) { next(e); }
});
module.exports = router;
