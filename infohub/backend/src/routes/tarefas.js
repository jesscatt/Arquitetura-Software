// =====================================================================
// Tarefas da jornada.
// RF-11 criacao avulsa ou a partir de modelos por etapa
// RF-12 titulo, instrucoes, etapa, prazo e status
// RF-13 listagem para o aluno
// RF-17 datas de lembrete automatico configuraveis por tarefa
// RF-18 aviso por e-mail quando a tarefa e atribuida
// =====================================================================
const express = require("express");
const { Op } = require("sequelize");
const { Tarefa, Equipe, Usuario, Entrega, Lembrete, ModeloTarefa } = require("../models");
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
const config = require("../services/configuracoes");
const notificacoes = require("../services/notificacoes");

const router = express.Router();
router.use(autenticar);

const includePadrao = [
  { model: Equipe, as: "equipe", attributes: ["id", "nomeProjeto", "mentorId", "liderId", "ciclo"] },
  { model: Usuario, as: "criador", attributes: ["id", "nome"] },
  { model: Lembrete, as: "lembretes", attributes: ["id", "tipo", "diasAntes", "dataEnvio", "enviadoEm"] },
];

// Cria as datas de lembrete a partir do prazo da tarefa (RF-17).
async function criarLembretes(tarefa, diasSolicitados, usuarioId) {
  const dias = Array.isArray(diasSolicitados) && diasSolicitados.length
    ? diasSolicitados
    : (await config.lista("lembretes.dias_padrao")).map(Number);

  const unicos = [...new Set(dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 60))];
  const prazo = new Date(`${String(tarefa.dataEntrega).slice(0, 10)}T09:00:00`);
  const registros = unicos
    .map((diasAntes) => {
      const data = new Date(prazo);
      data.setDate(data.getDate() - diasAntes);
      return { tarefaId: tarefa.id, tipo: diasAntes === 0 ? "vencimento" : "antecedencia", diasAntes, dataEnvio: data, criadoPor: usuarioId };
    })
    // Datas que ja passaram no momento da criacao nao geram e-mail retroativo.
    .filter((registro) => registro.dataEnvio.getTime() > Date.now() - 60 * 60 * 1000);

  if (registros.length) await Lembrete.bulkCreate(registros);
  return registros.length;
}

router.get("/", exigirPermissao("tarefas.visualizar"), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.equipeId) where.equipeId = Number(req.query.equipeId);
    if (req.query.status) where.status = { [Op.in]: String(req.query.status).split(",") };
    if (req.query.etapa) where.etapaRelacionada = Number(req.query.etapa);

    let tarefas = await Tarefa.findAll({ where, include: includePadrao, order: [["dataEntrega", "ASC"]] });
    if (req.usuario.tipo !== "admin") {
      const filtradas = [];
      for (const tarefa of tarefas) if (await escopoEquipe(tarefa.equipe, req.usuario)) filtradas.push(tarefa);
      tarefas = filtradas;
    }
    res.json(tarefas);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", exigirPermissao("tarefas.visualizar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, {
      include: [...includePadrao, { model: Entrega, as: "entregas", include: [{ model: Usuario, as: "remetente", attributes: ["id", "nome"] }] }],
      order: [[{ model: Entrega, as: "entregas" }, "versao", "DESC"]],
    });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta tarefa." });
    res.json(tarefa);
  } catch (e) {
    next(e);
  }
});

router.post("/", exigirPermissao("tarefas.criar"), async (req, res, next) => {
  try {
    const { equipeId, titulo, descricao, etapaRelacionada, dataEntrega, modeloTarefaId, obrigatoria = false, lembretes } = req.body;
    if (!equipeId || !titulo || !etapaRelacionada || !dataEntrega) {
      return res.status(400).json({ erro: "Equipe, título, etapa e data de entrega são obrigatórios." });
    }
    const equipe = await Equipe.findByPk(equipeId);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode criar tarefas para esta equipe." });

    const tarefa = await Tarefa.create({
      equipeId,
      titulo: String(titulo).trim().slice(0, 150),
      descricao: descricao || null,
      etapaRelacionada: Number(etapaRelacionada),
      dataEntrega,
      obrigatoria: Boolean(obrigatoria),
      criadoPor: req.usuario.id,
      modeloTarefaId: modeloTarefaId || null,
      status: req.body.status || "pendente",
    });

    await criarLembretes(tarefa, lembretes, req.usuario.id);
    notificacoes.tarefaAtribuida(tarefa, equipe).catch((erro) => console.error("[EMAIL]", erro.message));

    res.status(201).json(await Tarefa.findByPk(tarefa.id, { include: includePadrao }));
  } catch (e) {
    next(e);
  }
});

