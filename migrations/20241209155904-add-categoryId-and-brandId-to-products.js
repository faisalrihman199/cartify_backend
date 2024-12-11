'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('products');

    // Add categoryId column if it doesn't exist
    if (!tableDescription.categoryId) {
      await queryInterface.addColumn('products', 'categoryId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await queryInterface.addConstraint('products', {
        fields: ['categoryId'],
        type: 'foreign key',
        name: 'products_categoryId_fk',
        references: {
          table: 'categories',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // Add brandId column if it doesn't exist
    if (!tableDescription.brandId) {
      await queryInterface.addColumn('products', 'brandId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await queryInterface.addConstraint('products', {
        fields: ['brandId'],
        type: 'foreign key',
        name: 'products_brandId_fk',
        references: {
          table: 'brands',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('products');

    // Remove brandId and categoryId constraints and columns only if they exist
    if (tableDescription.categoryId) {
      await queryInterface.removeConstraint('products', 'products_categoryId_fk');
      await queryInterface.removeColumn('products', 'categoryId');
    }

    if (tableDescription.brandId) {
      await queryInterface.removeConstraint('products', 'products_brandId_fk');
      await queryInterface.removeColumn('products', 'brandId');
    }
  },
};
