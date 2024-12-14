const { validationResult } = require('express-validator'); // For validating incoming request data
const model = require('../models');

exports.createBrand = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
  
    const { name } = req.body; // Extract the name from the request body
    const brandId = req.query.id; // Get the brand ID from query parameters if it exists
    let user = req.user;
  
    try {
      if (brandId) {
        // If an id is provided, try to update the existing brand
        const brand = await model.brand.findByPk(brandId,
          {
            where: { userId: user.id }, // Only allow the user who created the brand to update it
          }
        );
        if (!brand) {
          return res.status(404).json({
            success: false,
            message: 'Brand not found.',
          });
        }
  
        // Check if the new name is the same as the existing one
        if (brand.name === name) {
          return res.status(400).json({
            success: false,
            message: 'The brand name is already the same.',
          });
        }
  
        // Update the brand name
        brand.name = name;
        await brand.save(); // Save the updated brand
  
        return res.status(200).json({
          success: true,
          message: 'Brand updated successfully.',
          data: brand,
        });
      } else {
        // If no id is provided, create a new brand
  
        // Check if a brand with the same name already exists
        const existingBrand = await model.brand.findOne({ where: { name, userId: user.id } });
        if (existingBrand) {
          return res.status(409).json({
            success: false,
            message: 'Brand with this name already exists.',
          });
        }
  
        // Create the new brand
        const newBrand = await model.brand.create({ name , userId: user.id });
  
        return res.status(201).json({
          success: true,
          message: 'Brand created successfully.',
          data: newBrand,
        });
      }
    } catch (error) {
      console.error('Error processing brand:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing the brand.',
        error: error.message,
      });
    }
  };


  exports.getAllBrandsPaginated = async (req, res) => {
    const user = req.user;
  
    // Check if the user is authorized to access this endpoint
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to view brands' });
    }
  
    try {
      // Extract pagination parameters from the query string
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
  
      // Fetch paginated brands for the specific user (admin)
      const { count, rows: brands } = await model.brand.findAndCountAll({
        where: { userId: user.id }, // Filter by the user's ID
        order: [['createdAt', 'DESC']],
      });
  
      // If no brands found, return a 404 response
      if (count === 0) {
        return res.status(404).json({ success: false, message: 'No brands found' });
      }
  
      // Return paginated brands and metadata
      return res.status(200).json({
        success: true,
        message: 'Brands fetched successfully',
        data: {
          brands,
          
            totalBrands: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page, 10),
          
        },
      });
    } catch (error) {
      console.error('Error fetching brands:', error);
  
      // Ensure any unexpected errors go into 500
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching brands',
        error: error.message,
      });
    }
  };
  
