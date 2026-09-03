const path = require("path");
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const usuariosRouter = require("./routes/usuarios");
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

app.use(cors());
app.use(express.json());

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

// ---- API REST ----
app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/equipes", equipesRouter);
app.use("/tarefas", tarefasRouter);
app.use("/entregas", entregasRouter);
app.use("/jornada", jornadaRouter);
app.use("/auditoria", auditoriaRouter);
app.use("/relatorios", relatoriosRouter);

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "ok", banco: "conectado" });
  } catch (err) {
    res.status(500).json({ status: "erro", detalhe: err.message });
  }
});

// ---- Front-end estático (mesma aplicação, um único comando/porta) ----
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/auth") || req.path.startsWith("/usuarios") || req.path.startsWith("/equipes") || req.path.startsWith("/tarefas") || req.path.startsWith("/entregas") || req.path.startsWith("/jornada") || req.path.startsWith("/auditoria") || req.path.startsWith("/relatorios")) {
    return next();
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---- Handler de erro genérico ----
app.use((err, req, res, next) => {
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

async function start() {
  const conectado = await conectarComRetry();
  if (conectado) {
    try {
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
      console.log("Conectado ao Postgres com sucesso.");
      try {
        const { verificarSMTP } = require("./services/mailer");
        await verificarSMTP();
      } catch (mailErr) {
        console.warn("[EMAIL] SMTP indisponível:", mailErr.message);
        console.warn("[EMAIL] Configure SMTP_* no docker-compose/.env antes de usar convites em produção.");
      }
    } catch (err) {
      console.error("Falha ao preparar o banco:", err.message);
    }
  } else {
    console.error("Não foi possível conectar ao banco após várias tentativas. O servidor vai subir mesmo assim, mas as rotas que dependem do banco vão falhar.");
  }
  app.listen(PORT, () => {
    console.log(`InfoHub rodando em http://localhost:${PORT}`);
  });
}

start();
