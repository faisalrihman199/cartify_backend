const model = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { generateJwtToken } = require('../utils/utils');
const speakeasy = require("speakeasy");
const sequelize = require('../config/db');
const {
  generateAndSendOtp,
}  = require('../utils/otp-functions');
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const verifyOtp = (email, otp) => {
  if (!email || !otp) {
    throw new Error("Both email and OTP are required for verification.");
  }

  // Verify the OTP
  return speakeasy.totp.verify({
    secret: email, // Same secret used during OTP generation
    encoding: "base32",
    token: otp,
    window: 2, // Allows a small timing window for validity
  });
};
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  try {
    await generateAndSendOtp(email);
    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


exports.createCustomer = async (req, res) => {
  const transaction = await sequelize.transaction(); // Start a transaction
  try {
    const { email, password, cnic, phoneNo, name, address, otp } = req.body;

    // Validate required fields
    if (!email || !password || !cnic || !phoneNo || !name || !address || !otp) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Verify OTP
    const isValidOtp = verifyOtp(email, otp);
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP or OTP expired." });
    }

    // Check if a user with the same email already exists
    const existingUser = await model.user.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already in use." });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user and customer within a transaction
    const user = await model.user.create(
      { email, password: hashedPassword, role: "customer" },
      { transaction }
    );

    await model.customer.create(
      { cnic, phoneNo, userId: user.id, name, address },
      { transaction }
    );

    await transaction.commit(); // Commit transaction

    return res.status(201).json({ success: true, message: "Customer created successfully." });
  } catch (error) {
    await transaction.rollback(); // Rollback transaction on error
    console.error("Error creating customer:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await model.user.findOne({ where: { email } });
   
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = generateJwtToken(payload);

    return res.status(200).json({ success: true, message: 'Login successful', data:{token,role:user.role} });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

exports.addAdmin = async (req, res) => {
  const transaction = await sequelize.transaction(); // Start a transaction

  try {
      const { email, password, name } = req.body;

      // Validate input fields
      if (!email || !password || !name) {
          return res.status(400).json({
              success: false,
              message: 'All fields (email, password, name) are required.',
          });
      }

      // Check if the email is already in use
      const existingUser = await model.user.findOne({ where: { email } });
      if (existingUser) {
          return res.status(409).json({
              success: false,
              message: 'Email is already in use. Please use a different email.',
          });
      }

      // Validate password strength (customize this as per your requirements)
      if (password.length < 8) {
          return res.status(400).json({
              success: false,
              message: 'Password must be at least 8 characters long.',
          });
      }

      // Hash the password securely
      const hashedPassword = await hashPassword(password);

      // Create the admin user within the transaction
      const adminUser = await model.user.create(
          { email, password: hashedPassword, role: 'admin' },
          { transaction }
      );

      // Create the associated company for the admin
      await model.company.create(
          { name, userId: adminUser.id },
          { transaction }
      );

      // Commit the transaction if everything is successful
      await transaction.commit();

      return res.status(201).json({
          success: true,
          message: 'Admin created successfully.',
      });

  } catch (error) {
      // Rollback the transaction on any error
      if (transaction) await transaction.rollback();

      // Log the error for debugging purposes
      console.error('Error creating admin:', error);

      // Return a generic error message
      return res.status(500).json({
          success: false,
          message: 'An internal server error occurred.',
      });
  }
};



exports.resetPassword = async (req, res) => {
  const { email, password , otp } = req.body;
  try {
    const isValidOtp = verifyOtp(email, otp);
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP or OTP expired." });
    }
    const user = await model.user.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const hashedPassword = await hashPassword(password);
    await user.update({ password: hashedPassword });
    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


