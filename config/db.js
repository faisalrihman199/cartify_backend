var {Sequelize}  = require("sequelize")
require('dotenv').config();
const sequelize = new Sequelize({
    host:process.env.DB_HOST,
    username: process.env.DB_USER, 
    password : process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dialect: 'mysql',
    logging: false, 
    pool: {
        max: 150,
        min: 0,
        acquire: 30000000, 
        idle: 10000
      }
});


// async () => {
//    sequelize.sync();
// }

(async () => {
   try {
       await sequelize.sync();
       console.log('Database synchronized successfully');
   } catch (error) {
       console.error('Error synchronizing database:', error);
   }
})();



module.exports = sequelize;