const express = require('express');
const router = express.Router();
const controllers = require('../controllers');

router.post('/signup', controllers.user.createCustomer);
router.post('/login', controllers.user.login);
router.post('/addAdmin', controllers.user.addAdmin);
router.post('/sendOtp', controllers.user.sendOtp);
router.post('/resetPassword', controllers.user.resetPassword);
module.exports = router;

