const express = require("express");
const { EtapaJornada, Equipe, HistoricoEtapa } = require("../models");
const router = express.Router();
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
router.use(autenticar);

router.get("/etapas", exigirPermissao("jornada.visualizar"), async (req, res, next) => {
  try { res.json(await EtapaJornada.findAll({ order: [["numero", "ASC"]] })); } catch (e) { next(e); }
});

router.get("/equipes/:id/historico", exigirPermissao("jornada.visualizar"), async (req, res, next) => {
  try {
    const equipe = await Equipe.findByPk(req.params.id);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta equipe." });
    res.json(await HistoricoEtapa.findAll({ where: { equipeId: equipe.id }, order: [["alteradoEm", "DESC"]] }));
  } catch (e) { next(e); }
});
module.exports = router;
