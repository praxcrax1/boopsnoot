/**
 * Image Service - Abstraction layer for image upload services
 * 
 * This service provides a consistent interface for image upload operations,
 * making it easy to switch between different providers (Cloudinary, AWS S3, etc.)
 * without changing the application code.
 */
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

// Configure the active provider based on environment variable
const UPLOAD_PROVIDER = process.env.UPLOAD_PROVIDER || 'cloudinary';

// Configure Cloudinary
if (UPLOAD_PROVIDER === 'cloudinary') {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

class ImageService {
    constructor() {
        // Select the provider based on configuration
        this.provider = UPLOAD_PROVIDER;
    }

    /**
     * Upload an image file to the storage service
     * @param {string} filePath - Path to the local file
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Upload result with standardized properties
     */
    async uploadImage(filePath, options = {}) {
        try {
            let result;

            // Standardized options with defaults
            const uploadOptions = {
                folder: options.folder || 'uploads',
                uniqueFilename: options.uniqueFilename !== false, // default to true
                ...options
            };
            
            // Upload using the selected provider
            switch (this.provider) {
                case 'cloudinary':
                    result = await this._uploadWithCloudinary(filePath, uploadOptions);
                    break;
                // Add other providers here in the future
                // case 'aws':
                //    result = await this._uploadWithAWS(filePath, uploadOptions);
                //    break;
                default:
                    throw new Error(`Unsupported upload provider: ${this.provider}`);
            }

            // Optionally delete the local file after successful upload
            if (options.deleteLocal) {
                fs.unlinkSync(filePath);
            }

            return result;
        } catch (error) {
            console.error(`Image upload error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete an image from the storage service
     * @param {string} publicId - The ID of the image to delete
     * @param {Object} options - Delete options
     * @returns {Promise<Object>} - Delete result
     */
    async deleteImage(publicId, options = {}) {
        try {
            let result;
            
            switch (this.provider) {
                case 'cloudinary':
                    result = await cloudinary.uploader.destroy(publicId);
                    break;
                // Add other providers here in the future
                default:
                    throw new Error(`Unsupported upload provider: ${this.provider}`);
            }
            
            return {
                success: true,
                result
            };
        } catch (error) {
            console.error(`Image deletion error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Implementation for Cloudinary upload
     * @private
     */
    async _uploadWithCloudinary(filePath, options) {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            folder: options.folder,
            use_filename: true,
            unique_filename: options.uniqueFilename,
            ...options
        });

        // Return a standardized result object
        return {
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            originalResponse: uploadResult
        };
    }

    /**
     * Get provider-specific information
     * @returns {Object} - Provider info
     */
    getProviderInfo() {
        return {
            name: this.provider,
            isConfigured: this.provider === 'cloudinary' && 
                process.env.CLOUDINARY_CLOUD_NAME && 
                process.env.CLOUDINARY_API_KEY && 
                process.env.CLOUDINARY_API_SECRET,
        };
    }
}

// Create a singleton instance
const imageService = new ImageService();

module.exports = imageService;