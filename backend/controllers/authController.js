const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
        });

        // Generate token
        const token = user.generateAuthToken();

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Generate token
        const token = user.generateAuthToken();

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: "Access token is required",
            });
        }

        // Use the access token to get user info from Google
        const response = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch user data from Google");
        }

        const payload = await response.json();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check if email exists
            const existingEmail = await User.findOne({ email });

            if (existingEmail) {
                // Link Google account to existing email account
                existingEmail.googleId = googleId;
                existingEmail.isGoogleUser = true;
                existingEmail.profilePicture = existingEmail.profilePicture || picture;
                await existingEmail.save();
                user = existingEmail;
            } else {
                // Create new user with Google data
                user = await User.create({
                    name,
                    email,
                    googleId,
                    isGoogleUser: true,
                    profilePicture: picture,
                });
            }
        }

        // Generate token
        const token = user.generateAuthToken();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
            },
            token,
        });
    } catch (error) {
        console.error("Google authentication error:", error);
        res.status(500).json({
            success: false,
            message: "Google authentication failed",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// @desc    Update user location
// @route   PUT /api/auth/update-location
// @access  Private
exports.updateLocation = async (req, res) => {
    try {
        const { location } = req.body;

        if (!location || !location.coordinates || location.coordinates.length !== 2) {
            return res.status(400).json({
                success: false,
                message: "Valid location coordinates are required",
            });
        }

        // Update user with new location data
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { location } },
            { new: true }
        ).select("-password");

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Update location error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// @desc    Store push notification token
// @route   POST /api/auth/push-token
// @access  Private
exports.storePushToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Push notification token is required",
            });
        }

        // Update user with new push token
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { pushToken: token } },
            { new: true }
        ).select("-password");

        res.status(200).json({
            success: true,
            message: "Push notification token stored successfully",
        });
    } catch (error) {
        console.error("Store push token error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};