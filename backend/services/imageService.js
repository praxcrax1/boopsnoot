/**
 * Image Service - Abstraction layer for image upload services
 * 
 * This service provides a consistent interface for image upload operations,
 * making it easy to switch between different providers (Cloudinary, AWS S3, etc.)
 * without changing the application code.
 */
const cloudinary = require("cloudinary").v2;
const AWS = require('aws-sdk');
const fs = require("fs");
const path = require("path");
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

// Configure AWS S3
if (UPLOAD_PROVIDER === 'aws') {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
    });
}

class ImageService {
    constructor() {
        // Select the provider based on configuration
        this.provider = UPLOAD_PROVIDER;
        
        // Initialize S3 client if using AWS
        if (this.provider === 'aws') {
            this.s3 = new AWS.S3();
            this.bucketName = process.env.AWS_S3_BUCKET_NAME;
            
            if (!this.bucketName) {
                console.warn('AWS S3 bucket name not provided. Using default: "pet-uploads"');
                this.bucketName = 'pet-uploads';
            }
            
            // Check if AWS credentials are properly configured
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                console.error('AWS credentials are not properly configured');
            }
        }
    }

    /**
     * Upload an image file to the storage service
     * @param {string} filePath - Path to the local file
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Upload result with standardized properties
     */
    async uploadImage(filePath, options = {}) {
        try {
            console.log(`Starting upload with provider: ${this.provider}, file: ${filePath}`);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found at path: ${filePath}`);
            }
            
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
                case 'aws':
                    result = await this._uploadWithAWS(filePath, uploadOptions);
                    break;
                default:
                    throw new Error(`Unsupported upload provider: ${this.provider}`);
            }

            // Optionally delete the local file after successful upload
            if (options.deleteLocal) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Local file ${filePath} deleted successfully`);
                } catch (deleteError) {
                    console.warn(`Failed to delete local file ${filePath}: ${deleteError.message}`);
                    // Non-fatal error, continue execution
                }
            }

            return result;
        } catch (error) {
            console.error(`Image upload error with provider ${this.provider}: ${error.message}`);
            console.error(error.stack);
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
                case 'aws':
                    result = await this._deleteFromAWS(publicId);
                    break;
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
        try {
            console.log(`Uploading to Cloudinary: ${filePath}`);
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
        } catch (error) {
            console.error(`Cloudinary upload error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Implementation for AWS S3 upload
     * @private
     */
    async _uploadWithAWS(filePath, options) {
        try {
            console.log(`Uploading to AWS S3: ${filePath}, bucket: ${this.bucketName}`);
            
            // Read file content
            const fileContent = fs.readFileSync(filePath);
            
            // Generate a unique key for S3 object
            const fileName = path.basename(filePath);
            let key;
            
            if (options.uniqueFilename) {
                const timestamp = new Date().getTime();
                const randomStr = Math.random().toString(36).substring(2, 10);
                key = `${options.folder}/${timestamp}-${randomStr}-${fileName}`;
            } else {
                key = `${options.folder}/${fileName}`;
            }
            
            // Set up the S3 upload parameters
            const params = {
                Bucket: this.bucketName,
                Key: key,
                Body: fileContent,
                ContentType: this._getContentType(fileName),
                ACL: 'public-read' // Make the uploaded file publicly accessible
            };
            
            console.log(`AWS S3 upload params: Bucket=${params.Bucket}, Key=${params.Key}, ContentType=${params.ContentType}`);
            
            // Upload to S3
            const uploadResult = await this.s3.upload(params).promise();
            console.log(`AWS S3 upload successful: ${uploadResult.Location}`);
            
            // Return a standardized result object (similar to Cloudinary)
            return {
                success: true,
                url: uploadResult.Location,
                publicId: key,
                originalResponse: uploadResult
            };
        } catch (error) {
            console.error(`AWS S3 upload error: ${JSON.stringify(error)}`);
            throw error;
        }
    }
    
    /**
     * Implementation for AWS S3 deletion
     * @private
     */
    async _deleteFromAWS(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        
        const deleteResult = await this.s3.deleteObject(params).promise();
        
        return deleteResult;
    }
    
    /**
     * Helper method to determine content type based on file extension
     * @private
     */
    _getContentType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            default:
                return 'application/octet-stream';
        }
    }

    /**
     * Get provider-specific information
     * @returns {Object} - Provider info
     */
    getProviderInfo() {
        if (this.provider === 'cloudinary') {
            return {
                name: this.provider,
                isConfigured: 
                    process.env.CLOUDINARY_CLOUD_NAME && 
                    process.env.CLOUDINARY_API_KEY && 
                    process.env.CLOUDINARY_API_SECRET,
            };
        } else if (this.provider === 'aws') {
            return {
                name: this.provider,
                isConfigured: 
                    process.env.AWS_ACCESS_KEY_ID && 
                    process.env.AWS_SECRET_ACCESS_KEY && 
                    process.env.AWS_REGION && 
                    process.env.AWS_S3_BUCKET_NAME,
            };
        }
        
        return {
            name: this.provider,
            isConfigured: false
        };
    }
}

// Create a singleton instance
const imageService = new ImageService();

module.exports = imageService;