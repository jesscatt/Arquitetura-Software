const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Entrega = sequelize.define(
  "Entrega",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarefaId: { type: DataTypes.INTEGER, allowNull: false, field: "tarefa_id" },
    enviadoPor: { type: DataTypes.INTEGER, allowNull: false, field: "enviado_por" },
    arquivoUrl: { type: DataTypes.STRING(255), allowNull: false, field: "arquivo_url" },
    enviadoEm: { type: DataTypes.DATE, field: "enviado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "entregas",
    timestamps: false,
  }
);

module.exports = Entrega;
