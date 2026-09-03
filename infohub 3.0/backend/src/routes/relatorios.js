const express=require("express");
const { Equipe, Usuario, IntegranteEquipe }=require("../models");
const { autenticar, exigirPermissao }=require("../middleware");
const router=express.Router();
router.use(autenticar);
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
