const express=require("express");
const {Usuario,Perfil,Permissao}=require("../models");
const {autenticar,exigirPermissao}=require("../middleware");
const {hashSenha,gerarSenhaTemporaria}=require("./auth");
const {enviarConvite,enviarEmailTeste}=require("../services/mailer");
const router=express.Router();

// Converte IDs vindos da URL/formulário para inteiros válidos.
// Evita que strings vazias, undefined ou NaN cheguem ao Sequelize.
function parseId(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
const safe={attributes:{exclude:["senhaHash","tokenResetSenha","tokenResetExpira"]}};
router.use(autenticar);

const perfilInclude={model:Perfil,as:"perfil",attributes:["id","nome","descricao"]};
const perfilPermissoesInclude={model:Permissao,as:"permissoes",through:{attributes:[]}};

router.get("/",exigirPermissao("usuarios.visualizar"),async(req,res,next)=>{
  try {
    res.json(await Usuario.findAll({...safe,include:[perfilInclude],order:[["id","ASC"]]}));
  } catch(e) { next(e); }
});

// Rotas de metadados precisam vir antes de /:id para não serem capturadas como um ID.
router.get("/meta/perfis",exigirPermissao("usuarios.visualizar"),async(req,res,next)=>{
  try { res.json(await Perfil.findAll({include:[perfilPermissoesInclude],order:[["id","ASC"]]})); }
  catch(e) { next(e); }
});

router.get("/meta/email-status",exigirPermissao("usuarios.visualizar"),async(req,res)=>{
  const host=process.env.SMTP_HOST||"mailpit";
  const port=Number(process.env.SMTP_PORT||1025);
  const usingMailpit=host==="mailpit";
  res.json({host,port,usingMailpit,configured:Boolean(process.env.SMTP_USER)||usingMailpit});
});

router.post("/meta/test-email",exigirPermissao("usuarios.editar"),async(req,res,next)=>{
  try {
    const email=String(req.body.email||req.usuario.email||"").trim().toLowerCase();
    if(!email) return res.status(400).json({erro:"Informe um e-mail para o teste."});
    await enviarEmailTeste({email,nome:req.usuario.nome});
    res.json({ok:true,mensagem:`E-mail de teste enviado para ${email}.`});
  } catch(e) {
    console.error("[EMAIL] Falha no teste:",e);
    res.status(502).json({erro:"Não foi possível enviar o e-mail de teste. Verifique SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM."});
  }
});

router.get("/meta/permissoes",exigirPermissao("perfis.editar"),async(req,res,next)=>{
  try { res.json(await Permissao.findAll({order:[["modulo","ASC"],["id","ASC"]]})); }
  catch(e) { next(e); }
});

router.put("/meta/perfis/:id/permissoes",exigirPermissao("perfis.editar"),async(req,res,next)=>{
  try {
    const perfilId=parseId(req.params.id);
    if (!perfilId) return res.status(400).json({erro:"ID de perfil inválido."});
    const perfil=await Perfil.findByPk(perfilId);
    if(!perfil) return res.status(404).json({erro:"Perfil não encontrado."});
    const ids=Array.isArray(req.body.permissaoIds)?req.body.permissaoIds.map(Number).filter(Number.isInteger):[];
    await perfil.setPermissoes(ids);
    res.json(await Perfil.findByPk(perfil.id,{include:[perfilPermissoesInclude]}));
  } catch(e) { next(e); }
});

router.post("/", exigirPermissao("usuarios.criar"), async (req, res, next) => {
  try {
    const { nome, email, senha, perfilId, ativo = true } = req.body;
    const nomeNormalizado = String(nome || "").trim();
    const emailNormalizado = String(email || "").trim().toLowerCase();

    if (!nomeNormalizado || !emailNormalizado) {
      return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });
    }

    // Aceita o ID numérico quando disponível, mas também aceita o nome do perfil
    // (ou o tipo legado) para não quebrar instalações com IDs diferentes.
    const perfilNome = String(req.body.perfilNome || "").trim();
    const tipoRecebido = String(req.body.tipo || "").trim().toLowerCase();
    const nomePorTipo = { admin: "Administrador", mentor: "Mentor", aluno: "Aluno líder", lider: "Aluno líder", integrante: "Integrante" };
    const nomePerfilResolvido = perfilNome || nomePorTipo[tipoRecebido] || "";
    const perfilNumericId = parseId(perfilId);
    let perfil = perfilNumericId ? await Perfil.findByPk(perfilNumericId) : null;
    if (!perfil && nomePerfilResolvido) {
      perfil = await Perfil.findOne({ where: { nome: nomePerfilResolvido } });
    }
    if (!perfil) return res.status(400).json({ erro: "Perfil de acesso inválido. Selecione Administrador, Mentor, Aluno líder ou Integrante." });
    if (perfil.nome === "Administrador" && req.usuario.tipo !== "admin") {
      return res.status(403).json({ erro: "Somente administradores podem atribuir o perfil Administrador." });
    }

    const tipoPorPerfil = { "Administrador": "admin", "Mentor": "mentor", "Aluno líder": "aluno", "Integrante": "integrante" };
    const tipo = tipoPorPerfil[perfil.nome] || "integrante";
    const senhaTemporaria = senha ? String(senha) : gerarSenhaTemporaria();
    if (senhaTemporaria.length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });

    // Validação explícita antes do INSERT. O índice UNIQUE do PostgreSQL continua
    // sendo a proteção final contra condições de corrida.
    const usuarioExistente = await Usuario.findOne({
      where: { email: emailNormalizado },
      attributes: ["id", "email"],
    });
    if (usuarioExistente) {
      return res.status(409).json({ erro: "Já existe um usuário cadastrado com este e-mail." });
    }

    const usuario = await Usuario.create({
      nome: nomeNormalizado,
      email: emailNormalizado,
      senhaHash: hashSenha(senhaTemporaria).valor,
      tipo,
      perfilId: perfil.id,
      ativo: Boolean(ativo),
      deveAlterarSenha: true,
    });

    const usuarioCriado = await Usuario.findByPk(usuario.id, { ...safe, include: [perfilInclude] });

    // A conta já foi persistida no PostgreSQL. O SMTP não pode bloquear
    // nem impedir a criação do usuário.
    enviarConvite({
      nome: usuario.nome,
      email: usuario.email,
      senhaTemporaria,
      motivo: "sua conta foi criada pelo administrador",
    }).catch((emailError) => {
      console.error("[EMAIL] Falha ao enviar convite:", emailError.message);
    });

    res.status(201).json({
      ...usuarioCriado.toJSON(),
      avisoEmail: "Usuário criado com sucesso. O convite por e-mail está sendo enviado.",
    });
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") return res.status(409).json({ erro: "Já existe um usuário com este e-mail." });
    next(e);
  }
});

