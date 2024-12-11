const speakeasy = require("speakeasy");
const { sendEmail } = require("../config/nodemailer");

/**
 * Generates an OTP using the user's email and sends it via email.
 *
 * @param {string} email - The user's email address.
 * @returns {Promise<void>} - Resolves when the email is sent successfully.
 * @throws {Error} - Throws an error if email is not provided or sending fails.
 */
const generateAndSendOtp = async (email) => {
  if (!email) {
    throw new Error("Email is required to generate OTP.");
  }

  // Generate OTP
  const otp = speakeasy.totp({
    secret: email, // Using email as the secret
    encoding: "base32",
  });

  // Prepare email options
  const mailOptions = {
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
  };

  // Send the OTP email
  await sendEmail(mailOptions);
};

/**
 * Verifies the provided OTP against the secret derived from the email.
 *
 * @param {string} email - The user's email address.
 * @param {string} otp - The OTP to verify.
 * @returns {boolean} - `true` if the OTP is valid, `false` otherwise.
 * @throws {Error} - Throws an error if email or OTP is not provided.
 */
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

module.exports = {
  generateAndSendOtp,
  verifyOtp,
};
