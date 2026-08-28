const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("IntegranteEquipe", {
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true}, equipeId:{type:DataTypes.INTEGER,allowNull:false,field:"equipe_id"}, usuarioId:{type:DataTypes.INTEGER,field:"usuario_id"}, nome:{type:DataTypes.STRING(150),allowNull:false}, curso:{type:DataTypes.STRING(100),allowNull:false}, semestre:{type:DataTypes.STRING(20)}, tipo:{type:DataTypes.ENUM("lider","integrante"),defaultValue:"integrante"}
},{tableName:"integrantes_equipe",timestamps:false});
