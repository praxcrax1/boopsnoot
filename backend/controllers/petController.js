const Pet = require("../models/Pet");
const cloudinary = require("../config/cloudinary");
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

// @desc    Upload pet image to Cloudinary
// @route   POST /api/pets/upload
// @access  Private
exports.uploadImage = async (req, res) => {
    try {
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        // Get file path
        const filePath = req.file.path;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            folder: "pet_images",
            use_filename: true,
            unique_filename: true,
        });

        // Delete the local file after upload
        fs.unlinkSync(filePath);

        // Return success response with Cloudinary info
        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        console.error("Image upload error:", error);
        res.status(500).json({
            success: false,
            message: "Image upload failed",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
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

// @desc    Delete a pet profile
// @route   DELETE /api/pets/:id
// @access  Private
exports.deletePet = async (req, res) => {
    try {
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
                message: "Not authorized to delete this pet",
            });
        }

        await pet.deleteOne();

        res.json({
            success: true,
            message: "Pet removed",
        });
    } catch (error) {
        console.error("Delete pet error:", error);
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
