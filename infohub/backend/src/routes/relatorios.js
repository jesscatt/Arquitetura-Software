const express=require("express");
const { Op }=require("sequelize");
const { Equipe, Usuario, IntegranteEquipe, Tarefa, Entrega }=require("../models");
const { autenticar, exigirPermissao }=require("../middleware");
const router=express.Router();
router.use(autenticar);

const NOMES_ETAPAS={1:"Envio da ideia",2:"Contato com a equipe",3:"Encontro 1 - Entendendo a ideia",4:"Encontro 2 - Proposta de valor",5:"Encontro 3 - Modelo de negocio",6:"Encontro 4 - Pitch e inscricao"};

// Filtro por ciclo/turma e por etapa, usado por todos os relatorios (RF-24).
function filtroEquipes(query){
  const where={};
  if(query.ciclo) where.ciclo=query.ciclo;
  if(query.etapa) where.etapaAtual=Number(query.etapa);
  if(query.status) where.status=query.status;
  if(query.area) where.areaSetor=query.area;
  if(query.de||query.ate){
    where.criadoEm={};
    if(query.de) where.criadoEm[Op.gte]=new Date(`${query.de}T00:00:00`);
    if(query.ate) where.criadoEm[Op.lte]=new Date(`${query.ate}T23:59:59`);
  }
  return where;
}

// RF-22 - indicadores consolidados do funil InfoHub -> InovAMF.
router.get("/dashboard",exigirPermissao("relatorios.visualizar"),async(req,res,next)=>{try{
  const where=filtroEquipes(req.query);
  const equipes=await Equipe.findAll({where,attributes:["id","etapaAtual","status","areaSetor","ciclo","mentorId"]});
  const ids=equipes.map(e=>e.id);
  const tarefas=ids.length?await Tarefa.findAll({where:{equipeId:{[Op.in]:ids}},attributes:["id","status","equipeId","etapaRelacionada","dataEntrega","obrigatoria"]}):[];
  const porEtapa=Object.keys(NOMES_ETAPAS).map(n=>({etapa:Number(n),nome:NOMES_ETAPAS[n],total:equipes.filter(e=>Number(e.etapaAtual)===Number(n)).length}));
  const porArea=Object.entries(equipes.reduce((acc,e)=>{acc[e.areaSetor]=(acc[e.areaSetor]||0)+1;return acc;},{})).map(([area,total])=>({area,total}));
  const contaStatus=st=>tarefas.filter(t=>t.status===st).length;
  res.json({
    ciclo:req.query.ciclo||null,
    equipesTotal:equipes.length,
    equipesAtivas:equipes.filter(e=>e.status==="ativa").length,
    prontasInovamf:equipes.filter(e=>e.status==="pronta_inovamf").length,
    encaminhadasInovamf:equipes.filter(e=>e.status==="encaminhada_inovamf").length,
    inativas:equipes.filter(e=>e.status==="inativa").length,
    tarefasTotal:tarefas.length,
    tarefasAtrasadas:contaStatus("atrasada"),
    tarefasPendentes:contaStatus("pendente")+contaStatus("em_andamento"),
    tarefasAguardandoAvaliacao:contaStatus("entregue"),
    tarefasAprovadas:contaStatus("aprovada"),
    mentoresAtivos:new Set(equipes.map(e=>e.mentorId).filter(Boolean)).size,
    porEtapa,porArea,
  });
}catch(e){next(e);}});

