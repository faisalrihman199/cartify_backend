'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Describe the 'Products' table to check its current structure
    const tableDescription = await queryInterface.describeTable('Products');

    // Remove 'productCategory' column only if it exists
    if (tableDescription.productCategory) {
      await queryInterface.removeColumn('Products', 'productCategory');
    }

    // Remove 'brandName' column only if it exists
    if (tableDescription.brandName) {
      await queryInterface.removeColumn('Products', 'brandName');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Products');

    // Add 'productCategory' column back only if it doesn't exist
    if (!tableDescription.productCategory) {
      await queryInterface.addColumn('Products', 'productCategory', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }

    // Add 'brandName' column back only if it doesn't exist
    if (!tableDescription.brandName) {
      await queryInterface.addColumn('Products', 'brandName', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },
};
