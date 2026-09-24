const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("Perfil", {
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true}, nome:{type:DataTypes.STRING(80),allowNull:false,unique:true}, descricao:{type:DataTypes.STRING(255)}, sistema:{type:DataTypes.BOOLEAN,defaultValue:false,field:"sistema"}
},{tableName:"perfis",timestamps:false});
