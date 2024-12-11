const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateJwtToken = (payload, options = {}) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d', ...options });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate token');
  }
};

module.exports = { generateJwtToken };
