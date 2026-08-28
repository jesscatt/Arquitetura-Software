const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Equipe = sequelize.define(
  "Equipe",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    liderId: { type: DataTypes.INTEGER, allowNull: false, field: "lider_id" },
    nomeProjeto: { type: DataTypes.STRING(150), allowNull: false, field: "nome_projeto" },
    descricaoInicial: { type: DataTypes.TEXT, allowNull: false, field: "descricao_inicial" },
    areaSetor: { type: DataTypes.STRING(100), allowNull: false, field: "area_setor" },
    estagioAtual: {
      type: DataTypes.ENUM("ideia", "prototipo", "mvp_desenvolvimento", "mvp_pronto"),
      allowNull: false,
      field: "estagio_atual",
    },
    origemDivulgacao: { type: DataTypes.STRING(100), field: "origem_divulgacao" },
    etapaAtual: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1, field: "etapa_atual" },
    status: {
      type: DataTypes.ENUM("ativa", "pronta_inovamf", "encaminhada_inovamf", "inativa"),
      allowNull: false,
      defaultValue: "ativa",
    },
    mentorId: { type: DataTypes.INTEGER, field: "mentor_id" },
    criadoEm: { type: DataTypes.DATE, field: "criado_em", defaultValue: DataTypes.NOW },
  },
  {
    tableName: "equipes",
    timestamps: false,
  }
);

module.exports = Equipe;
