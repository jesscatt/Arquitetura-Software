const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("EtapaJornada", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: { type: DataTypes.SMALLINT, allowNull: false, unique: true },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  entregavel: { type: DataTypes.TEXT },
}, { tableName: "etapas_jornada", timestamps: false });
