const express=require("express");
const {Usuario,Perfil,Permissao}=require("../models");
const {autenticar,exigirPermissao}=require("../middleware");
const {hashSenha,gerarSenhaTemporaria}=require("./auth");
const {enviarConvite,enviarEmailTeste}=require("../services/mailer");
const router=express.Router();
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
    const perfil=await Perfil.findByPk(req.params.id);
    if(!perfil) return res.status(404).json({erro:"Perfil não encontrado."});
    const ids=Array.isArray(req.body.permissaoIds)?req.body.permissaoIds.map(Number).filter(Number.isInteger):[];
    await perfil.setPermissoes(ids);
    res.json(await Perfil.findByPk(perfil.id,{include:[perfilPermissoesInclude]}));
  } catch(e) { next(e); }
});

router.post("/", exigirPermissao("usuarios.criar"), async (req, res, next) => {
  try {
    const { nome, email, senha, perfilId, ativo = true } = req.body;
    if (!nome || !email) return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });

    const perfil = await Perfil.findByPk(Number(perfilId));
    if (!perfil) return res.status(400).json({ erro: "Perfil inválido." });
    if (perfil.nome === "Administrador" && req.usuario.tipo !== "admin") {
      return res.status(403).json({ erro: "Somente administradores podem atribuir o perfil Administrador." });
    }

    const tipoPorPerfil = { "Administrador": "admin", "Mentor": "mentor", "Aluno líder": "aluno", "Integrante": "integrante" };
    const tipo = tipoPorPerfil[perfil.nome] || "integrante";
    const senhaTemporaria = senha ? String(senha) : gerarSenhaTemporaria();
    if (senhaTemporaria.length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });

    const usuario = await Usuario.create({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash: hashSenha(senhaTemporaria).valor,
      tipo,
      perfilId: perfil.id,
      ativo: Boolean(ativo),
      deveAlterarSenha: true,
    });

    try {
      await enviarConvite({
        nome: usuario.nome,
        email: usuario.email,
        senhaTemporaria,
        motivo: "sua conta foi criada pelo administrador",
      });
    } catch (emailError) {
      console.error("[EMAIL] Falha ao enviar convite:", emailError.message);
      // A conta permanece criada; o administrador recebe a informação para reenviar o acesso pelo reset.
      return res.status(201).json({
        ...(await Usuario.findByPk(usuario.id, { ...safe, include: [perfilInclude] })).toJSON(),
        avisoEmail: "Usuário criado, mas o convite por e-mail não foi enviado. Verifique o SMTP e use 'Resetar senha' para reenviar.",
      });
    }

    res.status(201).json(await Usuario.findByPk(usuario.id, { ...safe, include: [perfilInclude] }));
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") return res.status(409).json({ erro: "Já existe um usuário com este e-mail." });
    next(e);
  }
});

router.post("/:id/reset-senha", exigirPermissao("usuarios.editar"), async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
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
    const usuario = await Usuario.findByPk(req.params.id);
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
    }
    if (req.body.senha) {
      if (String(req.body.senha).length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });
      data.senhaHash = hashSenha(req.body.senha).valor;
    }

    // Perfil é a fonte de verdade do nível de acesso. Não aceitamos tipo/perfil
    // independentes, evitando combinações como tipo=admin + perfil=integrante.
    if (req.body.perfilId !== undefined) {
      const perfil = await Perfil.findByPk(Number(req.body.perfilId));
      if (!perfil) return res.status(400).json({ erro: "Perfil inválido." });
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
    const u=await Usuario.findByPk(req.params.id);
    if(!u) return res.status(404).json({erro:"Usuário não encontrado."});
    if(Number(req.params.id)===Number(req.usuario.id)) return res.status(400).json({erro:"Você não pode desativar a própria conta."});
    if (u.tipo === "admin") {
      const adminsAtivos = await Usuario.count({ where: { tipo: "admin", ativo: true } });
      if (adminsAtivos <= 1) return res.status(400).json({ erro: "Não é possível desativar o último administrador ativo." });
    }
    await u.update({ativo:false});
    res.status(204).send();
  } catch(e) { next(e); }
});

module.exports=router;
