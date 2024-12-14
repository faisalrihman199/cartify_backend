const sequelize = require('../config/db');
const {DataTypes} = require('sequelize');

const posBills = sequelize.define('posBills', {
   
    billId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
    }
})


module.exports = posBills