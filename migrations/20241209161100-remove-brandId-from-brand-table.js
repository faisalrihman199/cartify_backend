'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Describe the 'Brands' table to check its current structure
    const tableDescription = await queryInterface.describeTable('Brands');

    // Remove 'brandId' column only if it exists
    if (tableDescription.brandId) {
      await queryInterface.removeColumn('Brands', 'brandId');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Describe the 'Brands' table to check if 'brandId' doesn't already exist
    const tableDescription = await queryInterface.describeTable('Brands');

    // Add 'brandId' column back only if it doesn't exist
    if (!tableDescription.brandId) {
      await queryInterface.addColumn('Brands', 'brandId', {
        type: Sequelize.INTEGER,
        allowNull: true, // Adjust as needed
      });
    }
  },
};
