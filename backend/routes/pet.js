const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const petController = require('../controllers/petController');

// @route   POST /api/pets
// @desc    Create a new pet profile
// @access  Private
router.post('/', protect, petController.createPet);

// @route   POST /api/pets/upload
// @desc    Upload pet image to Cloudinary
// @access  Private
router.post('/upload', protect, upload.single('image'), petController.uploadImage);

// @route   POST /api/pets/:id/image
// @desc    Add image to pet profile
// @access  Private
router.post('/:id/image', protect, petController.addImageToPet);

// @route   GET /api/pets
// @desc    Get all pets for the current user
// @access  Private
router.get('/', protect, petController.getUserPets);

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Private
router.get('/:id', protect, petController.getPetById);

// @route   PUT /api/pets/:id
// @desc    Update a pet profile
// @access  Private
router.put('/:id', protect, petController.updatePet);

// @route   DELETE /api/pets/:id
// @desc    Delete a pet profile
// @access  Private
router.delete('/:id', protect, petController.deletePet);

module.exports = router;