// RF-11 - aplica de uma vez todos os modelos de tarefa de uma etapa.
router.post("/aplicar-modelos", exigirPermissao("tarefas.criar"), async (req, res, next) => {
  try {
    const equipeId = Number(req.body.equipeId);
    const etapa = Number(req.body.etapa);
    if (!equipeId || !etapa) return res.status(400).json({ erro: "Informe a equipe e a etapa." });
    const equipe = await Equipe.findByPk(equipeId);
    if (!equipe) return res.status(404).json({ erro: "Equipe não encontrada." });
    if (!(await escopoEquipe(equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode criar tarefas para esta equipe." });

    const modelos = await ModeloTarefa.findAll({ where: { etapaRelacionada: etapa, ativo: true }, order: [["id", "ASC"]] });
    if (!modelos.length) return res.status(404).json({ erro: "Nenhum modelo de tarefa cadastrado para esta etapa." });

    const criadas = [];
    for (const modelo of modelos) {
      const jaExiste = await Tarefa.findOne({ where: { equipeId, modeloTarefaId: modelo.id } });
      if (jaExiste) continue;
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + (modelo.prazoDias || 7));
      const tarefa = await Tarefa.create({
        equipeId,
        modeloTarefaId: modelo.id,
        titulo: modelo.titulo,
        descricao: modelo.descricao,
        etapaRelacionada: modelo.etapaRelacionada,
        dataEntrega: prazo.toISOString().slice(0, 10),
        obrigatoria: modelo.obrigatoria,
        criadoPor: req.usuario.id,
      });
      await criarLembretes(tarefa, null, req.usuario.id);
      notificacoes.tarefaAtribuida(tarefa, equipe).catch((erro) => console.error("[EMAIL]", erro.message));
      criadas.push(tarefa);
    }
    res.status(201).json({ criadas: criadas.length, tarefas: criadas, mensagem: criadas.length ? `${criadas.length} tarefa(s) criada(s) a partir dos modelos da etapa ${etapa}.` : "As tarefas desta etapa já haviam sido criadas para esta equipe." });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode editar esta tarefa." });

    const permitidos = ["titulo", "descricao", "etapaRelacionada", "dataEntrega", "status", "modeloTarefaId", "obrigatoria"];
    const dados = Object.fromEntries(permitidos.filter((c) => req.body[c] !== undefined).map((c) => [c, req.body[c]]));
    const prazoMudou = dados.dataEntrega && String(dados.dataEntrega).slice(0, 10) !== String(tarefa.dataEntrega).slice(0, 10);

    await tarefa.update(dados);

    // Prazo alterado: os lembretes ainda nao enviados sao reagendados.
    if (prazoMudou) {
      await Lembrete.destroy({ where: { tarefaId: tarefa.id, enviadoEm: null } });
      await criarLembretes(tarefa, req.body.lembretes, req.usuario.id);
    }
    res.json(await Tarefa.findByPk(tarefa.id, { include: includePadrao }));
  } catch (e) {
    next(e);
  }
});

// RF-17 - adicionar um lembrete extra a uma tarefa existente.
router.post("/:id/lembretes", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Sem acesso a esta tarefa." });
    const diasAntes = Number(req.body.diasAntes);
    if (!Number.isInteger(diasAntes) || diasAntes < 0 || diasAntes > 60) return res.status(400).json({ erro: "Informe de 0 a 60 dias de antecedência." });
    const criados = await criarLembretes(tarefa, [diasAntes], req.usuario.id);
    if (!criados) return res.status(400).json({ erro: "A data calculada para este lembrete já passou." });
    res.status(201).json(await Lembrete.findAll({ where: { tarefaId: tarefa.id }, order: [["dataEnvio", "ASC"]] }));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/lembretes/:lembreteId", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const lembrete = await Lembrete.findOne({ where: { id: req.params.lembreteId, tarefaId: req.params.id } });
    if (!lembrete) return res.status(404).json({ erro: "Lembrete não encontrado." });
    await lembrete.destroy();
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", exigirPermissao("tarefas.editar"), async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findByPk(req.params.id, { include: [{ model: Equipe, as: "equipe" }] });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode excluir esta tarefa." });
    await tarefa.destroy();
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
