const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Registro de todos os e-mails disparados pelo sistema (RNF-05 / RNF-06).
const EmailLog = sequelize.define(
  "EmailLog",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    destinatario: { type: DataTypes.STRING(180), allowNull: false },
    assunto: { type: DataTypes.STRING(255), allowNull: false },
    tipo: { type: DataTypes.STRING(60), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "enviado" },
    erro: { type: DataTypes.TEXT },
    tentativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    equipeId: { type: DataTypes.INTEGER, field: "equipe_id" },
    tarefaId: { type: DataTypes.INTEGER, field: "tarefa_id" },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  { tableName: "emails_log", timestamps: false }
);

module.exports = EmailLog;
