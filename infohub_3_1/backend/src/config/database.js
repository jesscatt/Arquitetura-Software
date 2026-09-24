const { Sequelize } = require("sequelize");

// As variáveis abaixo vêm do arquivo backend/.env (carregado pelo dotenv em server.js).
// Copie backend/.env.example para backend/.env e ajuste os valores para o seu Postgres local.
const {
  DB_HOST = "localhost",
  DB_PORT = 5432,
  DB_NAME = "infohub",
  DB_USER = "infohub",
  DB_PASSWORD = "infohub123",
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
  logging: false, // mude para console.log se quiser ver o SQL gerado no terminal
});

module.exports = sequelize;
