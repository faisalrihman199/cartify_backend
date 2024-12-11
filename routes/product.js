const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');

router.post('/addProduct', authMiddleware, controllers.product.createProduct);
router.get('/getProducts', authMiddleware, controllers.product.getPaginatedProducts);
router.get('/getProduct/:productId', authMiddleware, controllers.product.getOneProduct)
router.delete('/deleteProduct/:productId', authMiddleware, controllers.product.deleteProduct);

module.exports = router;