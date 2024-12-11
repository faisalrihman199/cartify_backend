const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');

router.post('/addBrand', authMiddleware, controllers.brand.createBrand);
router.get('/getBrands', authMiddleware, controllers.brand.getAllBrandsPaginated);

module.exports = router;