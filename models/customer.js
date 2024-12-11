const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const Customer = sequelize.define('customer', {
    cnic: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phoneNo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false, // Set to true if name is optional
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null if the address is optional
    },
});

module.exports = Customer;
