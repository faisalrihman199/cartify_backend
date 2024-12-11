const user =require('./user');
const customer = require('./customer');
const product = require('./product');
const category = require('./category');
const brand = require('./brand');
const company = require('./company');
const billing = require('./billing');
const models = {
    user,
    customer,
    product,
    category,
    brand,
    company,
    billing
}




user.hasOne(customer);
customer.belongsTo(user);

user.hasOne(company);
company.belongsTo(user);

user.hasOne(product);
product.belongsTo(user);

user.hasMany(category)
category.belongsTo(user)

user.hasMany(brand)
brand.belongsTo(user)

customer.hasMany(billing)
billing.belongsTo(customer)

product.hasMany(billing)
billing.belongsTo(product)

// Product belongs to one Category
product.belongsTo(category, {
    foreignKey: 'categoryId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  
  // Category has many Products
  category.hasMany(product, {
    foreignKey: 'categoryId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  
  // Product belongs to one Brand
  product.belongsTo(brand, {
    foreignKey: 'brandId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  
  // Brand has many Products
  brand.hasMany(product, {
    foreignKey: 'brandId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  


module.exports = models;