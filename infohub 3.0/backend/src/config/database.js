const { Sequelize } = require("sequelize");

// As variáveis abaixo vêm do docker-compose.yml (serviço "backend" -> environment).
// Em desenvolvimento local fora do Docker, você pode exportá-las no seu terminal
// ou criar um arquivo .env e usar a lib "dotenv" (não incluída aqui de propósito,
// pra manter o projeto simples).
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
