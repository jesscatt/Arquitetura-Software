const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("Permissao", {
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true}, chave:{type:DataTypes.STRING(120),allowNull:false,unique:true}, modulo:{type:DataTypes.STRING(80),allowNull:false}, acao:{type:DataTypes.STRING(80),allowNull:false}, descricao:{type:DataTypes.STRING(255)}
},{tableName:"permissoes",timestamps:false});
