const crypto=require("crypto");
const express=require("express");
const {Usuario,Perfil,Permissao}=require("../models");
const {autenticar}=require("../middleware");
const router=express.Router();

function hashSenha(senha,salt=crypto.randomBytes(16).toString("hex")){
  return {valor:`scrypt$${salt}$${crypto.scryptSync(senha,salt,64).toString("hex")}`,salt};
}
function senhaValida(senha,armazenada){
  if(!armazenada?.startsWith("scrypt$")) return false;
  const [,salt,esperado]=armazenada.split("$");
  const atual=crypto.scryptSync(senha,salt,64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(atual,"hex"),Buffer.from(esperado,"hex"));
}
function gerarSenhaTemporaria(){
  return crypto.randomBytes(9).toString("base64url") + "A1!";
}

router.post("/login",async(req,res)=>{
  try{
    const {email,senha}=req.body;
    if(!email||!senha)return res.status(400).json({erro:"Informe e-mail e senha."});
    const usuario=await Usuario.findOne({
      where:{email:email.trim().toLowerCase(),ativo:true},
      include:[{model:Perfil,as:"perfil",include:[{model:Permissao,as:"permissoes",through:{attributes:[]}}]}]
    });
    if(!usuario||!senhaValida(senha,usuario.senhaHash))return res.status(401).json({erro:"E-mail ou senha inválidos."});

    await usuario.update({ultimoAcesso:new Date()});
    res.json({
      accessToken:`demo-${usuario.id}`,
      user:{
        id:usuario.id,name:usuario.nome,email:usuario.email,role:usuario.tipo,
        profile:usuario.perfil?.nome,
        permissions:(usuario.perfil?.permissoes||[]).map(p=>p.chave),
        mustChangePassword:Boolean(usuario.deveAlterarSenha)
      }
    });
  }catch(e){console.error(e);res.status(500).json({erro:"Erro interno no login."});}
});

router.post("/change-password",autenticar,async(req,res)=>{
  try{
    const {senhaAtual,novaSenha}=req.body;
    if(!senhaAtual||!novaSenha)return res.status(400).json({erro:"Informe a senha atual e a nova senha."});
    if(String(novaSenha).length<8)return res.status(400).json({erro:"A nova senha deve ter pelo menos 8 caracteres."});
    if(!senhaValida(senhaAtual,req.usuario.senhaHash))return res.status(401).json({erro:"A senha atual está incorreta."});
    if(senhaAtual===novaSenha)return res.status(400).json({erro:"A nova senha deve ser diferente da senha atual."});
    await req.usuario.update({senhaHash:hashSenha(novaSenha).valor,deveAlterarSenha:false,tokenResetSenha:null,tokenResetExpira:null});
    res.json({ok:true,mustChangePassword:false});
  }catch(e){console.error(e);res.status(500).json({erro:"Não foi possível alterar a senha."});}
});

module.exports={router,hashSenha,gerarSenhaTemporaria};
