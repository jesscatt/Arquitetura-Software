// =====================================================================
// Entregas dos alunos.
// RF-14 upload de arquivo ou link externo (Pitch Video - Q3)
// RF-15 aprovacao ou devolucao para ajustes com comentario
// RF-16 historico de versoes por tarefa
// RNF-04 limites de tamanho e tipo, arquivos fora da pasta publica
// =====================================================================
const express = require("express");
const { Entrega, Tarefa, Equipe, Usuario } = require("../models");
const { autenticar, exigirPermissao, escopoEquipe } = require("../middleware");
const armazenamento = require("../services/armazenamento");
const notificacoes = require("../services/notificacoes");

const router = express.Router();

const include = [
  { model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe", attributes: ["id", "nomeProjeto", "mentorId", "liderId"] }] },
  { model: Usuario, as: "remetente", attributes: ["id", "nome", "email"] },
  { model: Usuario, as: "avaliador", attributes: ["id", "nome"] },
];

const LINK_REGEX = /^https?:\/\/[^\s]+$/i;

// O upload chega como corpo binario puro, sem dependencia de multipart.
// O nome original do arquivo vem na query string.
const corpoBinario = express.raw({ type: ["application/octet-stream", "application/pdf", "image/*", "video/*"], limit: "120mb" });

router.use(autenticar);

router.get("/limites", async (req, res, next) => {
  try {
    res.json(await armazenamento.limites());
  } catch (e) {
    next(e);
  }
});

async function carregarTarefa(tarefaId) {
  return Tarefa.findByPk(tarefaId, { include: [{ model: Equipe, as: "equipe" }] });
}

async function proximaVersao(tarefaId) {
  return (await Entrega.count({ where: { tarefaId } })) + 1;
}

router.get("/", exigirPermissao("entregas.visualizar"), async (req, res, next) => {
  try {
    const where = req.query.tarefaId ? { tarefaId: Number(req.query.tarefaId) } : {};
    let entregas = await Entrega.findAll({ where, include, order: [["enviadoEm", "DESC"]] });
    if (req.usuario.tipo !== "admin") {
      const filtradas = [];
      for (const entrega of entregas) if (await escopoEquipe(entrega.tarefa?.equipe, req.usuario)) filtradas.push(entrega);
      entregas = filtradas;
    }
    res.json(entregas);
  } catch (e) {
    next(e);
  }
});

// RF-14 (variante link) - Pitch Video no YouTube/Drive, por exemplo.
router.post("/", exigirPermissao("entregas.enviar"), async (req, res, next) => {
  try {
    const { tarefaId, arquivoUrl } = req.body;
    if (!tarefaId || !arquivoUrl) return res.status(400).json({ erro: "Informe a tarefa e o link da entrega." });
    if (!LINK_REGEX.test(String(arquivoUrl).trim())) return res.status(400).json({ erro: "Informe um link válido começando com http:// ou https://." });
    const tarefa = await carregarTarefa(tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode enviar entrega para esta equipe." });

    const entrega = await Entrega.create({
      tarefaId: tarefa.id,
      enviadoPor: req.usuario.id,
      arquivoUrl: String(arquivoUrl).trim().slice(0, 500),
      tipo: "link",
      versao: await proximaVersao(tarefa.id),
      status: "enviada",
    });
    await tarefa.update({ status: "entregue" });

    notificacoes.entregaRecebida({ tarefa, equipe: tarefa.equipe, entrega, autor: req.usuario }).catch((erro) => console.error("[EMAIL]", erro.message));
    res.status(201).json(await Entrega.findByPk(entrega.id, { include }));
  } catch (e) {
    next(e);
  }
});

// RF-14 (variante arquivo) - PDF, imagem, video, apresentacao.
router.post("/arquivo", exigirPermissao("entregas.enviar"), corpoBinario, async (req, res, next) => {
  try {
    const tarefaId = Number(req.query.tarefaId);
    const nomeOriginal = String(req.query.nome || "").trim();
    if (!tarefaId || !nomeOriginal) return res.status(400).json({ erro: "Informe a tarefa e o nome do arquivo." });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ erro: "Nenhum arquivo foi recebido." });

    const validacao = await armazenamento.validar({ nomeOriginal, tamanhoBytes: req.body.length });
    if (!validacao.ok) return res.status(400).json({ erro: validacao.erro });

    const tarefa = await carregarTarefa(tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!(await escopoEquipe(tarefa.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode enviar entrega para esta equipe." });

    const { nomeFisico, nomeExibicao } = armazenamento.gravar({ buffer: req.body, nomeOriginal });
    const entrega = await Entrega.create({
      tarefaId: tarefa.id,
      enviadoPor: req.usuario.id,
      arquivoUrl: nomeFisico,
      tipo: "arquivo",
      nomeArquivo: nomeExibicao,
      mimeType: String(req.headers["x-tipo-arquivo"] || req.headers["content-type"] || "application/octet-stream").slice(0, 150),
      tamanhoBytes: req.body.length,
      versao: await proximaVersao(tarefa.id),
      status: "enviada",
    });
    await tarefa.update({ status: "entregue" });

    notificacoes.entregaRecebida({ tarefa, equipe: tarefa.equipe, entrega, autor: req.usuario }).catch((erro) => console.error("[EMAIL]", erro.message));
    res.status(201).json(await Entrega.findByPk(entrega.id, { include }));
  } catch (e) {
    next(e);
  }
});

// Download autenticado do arquivo (nunca exposto por pasta estatica).
router.get("/:id/arquivo", exigirPermissao("entregas.visualizar"), async (req, res, next) => {
  try {
    const entrega = await Entrega.findByPk(req.params.id, { include: [{ model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe" }] }] });
    if (!entrega) return res.status(404).json({ erro: "Entrega não encontrada." });
    if (!(await escopoEquipe(entrega.tarefa?.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode acessar esta entrega." });
    if (entrega.tipo !== "arquivo") return res.status(400).json({ erro: "Esta entrega é um link externo." });
    const caminho = armazenamento.caminhoDe(entrega.arquivoUrl);
    if (!caminho) return res.status(404).json({ erro: "Arquivo não localizado no servidor." });
    res.setHeader("Content-Type", entrega.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${entrega.nomeArquivo || "entrega"}"`);
    res.sendFile(caminho);
  } catch (e) {
    next(e);
  }
});

// RF-15 - aprovar a entrega ou devolver para ajustes com comentario.
router.patch("/:id/avaliacao", exigirPermissao("entregas.avaliar"), async (req, res, next) => {
  try {
    const entrega = await Entrega.findByPk(req.params.id, { include: [{ model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe" }] }] });
    if (!entrega) return res.status(404).json({ erro: "Entrega não encontrada." });
    if (!(await escopoEquipe(entrega.tarefa?.equipe, req.usuario))) return res.status(403).json({ erro: "Você não pode avaliar esta entrega." });

    const decisao = String(req.body.decisao || "").toLowerCase();
    if (!["aprovada", "ajustes"].includes(decisao)) {
      return res.status(400).json({ erro: "Informe a decisão: 'aprovada' ou 'ajustes'." });
    }
    const comentario = String(req.body.comentario || "").trim().slice(0, 2000);
    if (decisao === "ajustes" && !comentario) {
      return res.status(400).json({ erro: "Descreva os ajustes necessários para o aluno." });
    }
    const nota = req.body.nota === undefined || req.body.nota === null || req.body.nota === "" ? null : Number(req.body.nota);
    if (nota !== null && (!Number.isFinite(nota) || nota < 0 || nota > 10)) {
      return res.status(400).json({ erro: "A nota deve estar entre 0 e 10." });
    }

    await entrega.update({
      status: decisao,
      avaliacao: comentario || null,
      nota,
      avaliadoPor: req.usuario.id,
      avaliadoEm: new Date(),
    });
    // Aprovada encerra a tarefa; ajustes reabrem a tarefa para novo envio.
    await entrega.tarefa.update({ status: decisao === "aprovada" ? "aprovada" : "reprovada" });

    notificacoes
      .entregaAvaliada({ tarefa: entrega.tarefa, equipe: entrega.tarefa.equipe, aprovada: decisao === "aprovada", comentario })
      .catch((erro) => console.error("[EMAIL]", erro.message));

    res.json(await Entrega.findByPk(entrega.id, { include }));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
