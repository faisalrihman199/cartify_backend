'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename table from 'Products' to 'product'
    await queryInterface.renameTable('Products', 'product');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the table name change, in case you need to rollback
    await queryInterface.renameTable('product', 'Products');
  },
};
