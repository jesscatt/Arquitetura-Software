const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ModeloTarefa = sequelize.define(
  "ModeloTarefa",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    descricao: { type: DataTypes.TEXT },
    etapaRelacionada: { type: DataTypes.SMALLINT, allowNull: false, field: "etapa_relacionada" },
  },
  {
    tableName: "modelos_tarefa",
    timestamps: false,
  }
);

module.exports = ModeloTarefa;
