const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("Auditoria", {
  id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
  usuarioId:{type:DataTypes.INTEGER,field:"usuario_id"},
  acao:{type:DataTypes.STRING(30),allowNull:false},
  modulo:{type:DataTypes.STRING(60),allowNull:false},
  rota:{type:DataTypes.STRING(180),allowNull:false},
  metodo:{type:DataTypes.STRING(10),allowNull:false},
  detalhes:{type:DataTypes.TEXT},
  ip:{type:DataTypes.STRING(80)},
  criadoEm:{type:DataTypes.DATE,field:"criado_em",defaultValue:DataTypes.NOW}
},{tableName:"auditoria_logs",timestamps:false});
