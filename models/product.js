const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');


const Product = sequelize.define('product', {
    
    productName:{
        type: DataTypes.STRING,
        allowNull: false
    },
    productCode:{
        type: DataTypes.STRING,
        allowNull: false
    },
    productPrice:{
        type: DataTypes.STRING,
        allowNull: false
    },
    description:{
        type: DataTypes.STRING,
        allowNull: false
    },
    status:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
    },
    stock:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '0'

    },
    weight:{
        type: DataTypes.STRING,
        allowNull: false
    }
},{
    paranoid:true,
    timestamps:true
})

module.exports = Product