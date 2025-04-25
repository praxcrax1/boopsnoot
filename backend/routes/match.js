const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const matchController = require("../controllers/matchController");

// @route   GET /api/matches/potential/:petId
// @desc    Get potential matches for a pet
// @access  Private
router.get("/potential/:petId", protect, matchController.getPotentialMatches);

// @route   POST /api/matches/like
// @desc    Like or dislike another pet
// @access  Private
router.post("/like", protect, matchController.likePet);

// @route   GET /api/matches/:petId
// @desc    Get all matches for a pet
// @access  Private
router.get("/:petId", protect, matchController.getPetMatches);

// @route   POST /api/matches/unmatch
// @desc    Unmatch a pet from another pet
// @access  Private
router.post('/unmatch', protect, matchController.unmatchPet);

module.exports = router;``
