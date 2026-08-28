const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Anotacao = sequelize.define(
  "Anotacao",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    equipeId: { type: DataTypes.INTEGER, allowNull: false, field: "equipe_id" },
    autorId: { type: DataTypes.INTEGER, allowNull: false, field: "autor_id" },
    texto: { type: DataTypes.TEXT, allowNull: false },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "anotacoes",
    timestamps: false,
  }
);

module.exports = Anotacao;
