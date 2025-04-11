const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Match = require('../models/Match');

// Load environment variables
dotenv.config();

// Sample data
const users = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    location: {
      coordinates: [77.5946, 12.9716],
      address: 'Bangalore, India',
      city: 'Bangalore'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    location: {
      coordinates: [72.8777, 19.076],
      address: 'Mumbai, India',
      city: 'Mumbai'
    }
  }
];

const pets = [
  {
    name: 'Buddy',
    breed: 'Golden Retriever',
    age: 3,
    gender: 'male',
    size: 'large',
    vaccinated: true,
    description: 'Friendly and energetic',
    activityLevel: 'high',
    temperament: ['friendly', 'playful']
  },
  {
    name: 'Luna',
    breed: 'Labrador',
    age: 2,
    gender: 'female',
    size: 'medium',
    vaccinated: true,
    description: 'Calm and affectionate',
    activityLevel: 'moderate',
    temperament: ['calm', 'friendly']
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000 // Set a timeout for server selection
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Pet.deleteMany();
    await Match.deleteMany();

    // Insert users
    const createdUsers = await User.insertMany(users);

    // Assign pets to users
    pets[0].owner = createdUsers[0]._id;
    pets[1].owner = createdUsers[1]._id;

    // Insert pets
    await Pet.insertMany(pets);

    console.log('Database seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();