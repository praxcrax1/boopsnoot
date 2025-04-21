const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @route   POST /api/pets
// @desc    Create a new pet profile
// @access  Private
router.post('/', protect, async (req, res) => {
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
      preferredPlaymates
    } = req.body;

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
      preferredPlaymates
    });

    const savedPet = await pet.save();

    res.status(201).json({
      success: true,
      pet: savedPet
    });
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/pets/upload
// @desc    Upload pet image to Cloudinary
// @access  Private
router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get file path
    const filePath = req.file.path;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'pet_images',
      use_filename: true,
      unique_filename: true,
    });

    // Delete the local file after upload
    fs.unlinkSync(filePath);

    // Return success response with Cloudinary info
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/pets/:id/image
// @desc    Add image to pet profile
// @access  Private
router.post('/:id/image', protect, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image URL provided'
      });
    }

    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Check ownership
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this pet'
      });
    }

    // Add the new image URL to pet's photos array
    if (!pet.photos) pet.photos = [];
    pet.photos.push(imageUrl);

    await pet.save();

    res.status(200).json({
      success: true,
      pet
    });
  } catch (error) {
    console.error('Add image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/pets
// @desc    Get all pets for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json({
      success: true,
      count: pets.length,
      pets
    });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
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
      pet
    });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/pets/:id
// @desc    Update a pet profile
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Check ownership
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this pet'
      });
    }

    // Update pet
    pet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      pet
    });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/pets/:id
// @desc    Delete a pet profile
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Check ownership
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this pet'
      });
    }

    await pet.deleteOne();

    res.json({
      success: true,
      message: 'Pet removed'
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;