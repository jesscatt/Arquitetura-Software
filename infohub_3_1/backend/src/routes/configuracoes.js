// =====================================================================
// Area administrativa de parametrizacao do sistema.
// - Parametros operacionais (ciclo atual, limites de upload, lembretes)
// - Lista de areas/setores da ideia (RF-02)
// - Modelos de tarefa por etapa (RF-11)
// =====================================================================
const express = require("express");
const { Configuracao, AreaIdeia, ModeloTarefa } = require("../models");
const { autenticar, exigirPermissao } = require("../middleware");
const config = require("../services/configuracoes");

const router = express.Router();
router.use(autenticar);

// --- Parametros --------------------------------------------------------
router.get("/", exigirPermissao("configuracoes.visualizar"), async (req, res, next) => {
  try {
    res.json(await Configuracao.findAll({ order: [["chave", "ASC"]] }));
  } catch (e) {
    next(e);
  }
});

router.put("/:chave", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const chave = String(req.params.chave);
    const registro = await Configuracao.findByPk(chave);
    if (!registro) return res.status(404).json({ erro: "Configuração não encontrada." });
    const valor = String(req.body.valor ?? "").trim();
    if (!valor) return res.status(400).json({ erro: "Informe um valor." });
    await config.definir(chave, valor);
    res.json(await Configuracao.findByPk(chave));
  } catch (e) {
    next(e);
  }
});

// --- Areas da ideia ----------------------------------------------------
router.get("/areas", exigirPermissao("configuracoes.visualizar"), async (req, res, next) => {
  try {
    res.json(await AreaIdeia.findAll({ order: [["nome", "ASC"]] }));
  } catch (e) {
    next(e);
  }
});

router.post("/areas", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const nome = String(req.body.nome || "").trim().slice(0, 100);
    if (!nome) return res.status(400).json({ erro: "Informe o nome da área." });
    const existente = await AreaIdeia.findOne({ where: { nome } });
    if (existente) return res.status(409).json({ erro: "Esta área já está cadastrada." });
    res.status(201).json(await AreaIdeia.create({ nome }));
  } catch (e) {
    next(e);
  }
});

router.patch("/areas/:id", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const area = await AreaIdeia.findByPk(req.params.id);
    if (!area) return res.status(404).json({ erro: "Área não encontrada." });
    const dados = {};
    if (req.body.nome !== undefined) dados.nome = String(req.body.nome).trim().slice(0, 100);
    if (req.body.ativa !== undefined) dados.ativa = Boolean(req.body.ativa);
    await area.update(dados);
    res.json(area);
  } catch (e) {
    next(e);
  }
});

// --- Modelos de tarefa (RF-11) ----------------------------------------
router.get("/modelos-tarefa", exigirPermissao("tarefas.visualizar"), async (req, res, next) => {
  try {
    const where = req.query.etapa ? { etapaRelacionada: Number(req.query.etapa) } : {};
    res.json(await ModeloTarefa.findAll({ where, order: [["etapaRelacionada", "ASC"], ["id", "ASC"]] }));
  } catch (e) {
    next(e);
  }
});

router.post("/modelos-tarefa", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const { titulo, descricao, etapaRelacionada, obrigatoria = false, prazoDias = 7 } = req.body;
    const etapa = Number(etapaRelacionada);
    if (!titulo || !Number.isInteger(etapa) || etapa < 1 || etapa > 6) {
      return res.status(400).json({ erro: "Informe o título e uma etapa entre 1 e 6." });
    }
    const modelo = await ModeloTarefa.create({
      titulo: String(titulo).trim().slice(0, 150),
      descricao: descricao || null,
      etapaRelacionada: etapa,
      obrigatoria: Boolean(obrigatoria),
      prazoDias: Number(prazoDias) || 7,
    });
    res.status(201).json(modelo);
  } catch (e) {
    next(e);
  }
});

router.patch("/modelos-tarefa/:id", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const modelo = await ModeloTarefa.findByPk(req.params.id);
    if (!modelo) return res.status(404).json({ erro: "Modelo não encontrado." });
    const permitidos = ["titulo", "descricao", "etapaRelacionada", "obrigatoria", "prazoDias", "ativo"];
    await modelo.update(Object.fromEntries(permitidos.filter((c) => req.body[c] !== undefined).map((c) => [c, req.body[c]])));
    res.json(modelo);
  } catch (e) {
    next(e);
  }
});

router.delete("/modelos-tarefa/:id", exigirPermissao("configuracoes.editar"), async (req, res, next) => {
  try {
    const modelo = await ModeloTarefa.findByPk(req.params.id);
    if (!modelo) return res.status(404).json({ erro: "Modelo não encontrado." });
    await modelo.update({ ativo: false });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
