'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if 'categoryId' column exists in 'Products' table
    const tableDesc = await queryInterface.describeTable('Products');

    if (!tableDesc.categoryId) {
      await queryInterface.addColumn('Products', 'categoryId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Categories', // Name of the target table
          key: 'id', // Key in the target table
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // Check if 'brandId' column exists in 'Products' table
    if (!tableDesc.brandId) {
      await queryInterface.addColumn('Products', 'brandId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Brands', // Name of the target table
          key: 'id', // Key in the target table
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'categoryId' column if it exists
    const tableDesc = await queryInterface.describeTable('Products');

    if (tableDesc.categoryId) {
      await queryInterface.removeColumn('Products', 'categoryId');
    }

    // Remove 'brandId' column if it exists
    if (tableDesc.brandId) {
      await queryInterface.removeColumn('Products', 'brandId');
    }
  },
};
