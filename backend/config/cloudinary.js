/**
 * This file is kept for backward compatibility.
 * New code should use the imageService abstraction instead.
 */

// Import the image service that contains the configured provider
const imageService = require('../services/imageService');
const cloudinary = require('cloudinary').v2;

// This file now returns cloudinary for backward compatibility
module.exports = cloudinary;
