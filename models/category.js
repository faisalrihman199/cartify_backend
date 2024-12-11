const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const Category = sequelize.define('category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    
    
});



module.exports = Category;