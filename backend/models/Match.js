const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  pet1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  pet2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  pet1LikedPet2: {
    type: Boolean,
    default: null
  },
  pet2LikedPet1: {
    type: Boolean,
    default: null
  },
  isMatch: {
    type: Boolean,
    default: false
  },
  matchDate: {
    type: Date
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure unique matches
MatchSchema.index({ pet1: 1, pet2: 1 }, { unique: true });

// Method to check if it's a match
MatchSchema.methods.checkMatch = function() {
  if (this.pet1LikedPet2 === true && this.pet2LikedPet1 === true && !this.isMatch) {
    this.isMatch = true;
    this.matchDate = Date.now();
  }
  return this.isMatch;
};

module.exports = mongoose.model('Match', MatchSchema);