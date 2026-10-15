const { Sequelize } = require("sequelize");

// As variáveis abaixo vêm do arquivo backend/.env (carregado pelo dotenv em server.js)
// ou das variáveis de ambiente do Coolify.
const {
  DB_HOST = "localhost",
  DB_PORT = 5432,
  DB_NAME = "infohub",
  DB_USER = "infohub",
  DB_PASSWORD = "infohub123",
  DB_SCHEMA = "public", // no banco do professor: o schema da dupla
  DB_SSL = "false",
} = process.env;

// O nome do schema entra direto no SQL, então só aceitamos nomes simples.
if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(DB_SCHEMA)) {
  throw new Error(`DB_SCHEMA inválido: "${DB_SCHEMA}". Use só letras, números e _.`);
}

// Bancos na nuvem (Neon, Supabase, Vercel Postgres) entregam uma URL única
// em DATABASE_URL e exigem SSL. Se ela existir, tem prioridade sobre DB_*.
const { DATABASE_URL } = process.env;
const usarSSL = Boolean(DATABASE_URL) || ["1", "true", "sim"].includes(String(DB_SSL).toLowerCase());
const opcoes = {
  dialect: "postgres",
  logging: false, // mude para console.log se quiser ver o SQL gerado no terminal
  dialectOptions: usarSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
};

const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, opcoes)
  : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, { ...opcoes, host: DB_HOST, port: DB_PORT });

// Toda conexão do pool passa a enxergar primeiro o schema da dupla.
// Assim tabelas, seed e consultas ficam isoladas das outras duplas.
sequelize.addHook("afterConnect", async (connection) => {
  await connection.query(`SET search_path TO "${DB_SCHEMA}"`);
});

sequelize.DB_SCHEMA = DB_SCHEMA;

module.exports = sequelize;