router.post("/:id/reset-senha", exigirPermissao("usuarios.editar"), async (req, res, next) => {
  try {
    const usuarioId=parseId(req.params.id);
    if (!usuarioId) return res.status(400).json({erro:"ID de usuário inválido."});
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (!usuario.ativo) return res.status(400).json({ erro: "Ative o usuário antes de redefinir a senha." });

    const senhaTemporaria = gerarSenhaTemporaria();
    await usuario.update({
      senhaHash: hashSenha(senhaTemporaria).valor,
      deveAlterarSenha: true,
      tokenResetSenha: null,
      tokenResetExpira: null,
    });

    await enviarConvite({
      nome: usuario.nome,
      email: usuario.email,
      senhaTemporaria,
      motivo: "a senha da sua conta foi redefinida pelo administrador",
    });

    res.json({ ok: true, mensagem: "Senha redefinida e novo convite enviado por e-mail." });
  } catch (e) {
    if (e.code === "EAUTH" || e.code === "ECONNECTION" || e.code === "ESOCKET") {
      return res.status(502).json({ erro: "A senha foi redefinida, mas não foi possível enviar o e-mail. Verifique o SMTP e tente novamente." });
    }
    next(e);
  }
});

router.patch("/:id", exigirPermissao("usuarios.editar"), async (req, res, next) => {
  try {
    const usuarioId=parseId(req.params.id);
    if (!usuarioId) return res.status(400).json({erro:"ID de usuário inválido."});
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });

    const data = {};
    for (const key of ["nome", "email", "ativo"]) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    if (data.nome !== undefined) {
      data.nome = String(data.nome).trim();
      if (!data.nome) return res.status(400).json({ erro: "O nome não pode ficar vazio." });
    }
    if (data.email !== undefined) {
      data.email = String(data.email).trim().toLowerCase();
      if (!data.email) return res.status(400).json({ erro: "O e-mail não pode ficar vazio." });

      const outroUsuario = await Usuario.findOne({
        where: { email: data.email },
        attributes: ["id"],
      });
      if (outroUsuario && Number(outroUsuario.id) !== Number(usuario.id)) {
        return res.status(409).json({ erro: "Já existe outro usuário cadastrado com este e-mail." });
      }
    }
    if (req.body.senha) {
      if (String(req.body.senha).length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });
      data.senhaHash = hashSenha(req.body.senha).valor;
    }

    // Perfil é a fonte de verdade do nível de acesso. Não aceitamos tipo/perfil
    // independentes, evitando combinações como tipo=admin + perfil=integrante.
    if (req.body.perfilId !== undefined) {
      const perfilId = parseId(req.body.perfilId);
      const perfilNome = String(req.body.perfilNome || "").trim();
      const nomePorTipo = { admin: "Administrador", mentor: "Mentor", aluno: "Aluno líder", lider: "Aluno líder", integrante: "Integrante" };
      let perfil = perfilId ? await Perfil.findByPk(perfilId) : null;
      if (!perfil && perfilNome) perfil = await Perfil.findOne({ where: { nome: perfilNome } });
      if (!perfil) return res.status(400).json({ erro: "Perfil de acesso inválido. Selecione um dos quatro perfis disponíveis." });
      if (perfil.nome === "Administrador" && req.usuario.tipo !== "admin") {
        return res.status(403).json({ erro: "Somente administradores podem atribuir o perfil Administrador." });
      }
      const tipoPorPerfil = { "Administrador": "admin", "Mentor": "mentor", "Aluno líder": "aluno", "Integrante": "integrante" };
      data.perfilId = perfil.id;
      data.tipo = tipoPorPerfil[perfil.nome] || "integrante";
    } else if (req.body.tipo !== undefined) {
      return res.status(400).json({ erro: "Altere o perfil de acesso; o tipo é definido automaticamente pelo perfil." });
    }

    // Evita deixar o sistema sem nenhum administrador ativo.
    if (data.ativo === false && usuario.tipo === "admin") {
      const adminsAtivos = await Usuario.count({ where: { tipo: "admin", ativo: true } });
      if (adminsAtivos <= 1) return res.status(400).json({ erro: "Não é possível desativar o último administrador ativo." });
    }

    await usuario.update(data);
    res.json(await Usuario.findByPk(usuario.id, { ...safe, include: [perfilInclude] }));
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") return res.status(409).json({ erro: "Já existe um usuário com este e-mail." });
    next(e);
  }
});

router.delete("/:id",exigirPermissao("usuarios.desativar"),async(req,res,next)=>{
  try {
    const usuarioId=parseId(req.params.id);
    if (!usuarioId) return res.status(400).json({erro:"ID de usuário inválido."});
    const u=await Usuario.findByPk(usuarioId);
    if(!u) return res.status(404).json({erro:"Usuário não encontrado."});
    if(Number(usuarioId)===Number(req.usuario.id)) return res.status(400).json({erro:"Você não pode desativar a própria conta."});
    if (u.tipo === "admin") {
      const adminsAtivos = await Usuario.count({ where: { tipo: "admin", ativo: true } });
      if (adminsAtivos <= 1) return res.status(400).json({ erro: "Não é possível desativar o último administrador ativo." });
    }
    await u.update({ativo:false});
    res.status(204).send();
  } catch(e) { next(e); }
});

module.exports=router;
