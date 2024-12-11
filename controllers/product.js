const model = require('../models');
const { Op } = require('sequelize');

exports.createProduct = async (req, res) => {
    const { 
      brandId, 
      categoryId, 
      weight,
      stock,
      productName, 
      productCode, 
      productPrice, 
      description 
    } = req.body;
    
    const user = req.user;
    console.log("categoryId", categoryId);
    
    // Check if the user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to create or update a product' });
    }
  
    // Validate required fields
    if ( !productName || !productCode || !productPrice) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (brandName, productCategory, productName, productCode, productPrice) are required' 
      });
    }
  
    try {
      // Check if a productId is provided in the query parameters
      const { productId } = req.query;
  
      if (productId) {
        // If productId exists, update the product
        const existingProduct = await model.product.findByPk(productId);
  
        if (!existingProduct) {
          return res.status(404).json({ success: false, message: 'Product not found' });
        }
  
        // Check if the productCode is already used by another product (excluding the current product)
        const productWithSameCode = await model.product.findOne({
          where: { productCode, id: { [Op.ne]: productId } },
          paranoid: false // Include soft-deleted products
        });
  
        if (productWithSameCode) {
          return res.status(409).json({ success: false, message: 'Product code already exists' });
        }
  
        // Update the product
        existingProduct.brandId = brandId;
        existingProduct.categoryId = categoryId;
        existingProduct.productName = productName;
        existingProduct.productCode = productCode;
        existingProduct.productPrice = productPrice;
        existingProduct.description = description;
        existingProduct.weight = weight;
        existingProduct.stock = stock;
  
        await existingProduct.save();
  
        // Remove 'createdAt' and 'updatedAt' from the updated product object
        const { createdAt, updatedAt, ...updatedProductWithoutTimestamps } = existingProduct.toJSON();
  
        return res.status(200).json({ success: true, message: 'Product updated successfully', product: updatedProductWithoutTimestamps });
      } else {
        // If no productId is provided, create a new product
        const existingProduct = await model.product.findOne({
          where: { productCode },
          paranoid: false // Include soft-deleted products
        });
  
        if (existingProduct) {
          // If the product was soft-deleted, restore it (set status to 'active' and remove 'deletedAt')
          if (existingProduct.status === 'removed') {
            existingProduct.status = 'active';
            existingProduct.deletedAt = null;  // Remove deletedAt to restore the product
            await existingProduct.save();
  
            return res.status(200).json({ success: true, message: 'Product restored successfully', product: existingProduct });
          }
  
          // If the product is active, return conflict error
          return res.status(409).json({ success: false, message: 'Product code already exists' });
        }
  
        // Create the new product with status "active" by default
        const product = await model.product.create({
          brandId,
          categoryId,
          productName,
          productCode,
          productPrice,
          description,
          weight,
          stock,
          userId: user.id, // Associate the product with the admin user who created it
          status: 'active' // Default status is "active"
        }, {
          raw: true
        });
  
        // Remove 'createdAt' and 'updatedAt' from the product object
        const { createdAt, updatedAt, ...productWithoutTimestamps } = product;
  
        return res.status(201).json({ success: true, message: 'Product created successfully', data: productWithoutTimestamps.dataValues });
      }
    } catch (error) {
      console.error('Error creating or updating product:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

  exports.getPaginatedProducts = async (req, res) => {
    try {
      // Get pagination parameters from query params (default to page 1 and limit to 10)
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
      const offset = (page - 1) * limit; // Calculate the offset
  
      // Get the search parameter from query params (default to an empty string)
      const search = req.query.search || "";
  
      // Get the authenticated user
      const user = req.user;
  
      // Fetch paginated products associated with the user and filter by name if search is provided
      const products = await model.product.findAndCountAll({
        where: {
          userId: user.id, // Ensure the product belongs to the authenticated user
          productName: {
            [Op.like]: `%${search}%`, // Use Op.like with wildcard to filter by name containing the search value
          },
        },
        limit, // Limit the number of items returned per page
        offset, // Offset based on the current page
        order: [["createdAt", "DESC"]], // Optional: Order products by creation date (descending)
      });
  
      // Calculate total pages based on the total number of products and the limit
      const totalPages = Math.ceil(products.count / limit);
  
      // Return the paginated response
      return res.status(200).json({
        success: true,
        message: "Paginated products fetched successfully",
        data: {
          page,
          totalPages,
          totalItems: products.count,
          products: products.rows,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated products:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  exports.getOneProduct = async (req, res) => {
    try {
      // Get the productId from the request parameters
      const { productId } = req.params;
  
      // Check if productId is provided
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId is required' });
      }
  
      // Get the authenticated user
      const user = req.user;
  
      // Fetch the product with the given productId and ensure it belongs to the authenticated user
      const product = await model.product.findOne({
        where: { id: productId, UserId: user.id },  // Ensure the product belongs to the authenticated user
        attributes: { exclude: ['createdAt', 'updatedAt'] },  // Exclude createdAt and updatedAt fields
        raw: true,  // Return raw data instead of Sequelize model instances
      });
  
      // If the product is not found, return a 404 error
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found or you are not authorized to access it' });
      }
  
      // Return the found product
      return res.status(200).json({
        success: true,
        message: 'Product fetched successfully',
        data:product,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
  

  exports.deleteProduct = async (req, res) => {
    try {
      const { productId } = req.params;
      const user = req.user;
  
      // Check if the product exists
      const product = await model.product.findOne({
        where: { id: productId, UserId: user.id },
        paranoid: false // Include soft-deleted products
      });
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // Update the product status to 'removed' (soft delete)
      product.status = 'removed';
      await product.save();
  
      return res.status(200).json({ success: true, message: 'Product removed successfully' });
    } catch (error) {
      console.error('Error removing product:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };



  const { v4: uuidv4 } = require('uuid');




