const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');


router.post('/createBilling', authMiddleware, controllers.billing.createBilling);

module.exports = router;