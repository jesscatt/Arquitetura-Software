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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- API REST ----
app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/equipes", equipesRouter);
app.use("/tarefas", tarefasRouter);
app.use("/entregas", entregasRouter);
app.use("/jornada", jornadaRouter);

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
  if (req.path.startsWith("/auth") || req.path.startsWith("/usuarios") || req.path.startsWith("/equipes") || req.path.startsWith("/tarefas") || req.path.startsWith("/entregas") || req.path.startsWith("/jornada")) {
    return next();
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---- Handler de erro genérico ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS deve_alterar_senha BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP;
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
    console.error("Não foi possível conectar ao banco:", err.message);
  }
  app.listen(PORT, () => {
    console.log(`InfoHub rodando em http://localhost:${PORT}`);
  });
}

start();
