const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Lista de areas/setores da ideia, configuravel pelo administrador (RF-02).
const AreaIdeia = sequelize.define(
  "AreaIdeia",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  { tableName: "areas_ideia", timestamps: false }
);

module.exports = AreaIdeia;
