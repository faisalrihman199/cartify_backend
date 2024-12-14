const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');


router.post('/createBilling', authMiddleware, controllers.billing.createBilling);
router.get('/getBilling', authMiddleware, controllers.billing.getBillingDetails);
router.post('/createPosBills', authMiddleware, controllers.billing.createPosBills);

module.exports = router;