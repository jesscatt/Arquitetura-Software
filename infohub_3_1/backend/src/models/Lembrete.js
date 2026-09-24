const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Lembretes automaticos de uma tarefa (RF-17). O agendador varre esta tabela
// e envia os e-mails cuja data_envio ja passou e que ainda nao foram enviados.
const Lembrete = sequelize.define(
  "Lembrete",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarefaId: { type: DataTypes.INTEGER, allowNull: false, field: "tarefa_id" },
    tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "antecedencia" },
    diasAntes: { type: DataTypes.INTEGER, field: "dias_antes" },
    dataEnvio: { type: DataTypes.DATE, allowNull: false, field: "data_envio" },
    enviadoEm: { type: DataTypes.DATE, field: "enviado_em" },
    criadoPor: { type: DataTypes.INTEGER, field: "criado_por" },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  { tableName: "lembretes", timestamps: false }
);

module.exports = Lembrete;
