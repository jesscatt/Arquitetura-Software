const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Entrega = sequelize.define(
  "Entrega",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarefaId: { type: DataTypes.INTEGER, allowNull: false, field: "tarefa_id" },
    enviadoPor: { type: DataTypes.INTEGER, allowNull: false, field: "enviado_por" },
    arquivoUrl: { type: DataTypes.STRING(500), allowNull: false, field: "arquivo_url" },
    tipo: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "link" },
    nomeArquivo: { type: DataTypes.STRING(255), field: "nome_arquivo" },
    mimeType: { type: DataTypes.STRING(150), field: "mime_type" },
    tamanhoBytes: { type: DataTypes.BIGINT, field: "tamanho_bytes" },
    versao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "enviada" },
    avaliacao: { type: DataTypes.TEXT },
    nota: { type: DataTypes.DECIMAL(5, 2) },
    avaliadoPor: { type: DataTypes.INTEGER, field: "avaliado_por" },
    avaliadoEm: { type: DataTypes.DATE, field: "avaliado_em" },
    enviadoEm: { type: DataTypes.DATE, field: "enviado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "entregas",
    timestamps: false,
  }
);

module.exports = Entrega;
