// =====================================================================
// Ponto de entrada para rodar em QUALQUER computador (npm start).
//
// - Se DB_HOST estiver definido (.env ou variáveis do servidor), usa esse
//   Postgres normalmente, como no deploy.
// - Se não estiver, sobe um Postgres embutido (pacote embedded-postgres),
//   que já vem com os binários para Windows, macOS e Linux. Não precisa
//   instalar Postgres, Docker nem alterar nada no computador.
// - Se AUTH_SECRET não estiver definido, gera um e guarda em .dados/.
// =====================================================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PASTA_DADOS = path.join(__dirname, "..", ".dados");

function garantirAuthSecret() {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) return;
  fs.mkdirSync(PASTA_DADOS, { recursive: true });
  const arquivo = path.join(PASTA_DADOS, "auth_secret");
  if (!fs.existsSync(arquivo)) fs.writeFileSync(arquivo, crypto.randomBytes(32).toString("hex"));
  process.env.AUTH_SECRET = fs.readFileSync(arquivo, "utf8").trim();
}

async function subirPostgresEmbutido() {
  let EmbeddedPostgres;
  try {
    EmbeddedPostgres = (await import("embedded-postgres")).default;
  } catch (err) {
    console.error("Postgres embutido não encontrado. Rode 'npm install' dentro da pasta backend e tente de novo.");
    console.error("Detalhe:", err.message);
    process.exit(1);
  }

  const porta = Number(process.env.EMBEDDED_PG_PORT || 54329); // porta incomum para não brigar com outro Postgres
  const pastaBanco = path.join(PASTA_DADOS, "postgres");
  const senha = "infohub123";

  const pg = new EmbeddedPostgres({
    databaseDir: pastaBanco,
    user: "infohub",
    password: senha,
    port: porta,
    persistent: true,
    onLog: () => {}, // silencioso; erros continuam aparecendo
  });

  if (!fs.existsSync(path.join(pastaBanco, "PG_VERSION"))) {
    console.log("Preparando o banco local pela primeira vez (leva alguns segundos)...");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("infohub");
  } catch (err) {
    if (!/already exists|já existe/i.test(err.message)) throw err;
  }

  process.env.DB_HOST = "127.0.0.1";
  process.env.DB_PORT = String(porta);
  process.env.DB_NAME = "infohub";
  process.env.DB_USER = "infohub";
  process.env.DB_PASSWORD = senha;
  if (!process.env.HOST) process.env.HOST = "127.0.0.1"; // evita o aviso do Firewall do Windows

  let parando = false;
  const parar = async () => {
    if (parando) return;
    parando = true;
    try { await pg.stop(); } catch (_) {}
    process.exit(0);
  };
  process.on("SIGINT", parar);
  process.on("SIGTERM", parar);
  console.log(`Banco local pronto (Postgres embutido na porta ${porta}).`);
}

(async () => {
  garantirAuthSecret();
  if (!process.env.DB_HOST && !process.env.DATABASE_URL) await subirPostgresEmbutido();
  require("./server");
})().catch((err) => {
  console.error("Falha ao iniciar o InfoHub:", err);
  process.exit(1);
});
