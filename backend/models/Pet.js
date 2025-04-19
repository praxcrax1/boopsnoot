const mongoose = require('mongoose');
const { 
  PET_TYPES, 
  GENDER_OPTIONS, 
  SIZE_OPTIONS, 
  ACTIVITY_LEVELS, 
  VACCINATION_STATUS 
} = require('../constants/petConstants');

const PetSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide your pet\'s name'],
    trim: true,
    maxlength: [30, 'Name cannot be more than 30 characters']
  },
  type: {
    type: String,
    enum: Object.values(PET_TYPES),
    required: [true, 'Please specify your pet\'s type (dog or cat)']
  },
  breed: {
    type: String,
    required: [true, 'Please provide your pet\'s breed'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Please provide your pet\'s age']
  },
  gender: {
    type: String,
    enum: Object.values(GENDER_OPTIONS),
    required: [true, 'Please specify your pet\'s gender']
  },
  size: {
    type: String,
    enum: Object.values(SIZE_OPTIONS),
    required: [true, 'Please specify your pet\'s size']
  },
  vaccinated: {
    type: String,
    enum: Object.values(VACCINATION_STATUS),
    default: VACCINATION_STATUS.NO
  },
  photos: [{
    type: String
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  activityLevel: {
    type: String,
    enum: Object.values(ACTIVITY_LEVELS),
    default: ACTIVITY_LEVELS.MODERATE
  },
  temperament: [{
    type: String,
  }],
  preferredPlaymates: {
    size: [{
      type: String,
    }],
  },
  dislikedPets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Pet', PetSchema);