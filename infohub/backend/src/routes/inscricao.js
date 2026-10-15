// =====================================================================
// Inscricao publica do aluno - Etapa 1 da jornada.
// Atende RF-02 (cadastro cria a conta), RF-04 (validacao dos campos
// obrigatorios), RF-05 (registro na Etapa 1 + aviso ao administrador),
// RN-03/Q4 (participacao em uma unica equipe ativa) e RNF-02 (LGPD).
// Estas rotas sao publicas e NAO exigem autenticacao.
// =====================================================================
const express = require("express");
const { Usuario, Perfil, Equipe, IntegranteEquipe, AreaIdeia } = require("../models");
const { hashSenha } = require("./auth");
const config = require("../services/configuracoes");
const notificacoes = require("../services/notificacoes");

const router = express.Router();

const ESTAGIOS = ["ideia", "prototipo", "mvp_desenvolvimento", "mvp_pronto"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor, max) {
  const limpo = String(valor ?? "").trim();
  return max ? limpo.slice(0, max) : limpo;
}

// Metadados usados pelo formulario publico.
router.get("/dados", async (req, res, next) => {
  try {
    const areas = await AreaIdeia.findAll({ where: { ativa: true }, order: [["nome", "ASC"]] });
    res.json({
      areas: areas.map((a) => a.nome),
      estagios: [
        { valor: "ideia", rotulo: "Apenas ideia" },
        { valor: "prototipo", rotulo: "Protótipo" },
        { valor: "mvp_desenvolvimento", rotulo: "MVP em desenvolvimento" },
        { valor: "mvp_pronto", rotulo: "MVP pronto" },
      ],
      maxIntegrantes: await config.numero("equipe.max_integrantes"),
      ciclo: await config.texto("ciclo.atual"),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  const transaction = await Equipe.sequelize.transaction();
  try {
    const corpo = req.body || {};
    const dados = {
      nome: texto(corpo.nome, 150),
      email: texto(corpo.email, 150).toLowerCase(),
      telefone: texto(corpo.telefone, 30),
      curso: texto(corpo.curso, 120),
      semestre: texto(corpo.semestre, 20),
      senha: String(corpo.senha ?? ""),
      nomeProjeto: texto(corpo.nomeProjeto, 150),
      descricaoInicial: texto(corpo.descricaoInicial, 4000),
      areaSetor: texto(corpo.areaSetor, 100),
      estagioAtual: texto(corpo.estagioAtual, 30),
      origemDivulgacao: texto(corpo.origemDivulgacao, 100),
    };
    const integrantes = Array.isArray(corpo.integrantes) ? corpo.integrantes : [];
    const consentimento = corpo.consentimentoLgpd === true || corpo.consentimentoLgpd === "true";

    // RF-04 - validacao dos campos obrigatorios antes de gravar.
    const faltando = [];
    if (!dados.nome) faltando.push("nome completo");
    if (!dados.email || !EMAIL_REGEX.test(dados.email)) faltando.push("e-mail válido");
    if (!dados.telefone) faltando.push("telefone/WhatsApp");
    if (!dados.curso) faltando.push("curso");
    if (!dados.semestre) faltando.push("semestre/período");
    if (!dados.nomeProjeto) faltando.push("nome da ideia/projeto");
    if (!dados.descricaoInicial) faltando.push("descrição da ideia");
    if (!dados.areaSetor) faltando.push("área/setor");
    if (!ESTAGIOS.includes(dados.estagioAtual)) faltando.push("estágio atual da ideia");
    if (faltando.length) {
      await transaction.rollback();
      return res.status(400).json({ erro: `Preencha os campos obrigatórios: ${faltando.join(", ")}.` });
    }
    if (dados.senha.length < 8) {
      await transaction.rollback();
      return res.status(400).json({ erro: "A senha de acesso deve ter pelo menos 8 caracteres." });
    }
    // RNF-02 - o consentimento LGPD e obrigatorio e fica registrado.
    if (!consentimento) {
      await transaction.rollback();
      return res.status(400).json({ erro: "É necessário aceitar o termo de tratamento de dados (LGPD) para concluir a inscrição." });
    }

    const maxIntegrantes = await config.numero("equipe.max_integrantes");
    const colegas = integrantes
      .map((i) => ({ nome: texto(i?.nome, 150), email: texto(i?.email, 180).toLowerCase(), curso: texto(i?.curso, 100), semestre: texto(i?.semestre, 20) }))
      .filter((i) => i.nome);
    if (colegas.length + 1 > maxIntegrantes) {
      await transaction.rollback();
      return res.status(400).json({ erro: `A equipe pode ter no máximo ${maxIntegrantes} integrantes, incluindo você.` });
    }

    let usuario = await Usuario.findOne({ where: { email: dados.email }, transaction });

    if (usuario) {
      // RN-03 / Q4 - por padrao o aluno so pode liderar uma equipe ativa.
      const permiteMultiplas = await config.booleano("equipe.multiplas_por_aluno");
      if (!permiteMultiplas) {
        const equipeAtiva = await Equipe.findOne({ where: { liderId: usuario.id, status: "ativa" }, transaction });
        if (equipeAtiva) {
          await transaction.rollback();
          return res.status(409).json({ erro: "Este e-mail já possui uma ideia ativa no InfoHub. Acesse o sistema com sua conta para acompanhá-la." });
        }
      }
      await transaction.rollback();
      return res.status(409).json({ erro: "Já existe uma conta com este e-mail. Faça login para enviar uma nova ideia." });
    }

    const perfil = await Perfil.findOne({ where: { nome: "Aluno líder" }, transaction });
    if (!perfil) {
      await transaction.rollback();
      return res.status(500).json({ erro: "Perfil 'Aluno líder' não encontrado. Execute o script de banco novamente." });
    }

    usuario = await Usuario.create(
      {
        nome: dados.nome,
        email: dados.email,
        senhaHash: hashSenha(dados.senha).valor,
        tipo: "aluno",
        perfilId: perfil.id,
        ativo: true,
        deveAlterarSenha: false,
        telefone: dados.telefone,
        curso: dados.curso,
        semestre: dados.semestre,
        consentimentoLgpd: true,
        consentimentoEm: new Date(),
      },
      { transaction }
    );

    // RF-05 - a ideia entra automaticamente na Etapa 1 do funil.
    const equipe = await Equipe.create(
      {
        liderId: usuario.id,
        nomeProjeto: dados.nomeProjeto,
        descricaoInicial: dados.descricaoInicial,
        areaSetor: dados.areaSetor,
        estagioAtual: dados.estagioAtual,
        origemDivulgacao: dados.origemDivulgacao || null,
        etapaAtual: 1,
        status: "ativa",
        ciclo: await config.texto("ciclo.atual"),
      },
      { transaction }
    );

    await IntegranteEquipe.create(
      { equipeId: equipe.id, usuarioId: usuario.id, nome: usuario.nome, email: usuario.email, curso: dados.curso, semestre: dados.semestre, tipo: "lider" },
      { transaction }
    );
    if (colegas.length) {
      await IntegranteEquipe.bulkCreate(
        colegas.map((c) => ({ equipeId: equipe.id, nome: c.nome, email: c.email || null, curso: c.curso || null, semestre: c.semestre || null, tipo: "integrante" })),
        { transaction }
      );
    }

    await transaction.commit();

    // RF-05 - aviso ao administrador. Nunca bloqueia a resposta ao aluno.
    notificacoes.novaInscricao({ equipe, aluno: usuario }).catch((erro) => console.error("[EMAIL] Aviso de inscrição:", erro.message));

    res.status(201).json({
      ok: true,
      mensagem: "Inscrição registrada com sucesso. Sua ideia está na Etapa 1 e a equipe do InfoHub entrará em contato.",
      email: usuario.email,
      equipeId: equipe.id,
    });
  } catch (e) {
    await transaction.rollback().catch(() => {});
    if (e.name === "SequelizeUniqueConstraintError") return res.status(409).json({ erro: "Já existe uma conta com este e-mail." });
    next(e);
  }
});

module.exports = router;
