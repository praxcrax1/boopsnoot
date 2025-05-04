const Pet = require("../models/Pet");
const Match = require("../models/Match");
const Chat = require("../models/Chat");
const imageService = require("../services/imageService");
const fs = require("fs");
const path = require("path");

// @desc    Create a new pet profile
// @route   POST /api/pets
// @access  Private
exports.createPet = async (req, res) => {
    try {
        const {
            name,
            breed,
            type,
            age,
            gender,
            size,
            vaccinated,
            photos,
            description,
            activityLevel,
            temperament,
            preferredPlaymates,
        } = req.body;

        // Validation - require at least 2 photos
        if (!photos || !Array.isArray(photos) || photos.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Please add at least 2 photos of your pet",
            });
        }

        // Create pet with owner ID from authenticated user
        const pet = new Pet({
            owner: req.user.id,
            name,
            breed,
            type,
            age,
            gender,
            size,
            vaccinated,
            photos,
            description,
            activityLevel,
            temperament,
            preferredPlaymates,
        });

        const savedPet = await pet.save();

        res.status(201).json({
            success: true,
            pet: savedPet,
        });
    } catch (error) {
        console.error("Create pet error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// @desc    Upload pet image to Cloudinary or AWS S3
// @route   POST /api/pets/upload
// @access  Private
exports.uploadImage = async (req, res) => {
    try {
        console.log("Upload image request received");
        
        // Check if file exists
        if (!req.file) {
            console.log("No file uploaded in request");
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
        
        // Log provider info
        const providerInfo = imageService.getProviderInfo();
        console.log(`Using upload provider: ${providerInfo.name}, configured: ${providerInfo.isConfigured}`);
        
        // Provide warning if provider isn't properly configured
        if (!providerInfo.isConfigured) {
            console.warn(`Warning: ${providerInfo.name} provider does not appear to be properly configured`);
        }

        // Upload using the image service - pass the entire file object from multer
        // This will use the buffer stored in memory rather than a file path
        const result = await imageService.uploadImage(req.file, {
            folder: "pet_images",
        });

        // Return success response with image info
        console.log(`Upload successful, URL: ${result.url}`);
        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: result.url,
            publicId: result.publicId,
        });
    } catch (error) {
        console.error("Image upload error:", error);
        console.error(`Error stack: ${error.stack}`);
        
        // Prepare a more detailed error response
        let errorMessage = "Image upload failed";
        let errorDetails = null;
        
        if (process.env.NODE_ENV === "development") {
            errorDetails = {
                message: error.message,
                stack: error.stack,
                provider: imageService.provider
            };
            
            // Additional info for AWS S3 errors
            if (imageService.provider === 'aws' && error.code) {
                errorDetails.awsErrorCode = error.code;
            }
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: errorDetails,
        });
    }
};

// @desc    Add image to pet profile
// @route   POST /api/pets/:id/image
// @access  Private
exports.addImageToPet = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: "No image URL provided",
            });
        }

        const pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        // Check ownership
        if (pet.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this pet",
            });
        }

        // Add the new image URL to pet's photos array
        if (!pet.photos) pet.photos = [];
        pet.photos.push(imageUrl);

        await pet.save();

        res.status(200).json({
            success: true,
            pet,
        });
    } catch (error) {
        console.error("Add image error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// @desc    Get all pets for the current user
// @route   GET /api/pets
// @access  Private
exports.getUserPets = async (req, res) => {
    try {
        const pets = await Pet.find({ owner: req.user.id });
        res.json({
            success: true,
            count: pets.length,
            pets,
        });
    } catch (error) {
        console.error("Get pets error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// @desc    Get pet by ID
// @route   GET /api/pets/:id
// @access  Private
exports.getPetById = async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        // Check if user owns this pet or if it's a public profile
        const isOwner = pet.owner.toString() === req.user.id;
        if (!isOwner) {
            // For non-owners, we could implement privacy logic here
            // For now, let's just return the pet (simulating public profiles)
        }

        res.json({
            success: true,
            pet,
        });
    } catch (error) {
        console.error("Get pet error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// @desc    Update a pet profile
// @route   PUT /api/pets/:id
// @access  Private
exports.updatePet = async (req, res) => {
    try {
        let pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        // Check ownership
        if (pet.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this pet",
            });
        }

        // Validate photos if they are being updated
        if (req.body.photos) {
            if (!Array.isArray(req.body.photos) || req.body.photos.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Please include at least 2 photos of your pet",
                });
            }
        }

        // Update pet
        pet = await Pet.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            pet,
        });
    } catch (error) {
        console.error("Update pet error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

// @desc    Delete a pet
// @route   DELETE /api/pets/:id
// @access  Private
exports.deletePet = async (req, res) => {
    try {
        const pet = await Pet.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!pet) {
            return res.status(404).json({ 
                success: false,
                message: "Pet not found or you are not the owner" 
            });
        }

        // Find all matches involving this pet
        const matchesLowerIdQuery = await Match.find({ pet1: pet._id });
        const matchesHigherIdQuery = await Match.find({ pet2: pet._id });
        
        const allMatches = [...matchesLowerIdQuery, ...matchesHigherIdQuery];

        // Collect all related chat IDs and affected user IDs for notifications
        const chatNotifications = [];

        // Find all chats associated with these matches
        for (const match of allMatches) {
            const chat = await Chat.findOne({ match: match._id });
            
            if (chat) {
                // Get the other pet in this match
                const otherPetId = match.pet1.toString() === pet._id.toString() ? match.pet2 : match.pet1;
                const otherPet = await Pet.findById(otherPetId).populate('owner', '_id');
                const otherUserId = otherPet?.owner?._id;

                if (otherUserId) {
                    chatNotifications.push({
                        chatId: chat._id,
                        userId: otherUserId
                    });
                }
                
                // Delete the chat
                await chat.deleteOne();
            }
            
            // Delete the match
            await match.deleteOne();
        }

        // Delete the pet
        await pet.deleteOne();
        
        // Send chat removal notifications to affected users
        if (global.io && chatNotifications.length > 0) {
            try {
                // Import the function to emit chat removal notification
                const { emitChatRemovalNotification } = require('../services/socketService');
                
                // Send notifications to all affected users
                for (const notification of chatNotifications) {
                    emitChatRemovalNotification(notification.userId, notification.chatId);
                    console.log(`Chat removal notification emitted to user ${notification.userId} for chat ${notification.chatId}`);
                }
                
                // Also notify the current user about all removed chats
                chatNotifications.forEach(notification => {
                    emitChatRemovalNotification(req.user.id, notification.chatId);
                });
                
            } catch (notificationError) {
                console.error('Error sending chat removal notifications:', notificationError);
                // Non-critical error, continue execution
            }
        }

        res.json({ 
            success: true,
            message: "Pet deleted successfully" 
        });
    } catch (error) {
        console.error("Delete pet error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
