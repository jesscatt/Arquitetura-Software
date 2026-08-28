const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tarefa = sequelize.define(
  "Tarefa",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    equipeId: { type: DataTypes.INTEGER, allowNull: false, field: "equipe_id" },
    modeloTarefaId: { type: DataTypes.INTEGER, field: "modelo_tarefa_id" },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    descricao: { type: DataTypes.TEXT },
    etapaRelacionada: { type: DataTypes.SMALLINT, allowNull: false, field: "etapa_relacionada" },
    dataEntrega: { type: DataTypes.DATEONLY, allowNull: false, field: "data_entrega" },
    status: {
      type: DataTypes.ENUM("pendente", "em_andamento", "entregue", "atrasada", "aprovada", "reprovada"),
      allowNull: false,
      defaultValue: "pendente",
    },
    criadoPor: { type: DataTypes.INTEGER, allowNull: false, field: "criado_por" },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "tarefas",
    timestamps: false,
  }
);

module.exports = Tarefa;
