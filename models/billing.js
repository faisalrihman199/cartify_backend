const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const Billing = sequelize.define('billing', {
    billId:{
        type:DataTypes.STRING,
        allowNull:false
    },
    quantity:{
        type:DataTypes.STRING,
        allowNull:false
    },
    totalPrice:{
        type:DataTypes.STRING,
        allowNull:false
    },
    status:{
        type:DataTypes.STRING,
        allowNull:false,
        defaultValue:"pending"
    }
},
{
    paranoid:true,
    timestamps:true
})
module.exports = Billing;

