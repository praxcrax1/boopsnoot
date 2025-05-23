const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Google OAuth routes
router.post("/google/token", authController.googleAuth);

// Protected routes
router.get("/me", protect, authController.getMe);
router.put("/update-location", protect, authController.updateLocation);
router.post("/push-token", protect, authController.storePushToken);

module.exports = router;
