const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const brand = sequelize.define('brand', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    
});

module.exports = brand;