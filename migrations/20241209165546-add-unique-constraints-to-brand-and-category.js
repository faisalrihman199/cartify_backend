'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the constraint already exists before adding it (for 'brands')
    const [brandsConstraints] = await queryInterface.sequelize.query(`
      SELECT * FROM information_schema.table_constraints
      WHERE table_name = 'brands' AND constraint_name = 'unique_brand_name'
    `);

    if (brandsConstraints.length === 0) {
      // Add the unique constraint to 'name' in 'brands' table
      await queryInterface.addConstraint('brands', {
        fields: ['name'],
        type: 'unique',
        name: 'unique_brand_name',
      });
    }

    // Check if the constraint already exists before adding it (for 'categories')
    const [categoriesConstraints] = await queryInterface.sequelize.query(`
      SELECT * FROM information_schema.table_constraints
      WHERE table_name = 'categories' AND constraint_name = 'unique_category_name'
    `);

    if (categoriesConstraints.length === 0) {
      // Add the unique constraint to 'name' in 'categories' table
      await queryInterface.addConstraint('categories', {
        fields: ['name'],
        type: 'unique',
        name: 'unique_category_name',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique constraint from 'brands' table
    await queryInterface.removeConstraint('brands', 'unique_brand_name');

    // Remove the unique constraint from 'categories' table
    await queryInterface.removeConstraint('categories', 'unique_category_name');
  }
};
