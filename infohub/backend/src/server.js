require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const usuariosRouter = require("./routes/usuarios");
const inscricaoRouter = require("./routes/inscricao");
const configuracoesRouter = require("./routes/configuracoes");
const equipesRouter = require("./routes/equipes");
const tarefasRouter = require("./routes/tarefas");
const { router: authRouter } = require("./routes/auth");
const entregasRouter = require("./routes/entregas");
const jornadaRouter = require("./routes/jornada");
const auditoriaRouter = require("./routes/auditoria");
const { Auditoria } = require("./models");
const relatoriosRouter = require("./routes/relatorios");

const app = express();
const PORT = process.env.PORT || 3000;
// Em servidor escuta em todas as interfaces. No computador pessoal (npm start
// sem DB_HOST) o iniciar.js define HOST=127.0.0.1 para o Windows não pedir
// liberação no Firewall.
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Prefixos tratados como API. Tudo o que nao estiver aqui cai no front-end.
const PREFIXOS_API = ["/auth", "/usuarios", "/equipes", "/tarefas", "/entregas", "/jornada", "/auditoria", "/relatorios", "/inscricao", "/configuracoes", "/health"];

// Auditoria das operações de escrita. O registro usa req.usuario preenchido pelo middleware de autenticação.
app.use((req,res,next)=>{
  const originalEnd=res.end;
  res.end=function(...args){
    try {
      const isWrite=["POST","PATCH","PUT","DELETE"].includes(req.method);
      const isLogin=req.path === "/auth/login";
      if(isWrite || isLogin){
        const parts=req.path.split("/").filter(Boolean);
        const modulo=parts[0]||"sistema";
        const acao=isLogin?"LOGIN":req.method;
        const usuarioId=req.usuario?.id || null;
        const detalhes=JSON.stringify({status:res.statusCode,rota:req.originalUrl});
        Auditoria.create({usuarioId,acao,modulo,rota:req.originalUrl.slice(0,180),metodo:req.method,detalhes,ip:req.headers["x-forwarded-for"]||req.socket.remoteAddress||null}).catch(err=>console.error("[AUDITORIA]",err.message));
      }
    } catch(err){ console.error("[AUDITORIA]",err.message); }
    return originalEnd.apply(this,args);
  };
  next();
});

// Preparação do banco (schema, tabelas e seed). O servidor começa a escutar
// na hora; as rotas da API esperam essa preparação terminar. Na Vercel isso
// evita que a função caia por demorar a subir.
let bancoPronto = Promise.resolve();
const SQL = require("./db/sql");
const statusBanco = { pronto: false, erros: [] };
app.use(async (req, res, next) => {
  if (PREFIXOS_API.some((prefixo) => req.path === prefixo || req.path.startsWith(`${prefixo}/`))) {
    try { await bancoPronto; } catch (_) {}
  }
  next();
});

// ---- API REST ----
app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/equipes", equipesRouter);
app.use("/tarefas", tarefasRouter);
app.use("/entregas", entregasRouter);
app.use("/jornada", jornadaRouter);
app.use("/auditoria", auditoriaRouter);
app.use("/relatorios", relatoriosRouter);
app.use("/inscricao", inscricaoRouter);
app.use("/configuracoes", configuracoesRouter);

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    const [[{ usuarios }]] = await sequelize.query(
      "SELECT CASE WHEN to_regclass('usuarios') IS NULL THEN -1 ELSE (SELECT count(*) FROM usuarios) END::int AS usuarios"
    );
    const ok = usuarios > 0 && statusBanco.erros.length === 0;
    res.status(ok ? 200 : 500).json({
      status: ok ? "ok" : "erro",
      banco: "conectado",
      usuarios: usuarios < 0 ? "tabela não existe" : usuarios,
      erros: statusBanco.erros,
    });
  } catch (err) {
    res.status(500).json({ status: "erro", detalhe: err.message, erros: statusBanco.erros });
  }
});

// ---- Front-end estático (mesma aplicação, um único comando/porta) ----
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.get("*", (req, res, next) => {
  if (PREFIXOS_API.some((prefixo) => req.path === prefixo || req.path.startsWith(`${prefixo}/`))) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---- Handler de erro genérico ----
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ erro: "Arquivo maior do que o limite aceito pelo servidor." });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function conectarComRetry(tentativas = 15, intervaloMs = 3000) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await sequelize.authenticate();
      return true;
    } catch (err) {
      console.error(`Tentativa ${i}/${tentativas} de conectar ao banco falhou: ${err.message}`);
      if (i < tentativas) await sleep(intervaloMs);
    }
  }
  return false;
}

