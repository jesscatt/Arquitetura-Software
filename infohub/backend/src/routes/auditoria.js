const express = require("express");
const { Auditoria, Usuario } = require("../models");
const { autenticar, exigirPermissao } = require("../middleware");
const router = express.Router();
router.use(autenticar);
router.get("/", exigirPermissao("auditoria.visualizar"), async (req,res,next)=>{
  try {
    const limit=Math.min(Math.max(Number(req.query.limit)||100,1),500);
    const logs=await Auditoria.findAll({
      include:[{model:Usuario,as:"usuario",attributes:["id","nome","email"]}],
      order:[["criadoEm","DESC"]],limit
    });
    res.json(logs);
  } catch(e){next(e);}
});
module.exports=router;
