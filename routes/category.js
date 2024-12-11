const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');

router.post('/addCategory', authMiddleware, controllers.category.createOrUpdateCategory);
router.get('/getCategories', authMiddleware, controllers.category.getAllCategoriesPaginated);
module.exports = router;