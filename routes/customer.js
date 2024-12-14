const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');

router.get('/paymentHistory', authMiddleware, controllers.customer.getPaginatedCustomerPaymentHistory);

module.exports = router;