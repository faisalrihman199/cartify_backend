const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // Get token from the Authorization header
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1]; // Format: "Bearer <token>"
  
    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
    }

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the decoded token to the req.user object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error verifying JWT:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
};

module.exports = authMiddleware;
