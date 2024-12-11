const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');


const Company = sequelize.define('company', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
   
})

module.exports = Company;
    