async function prepararBanco() {
  const conectado = await conectarComRetry(process.env.VERCEL ? 3 : 15);
  if (conectado) {
    try {
      // 1) Schema da dupla: cria se ainda não existir. Se o professor já criou,
      // não tenta criar de novo (o usuário da dupla pode não ter essa permissão).
      const schema = sequelize.DB_SCHEMA;
      const [[{ schemaExiste }]] = await sequelize.query(
        'SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = :schema) AS "schemaExiste"',
        { replacements: { schema } }
      );
      if (!schemaExiste) {
        await sequelize.query(`CREATE SCHEMA "${schema}"`);
        console.log(`Schema "${schema}" criado.`);
      }
      console.log(`Usando o schema "${schema}".`);

      // 2) Banco novo: cria as tabelas base antes de tudo.
      // Sem isso, as migrações abaixo falham porque a tabela "usuarios" não existe.
      const [[{ existe }]] = await sequelize.query(
        "SELECT to_regclass(quote_ident(:schema) || '.usuarios') IS NOT NULL AS existe",
        { replacements: { schema } }
      );
      if (!existe) {
        await sequelize.query(SQL.init);
        console.log("Banco vazio detectado: 001_init.sql aplicado com sucesso.");
      }
      await sequelize.query(`
        ALTER TABLE usuarios
          ADD COLUMN IF NOT EXISTS perfil_id INTEGER REFERENCES perfis(id),
          ADD COLUMN IF NOT EXISTS deve_alterar_senha BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP;

        CREATE TABLE IF NOT EXISTS auditoria_logs (
          id SERIAL PRIMARY KEY, usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          acao VARCHAR(30) NOT NULL, modulo VARCHAR(60) NOT NULL, rota VARCHAR(180) NOT NULL,
          metodo VARCHAR(10) NOT NULL, detalhes TEXT, ip VARCHAR(80), criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON auditoria_logs(criado_em DESC);
        CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_logs(usuario_id);

        -- Corrige sequências após importações/restaurações com IDs explícitos.
        SELECT setval(
          pg_get_serial_sequence('usuarios', 'id'),
          COALESCE((SELECT MAX(id) FROM usuarios), 0) + 1,
          false
        );
        SELECT setval(
          pg_get_serial_sequence('perfis', 'id'),
          COALESCE((SELECT MAX(id) FROM perfis), 0) + 1,
          false
        );
      `);
      // Migrações/seed aplicados automaticamente no deploy.
      // Migrações/seed aplicados automaticamente no deploy.
      for (const [nomeArquivo, conteudo] of [["002_v2.sql", SQL.v2], ["003_g1_seed.sql", SQL.seed]]) {
        try {
          await sequelize.query(conteudo);
          console.log(`${nomeArquivo} aplicado com sucesso.`);
        } catch (erroBanco) {
          statusBanco.erros.push(`${nomeArquivo}: ${erroBanco.message}`);
          console.error(`Falha ao aplicar ${nomeArquivo}:`, erroBanco.message);
        }
      }
      require("./services/armazenamento").garantirDiretorio();
      console.log("Conectado ao Postgres com sucesso.");
      // Testa o e-mail em segundo plano, sem atrasar a subida do sistema.
      const { verificarSMTP } = require("./services/mailer");
      Promise.resolve()
        .then(() => verificarSMTP())
        .catch((mailErr) => {
          console.warn("[EMAIL] SMTP indisponível:", mailErr.message);
          console.warn("[EMAIL] Configure SMTP_* nas variáveis de ambiente antes de usar convites em produção.");
        });
    } catch (err) {
      statusBanco.erros.push(`preparação: ${err.message}`);
      console.error("Falha ao preparar o banco:", err.message);
    }
  } else {
    statusBanco.erros.push("não foi possível conectar ao banco");
    console.error("Não foi possível conectar ao banco após várias tentativas. O servidor vai subir mesmo assim, mas as rotas que dependem do banco vão falhar.");
  }
  if (conectado && !process.env.VERCEL) {
    // Lembretes automaticos e marcacao de tarefas atrasadas (RF-17/RN-04).
    // Na Vercel não há processo contínuo, então o agendador fica desligado.
    require("./services/agendador").iniciar();
  }
}

bancoPronto = prepararBanco()
  .catch((err) => {
    statusBanco.erros.push(`preparação: ${err.message}`);
    console.error("Falha ao preparar o banco:", err.message);
  })
  .finally(() => { statusBanco.pronto = true; });

app.listen(PORT, HOST, () => {
  console.log(`InfoHub rodando em http://localhost:${PORT}`);
  console.log(`Inscricao publica de alunos: http://localhost:${PORT}/inscricao.html`);
});
