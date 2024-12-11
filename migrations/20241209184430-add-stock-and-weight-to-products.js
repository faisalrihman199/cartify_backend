'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add `stock` and `weight` columns to the `Products` table
    await queryInterface.addColumn('Products', 'stock', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '0', // Default value for new records
    });

    await queryInterface.addColumn('Products', 'weight', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '100', // Default value for new records
    });

    // Set default values for existing records where deletedAt is NULL (i.e., non-soft-deleted products)
    await queryInterface.sequelize.query(`
      UPDATE Products
      SET stock = '1', weight = '100'
      WHERE deletedAt IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove `stock` and `weight` columns from the `Products` table
    await queryInterface.removeColumn('Products', 'stock');
    await queryInterface.removeColumn('Products', 'weight');
  },
};
