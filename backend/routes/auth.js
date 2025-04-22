const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const authController = require("../controllers/authController");

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", authController.login);

// @route   POST /api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.post("/google", authController.googleAuth);

// @route   PUT /api/auth/update-location
// @desc    Update user location
// @access  Private
router.put("/update-location", protect, authController.updateLocation);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, authController.getMe);

module.exports = router;