// RF-23 - exportacao da lista de equipes em CSV (abre no Excel).
function csvCampo(valor){
  const texto=String(valor??"").replace(/"/g,'""');
  return `"${texto}"`;
}

router.get("/equipes.csv",exigirPermissao("relatorios.visualizar"),async(req,res,next)=>{try{
  const equipes=await Equipe.findAll({
    where:filtroEquipes(req.query),
    include:[
      {model:Usuario,as:"lider",attributes:["nome","email","telefone","curso","semestre"]},
      {model:Usuario,as:"mentor",attributes:["nome","email"]},
      {model:IntegranteEquipe,as:"integrantes",attributes:["nome","curso","semestre"]},
      {model:Tarefa,as:"tarefas",attributes:["status"]},
    ],
    order:[["id","ASC"]],
  });
  const cabecalho=["ID","Ciclo","Projeto","Area","Estagio","Etapa","Nome da etapa","Status","Lider","E-mail do lider","Telefone","Curso","Semestre","Mentor","Integrantes","Tarefas","Tarefas aprovadas","Tarefas atrasadas","Origem","Criado em"];
  const linhas=equipes.map(e=>[
    e.id,e.ciclo||"",e.nomeProjeto,e.areaSetor,e.estagioAtual,e.etapaAtual,NOMES_ETAPAS[e.etapaAtual]||"",e.status,
    e.lider?.nome||"",e.lider?.email||"",e.lider?.telefone||"",e.lider?.curso||"",e.lider?.semestre||"",
    e.mentor?.nome||"Sem mentor",
    (e.integrantes||[]).length,
    (e.tarefas||[]).length,
    (e.tarefas||[]).filter(t=>t.status==="aprovada").length,
    (e.tarefas||[]).filter(t=>t.status==="atrasada").length,
    e.origemDivulgacao||"",
    e.criadoEm?new Date(e.criadoEm).toLocaleDateString("pt-BR"):"",
  ]);
  // BOM + ponto e virgula: o Excel em portugues abre direto, sem assistente.
  const csv="\uFEFF"+[cabecalho,...linhas].map(l=>l.map(csvCampo).join(";")).join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename=infohub-equipes-${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
}catch(e){next(e);}});

// Exportacao detalhada de tarefas e entregas.
router.get("/tarefas.csv",exigirPermissao("relatorios.visualizar"),async(req,res,next)=>{try{
  const equipes=await Equipe.findAll({where:filtroEquipes(req.query),attributes:["id","nomeProjeto","ciclo"]});
  const mapa=new Map(equipes.map(e=>[e.id,e]));
  const tarefas=equipes.length?await Tarefa.findAll({
    where:{equipeId:{[Op.in]:equipes.map(e=>e.id)}},
    include:[{model:Entrega,as:"entregas",attributes:["versao","tipo","nomeArquivo","arquivoUrl","status","enviadoEm"]}],
    order:[["equipeId","ASC"],["dataEntrega","ASC"]],
  }):[];
  const cabecalho=["Equipe","Ciclo","Tarefa","Etapa","Obrigatoria","Prazo","Status","Entregas","Ultima entrega","Status da ultima entrega"];
  const linhas=tarefas.map(t=>{
    const entregas=[...(t.entregas||[])].sort((a,b)=>b.versao-a.versao);
    const ultima=entregas[0];
    return [
      mapa.get(t.equipeId)?.nomeProjeto||"",
      mapa.get(t.equipeId)?.ciclo||"",
      t.titulo,t.etapaRelacionada,t.obrigatoria?"Sim":"Nao",
      t.dataEntrega?new Date(`${String(t.dataEntrega).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR"):"",
      t.status,entregas.length,
      ultima?(ultima.tipo==="link"?ultima.arquivoUrl:ultima.nomeArquivo):"",
      ultima?ultima.status:"",
    ];
  });
  const csv="\uFEFF"+[cabecalho,...linhas].map(l=>l.map(csvCampo).join(";")).join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename=infohub-tarefas-${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
}catch(e){next(e);}});
function esc(s){return String(s??"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/\r?\n/g," ");}
function makePdf(lines,title){
 const pageLines=42, pages=[]; for(let i=0;i<lines.length;i+=pageLines) pages.push(lines.slice(i,i+pageLines));
 const objects=[]; const add=o=>{objects.push(o);return objects.length;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const pageIds=[],contentIds=[];
 pages.forEach((pg,pi)=>{const content=['BT','/F1 18 Tf','50 790 Td',`(${esc(title)}) Tj`,'/F1 9 Tf','0 -24 Td',`(${esc(`Página ${pi+1} de ${pages.length}`)}) Tj`,'0 -18 Td'];pg.forEach(line=>{content.push(`(${esc(line).slice(0,120)}) Tj`,'0 -15 Td');});content.push('ET');const stream=content.join('\n');const cid=add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);contentIds.push(cid);pageIds.push(add(null));});
 const pagesId=add(null); pageIds.forEach((pid,i)=>{objects[pid-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;}); objects[pagesId-1]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] >>`; const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 let pdf='%PDF-1.4\n',offs=[0]; objects.forEach((o,i)=>{offs[i+1]=Buffer.byteLength(pdf);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;}); const x=Buffer.byteLength(pdf); pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objects.length;i++) pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n'; pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${x}\n%%EOF`; return Buffer.from(pdf,'binary');
}
router.get("/equipes.pdf",exigirPermissao("relatorios.visualizar"),async(req,res,next)=>{try{
 const equipes=await Equipe.findAll({include:[{model:Usuario,as:"lider",attributes:["nome","email"]},{model:Usuario,as:"mentor",attributes:["nome","email"]},{model:IntegranteEquipe,as:"integrantes",attributes:["nome","curso","semestre","tipo"]}],order:[["id","ASC"]]});
 const lines=[`Gerado em ${new Date().toLocaleString("pt-BR")}`,`Total de equipes: ${equipes.length}`,""];
 equipes.forEach((e,i)=>{lines.push(`Equipe ${i+1}: ${e.nomeProjeto}`,`Área: ${e.areaSetor} | Estágio: ${e.estagioAtual} | Etapa: ${e.etapaAtual}/6`,`Status: ${e.status}`,`Líder: ${e.lider?.nome||"-"}`,`Mentor: ${e.mentor?.nome||"Sem mentor"}`,`Descrição: ${e.descricaoInicial||"-"}`,`Integrantes: ${e.integrantes?.length||0}`);(e.integrantes||[]).forEach(m=>lines.push(`  - ${m.nome} | ${m.curso}${m.semestre?` | ${m.semestre}`:""}`));lines.push("");});
 const pdf=makePdf(lines,"Relatório de Equipes — InfoHub");res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition","attachment; filename=relatorio-equipes-infohub.pdf");res.send(pdf);
 }catch(e){next(e);}});
module.exports=router;
