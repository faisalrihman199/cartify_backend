const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const authMiddleware = require('../middlewares/authmiddleware');

router.get('/getPosBills', authMiddleware, controllers.company.getAllPendingPosBillsPaginated);
router.post('/updatePosBill', authMiddleware, controllers.company.setPosBillAsPaid);
router.post('/onlinePayment', authMiddleware, controllers.company.posOnlinePayment);
router.post('/webhook',express.json({type: 'application/json'}), controllers.company.stripeWebhook);

module.exports = router;