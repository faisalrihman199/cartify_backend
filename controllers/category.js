const model = require('../models'); // Import the models (assumes models are in the same folder)
const { validationResult } = require('express-validator'); // For validating incoming request data

exports.createOrUpdateCategory = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  let user = req.user;
  if(user.role !== 'admin'){
    return res.status(403).json({ success: false, message: 'You are not authorized to create or update a category' });
  }

  const { name } = req.body; // Extract the name from the request body
  const categoryId = req.query.id; // Get the category ID from query parameters if it exists

  try {
    if (categoryId) {
      // If an id is provided, try to update the existing category
      const category = await model.category.findByPk(categoryId,
        {
          where: { userId: user.id }, // Only allow the user who created the category to update it
        }
      );
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found.',
        });
      }

      // Check if the new name is the same as the existing one
      if (category.name === name) {
        return res.status(400).json({
          success: false,
          message: 'try giving a different name.',
        });
      }

      // Check if a category with the new name already exists
      const existingCategory = await model.category.findOne({ where: { name,userId: user.id } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Category with this name already exists.',
        });
      }

      // Update the category name
      category.name = name;
      await category.save(); // Save the updated category

      return res.status(200).json({
        success: true,
        message: 'Category updated successfully.',
        data: category,
      });
    } else {
      // If no id is provided, create a new category

      // Check if a category with the same name already exists
      const existingCategory = await model.category.findOne({ where: { name } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Category with this name already exists.',
        });
      }

      // Create the new category
      const newCategory = await model.category.create({ name, userId: user.id });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        data: newCategory,
      });
    }
  } catch (error) {
    console.error('Error processing category:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the category.',
      error: error.message,
    });
  }
};


exports.getAllCategoriesPaginated = async (req, res) => {
  const user = req.user;

  // Check if the user is authorized to access this endpoint
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You are not authorized to view categories' });
  }

  try {
    // Extract pagination parameters from the query string
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch paginated categories for the admin
    const { count, rows: categories } = await model.category.findAndCountAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
    });

    // If no categories found, return a 404 response
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'No categories found' });
    }

    // Return paginated categories and metadata
    return res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: {
        categories,
        
          totalCategories: count,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page, 10),
        
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);

    // Ensure any unexpected errors go into 500
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching categories',
      error: error.message,
    });
  }
};
