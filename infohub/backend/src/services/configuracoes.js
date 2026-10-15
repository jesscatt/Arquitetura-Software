// Leitura em cache das configuracoes operacionais do sistema.
const { Configuracao } = require("../models");

let cache = null;
let carregadoEm = 0;
const TTL_MS = 60 * 1000;

const PADROES = {
  "ciclo.atual": "2026/2",
  "upload.tamanho_max_mb": "50",
  "upload.extensoes": "pdf,png,jpg,jpeg,webp,mp4,mov,pptx,docx,xlsx,zip",
  "equipe.max_integrantes": "6",
  "equipe.multiplas_por_aluno": "false",
  "lembretes.dias_padrao": "3,1,0",
  "jornada.exigir_tarefas_obrigatorias": "true",
};

async function todas() {
  if (cache && Date.now() - carregadoEm < TTL_MS) return cache;
  try {
    const linhas = await Configuracao.findAll();
    cache = { ...PADROES, ...Object.fromEntries(linhas.map((l) => [l.chave, l.valor])) };
  } catch (erro) {
    console.warn("[CONFIG] Nao foi possivel ler configuracoes, usando padroes:", erro.message);
    cache = { ...PADROES };
  }
  carregadoEm = Date.now();
  return cache;
}

async function texto(chave) {
  return (await todas())[chave] ?? PADROES[chave] ?? "";
}

async function numero(chave) {
  return Number(await texto(chave));
}

async function booleano(chave) {
  return String(await texto(chave)).toLowerCase() === "true";
}

async function lista(chave) {
  return String(await texto(chave))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function definir(chave, valor) {
  await Configuracao.upsert({ chave, valor: String(valor), atualizadoEm: new Date() });
  cache = null;
}

module.exports = { todas, texto, numero, booleano, lista, definir };
