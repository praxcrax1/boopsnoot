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
const { Readable } = require('stream');

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
     * Upload an image file or buffer to the storage service
     * @param {string|Buffer} fileInput - Path to the local file or Buffer containing file data
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Upload result with standardized properties
     */
    async uploadImage(fileInput, options = {}) {
        try {
            console.log(`Starting upload with provider: ${this.provider}`);
            
            let result;
            const isBuffer = Buffer.isBuffer(fileInput) || (fileInput && fileInput.buffer && Buffer.isBuffer(fileInput.buffer));
            
            // Log the type of input we're dealing with
            console.log(`Upload input type: ${isBuffer ? 'Buffer' : 'File path'}`);
            
            if (!isBuffer && typeof fileInput === 'string') {
                // Check if file exists when a path is provided
                if (!fs.existsSync(fileInput)) {
                    throw new Error(`File not found at path: ${fileInput}`);
                }
            }

            // Standardized options with defaults
            const uploadOptions = {
                folder: options.folder || 'uploads',
                uniqueFilename: options.uniqueFilename !== false, // default to true
                ...options
            };
            
            // Upload using the selected provider
            switch (this.provider) {
                case 'cloudinary':
                    result = await this._uploadWithCloudinary(fileInput, uploadOptions);
                    break;
                case 'aws':
                    result = await this._uploadWithAWS(fileInput, uploadOptions);
                    break;
                default:
                    throw new Error(`Unsupported upload provider: ${this.provider}`);
            }

            // Optionally delete the local file after successful upload if it's a file path
            if (!isBuffer && options.deleteLocal && typeof fileInput === 'string') {
                try {
                    fs.unlinkSync(fileInput);
                    console.log(`Local file ${fileInput} deleted successfully`);
                } catch (deleteError) {
                    console.warn(`Failed to delete local file ${fileInput}: ${deleteError.message}`);
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
    async _uploadWithCloudinary(fileInput, options) {
        try {
            console.log(`Uploading to Cloudinary`);
            
            let uploadResult;
            
            if (Buffer.isBuffer(fileInput) || (fileInput && fileInput.buffer && Buffer.isBuffer(fileInput.buffer))) {
                // Handle buffer upload for Cloudinary using buffer upload API
                const buffer = fileInput.buffer || fileInput;
                
                // Create a promise to handle the buffer upload
                uploadResult = await new Promise((resolve, reject) => {
                    // Create upload stream to Cloudinary
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: options.folder,
                            use_filename: true,
                            unique_filename: options.uniqueFilename,
                            ...options
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    
                    // Create a readable stream from the buffer and pipe to Cloudinary
                    const bufferStream = new Readable();
                    bufferStream.push(buffer);
                    bufferStream.push(null); // Signal end of stream
                    bufferStream.pipe(uploadStream);
                });
            } else {
                // Use direct file upload for path-based input
                uploadResult = await cloudinary.uploader.upload(fileInput, {
                    folder: options.folder,
                    use_filename: true,
                    unique_filename: options.uniqueFilename,
                    ...options
                });
            }

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
    async _uploadWithAWS(fileInput, options) {
        try {
            console.log(`Uploading to AWS S3, bucket: ${this.bucketName}`);
            
            let fileContent;
            let fileName;
            
            // Handle different input types
            if (Buffer.isBuffer(fileInput)) {
                // Direct buffer input
                fileContent = fileInput;
                fileName = `image-${Date.now()}.jpg`; // Default filename for direct buffers
            } else if (fileInput && fileInput.buffer && Buffer.isBuffer(fileInput.buffer)) {
                // Multer file object with buffer
                fileContent = fileInput.buffer;
                fileName = fileInput.originalname || `image-${Date.now()}.jpg`;
            } else if (typeof fileInput === 'string') {
                // File path
                fileContent = fs.readFileSync(fileInput);
                fileName = path.basename(fileInput);
            } else {
                throw new Error('Invalid file input: must be a Buffer, Multer file object, or file path string');
            }
            
            // Generate a unique key for S3 object
            let key;
            
            if (options.uniqueFilename) {
                const timestamp = new Date().getTime();
                const randomStr = Math.random().toString(36).substring(2, 10);
                key = `${options.folder}/${timestamp}-${randomStr}-${fileName}`;
            } else {
                key = `${options.folder}/${fileName}`;
            }
            
            // Determine content type
            const contentType = fileInput.mimetype || this._getContentType(fileName);
            
            // Set up the S3 upload parameters
            // Removed ACL parameter since the bucket has ACLs disabled
            const params = {
                Bucket: this.bucketName,
                Key: key,
                Body: fileContent,
                ContentType: contentType
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