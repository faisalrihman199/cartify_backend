var express = require('express');
var router = express.Router();
var user = require("./user");
var product = require("./product");
var brand = require("./brand");
var category = require("./category");
var billing = require("./billing");
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Cartify' , message: 'Welcome to Cartify'});
});

router.use('/user', user);
router.use('/product', product);
router.use('/brand', brand);
router.use('/category', category);
router.use('/billing', billing);
module.exports = router;
