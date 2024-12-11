'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Customers');

    if (!tableDescription.name) {
      await queryInterface.addColumn('Customers', 'name', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }

    if (!tableDescription.address) {
      await queryInterface.addColumn('Customers', 'address', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Customers');

    if (tableDescription.name) {
      await queryInterface.removeColumn('Customers', 'name');
    }

    if (tableDescription.address) {
      await queryInterface.removeColumn('Customers', 'address');
    }
  },
};
