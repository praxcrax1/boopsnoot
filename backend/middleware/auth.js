// Load environment variables directly in the middleware
require('dotenv').config();

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized, user not found",
                });
            }

            next();
        } catch (error) {
            console.error("Auth error:", error);
            return res.status(401).json({
                success: false,
                message: "Not authorized, invalid token",
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, no token",
        });
    }
};

module.exports = {
    protect,
};
