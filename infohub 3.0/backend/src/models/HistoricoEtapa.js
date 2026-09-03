const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HistoricoEtapa = sequelize.define(
  "HistoricoEtapa",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    equipeId: { type: DataTypes.INTEGER, allowNull: false, field: "equipe_id" },
    etapaAnterior: { type: DataTypes.SMALLINT, allowNull: false, field: "etapa_anterior" },
    etapaNova: { type: DataTypes.SMALLINT, allowNull: false, field: "etapa_nova" },
    alteradoPor: { type: DataTypes.INTEGER, allowNull: false, field: "alterado_por" },
    motivo: { type: DataTypes.TEXT },
    alteradoEm: { type: DataTypes.DATE, field: "alterado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "historico_etapas",
    timestamps: false,
  }
);

module.exports = HistoricoEtapa;
