const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Parametros operacionais do sistema (limites de upload, ciclo atual, etc.).
const Configuracao = sequelize.define(
  "Configuracao",
  {
    chave: { type: DataTypes.STRING(80), primaryKey: true },
    valor: { type: DataTypes.TEXT, allowNull: false },
    descricao: { type: DataTypes.STRING(255) },
    atualizadoEm: { type: DataTypes.DATE, field: "atualizado_em", defaultValue: DataTypes.NOW },
  },
  { tableName: "configuracoes", timestamps: false }
);

module.exports = Configuracao;
