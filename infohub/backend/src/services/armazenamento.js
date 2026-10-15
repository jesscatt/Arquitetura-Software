// =====================================================================
// Armazenamento dos arquivos entregues pelos alunos (RF-14 / RNF-04).
// Os arquivos ficam fora da pasta publica e so podem ser baixados por
// rota autenticada, respeitando o escopo de acesso de cada perfil.
// =====================================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./configuracoes");

const DIRETORIO = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");

function garantirDiretorio() {
  if (!fs.existsSync(DIRETORIO)) fs.mkdirSync(DIRETORIO, { recursive: true });
  return DIRETORIO;
}

function extensaoDe(nome) {
  return path.extname(String(nome || "")).replace(".", "").toLowerCase();
}

function nomeSeguro(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-120) || "arquivo";
}

async function limites() {
  return {
    tamanhoMaxMb: await config.numero("upload.tamanho_max_mb"),
    extensoes: await config.lista("upload.extensoes"),
  };
}

// Valida extensao e tamanho antes de gravar qualquer byte em disco.
async function validar({ nomeOriginal, tamanhoBytes }) {
  const { tamanhoMaxMb, extensoes } = await limites();
  const extensao = extensaoDe(nomeOriginal);
  if (!extensao) return { ok: false, erro: "O arquivo precisa ter uma extensão válida." };
  if (!extensoes.includes(extensao)) {
    return { ok: false, erro: `Tipo de arquivo não permitido (.${extensao}). Aceitos: ${extensoes.join(", ")}.` };
  }
  if (!tamanhoBytes) return { ok: false, erro: "Arquivo vazio." };
  if (tamanhoBytes > tamanhoMaxMb * 1024 * 1024) {
    return { ok: false, erro: `O arquivo excede o limite de ${tamanhoMaxMb} MB.` };
  }
  return { ok: true, extensao };
}

function gravar({ buffer, nomeOriginal }) {
  garantirDiretorio();
  const extensao = extensaoDe(nomeOriginal);
  const nomeFisico = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extensao ? `.${extensao}` : ""}`;
  fs.writeFileSync(path.join(DIRETORIO, nomeFisico), buffer);
  return { nomeFisico, nomeExibicao: nomeSeguro(nomeOriginal) };
}

function caminhoDe(nomeFisico) {
  const destino = path.join(DIRETORIO, path.basename(String(nomeFisico || "")));
  return fs.existsSync(destino) ? destino : null;
}

function remover(nomeFisico) {
  const destino = caminhoDe(nomeFisico);
  if (destino) fs.unlinkSync(destino);
}

module.exports = { DIRETORIO, garantirDiretorio, validar, gravar, caminhoDe, remover, limites, nomeSeguro };
