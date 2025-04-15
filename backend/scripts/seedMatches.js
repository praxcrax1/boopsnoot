const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Match = require('../models/Match');
const { 
  PET_TYPES, 
  GENDER_OPTIONS, 
  SIZE_OPTIONS, 
  ACTIVITY_LEVELS, 
  VACCINATION_STATUS,
  TEMPERAMENTS 
} = require('../constants/petConstants');

// Load environment variables
dotenv.config();

// Your pet ID
const YOUR_PET_ID = '67f94c2547b6808b6b14da2d'; 

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000 // Set a timeout for server selection
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to generate a random user
const generateUser = async (index) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  // Generate a unique email to avoid conflicts
  const email = `user${index}${Date.now()}@example.com`;
  
  // Generate random location in India (approximate bounds)
  const lat = faker.number.float({ min: 8.0, max: 37.0, precision: 0.000001 }); // India latitude range
  const lng = faker.number.float({ min: 68.0, max: 97.0, precision: 0.000001 }); // India longitude range
  
  // Generate random city name
  const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
    'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
    'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad'
  ];
  const city = faker.helpers.arrayElement(cities);
  
  // Hash password
  const password = await bcrypt.hash('password123', 10);
  
  return {
    name: `${firstName} ${lastName}`,
    email,
    password,
    location: {
      coordinates: [lng, lat],  // MongoDB uses [longitude, latitude] format
      address: `${faker.location.streetAddress()}, ${city}, India`,
      city
    }
  };
};

// Function to generate a random pet
const generatePet = (userId) => {
  // Randomly select pet type
  const type = faker.helpers.objectValue(PET_TYPES);
  
  // Set breed based on pet type
  let breeds;
  if (type === PET_TYPES.DOG) {
    breeds = [
      'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Bulldog', 
      'Beagle', 'Poodle', 'Rottweiler', 'Boxer', 'Dachshund', 'Siberian Husky',
      'Great Dane', 'Doberman', 'Shih Tzu', 'Chihuahua', 'Pug', 'Pomeranian',
      'Indian Pariah', 'Rajapalayam', 'Mudhol Hound', 'Himalayan Sheepdog'
    ];
  } else {
    breeds = [
      'Persian', 'Maine Coon', 'Siamese', 'Bengal', 'Bombay Cat', 
      'Ragdoll', 'British Shorthair', 'Scottish Fold', 'Sphynx', 'Burmese',
      'Russian Blue', 'Abyssinian', 'Himalayan', 'Munchkin', 'Devon Rex'
    ];
  }
  
  // Generate random array of temperaments (1-3 temperaments)
  const numberOfTemperaments = faker.number.int({ min: 1, max: 3 });
  const temperament = faker.helpers.arrayElements(
    TEMPERAMENTS.map(t => t.toLowerCase()), 
    numberOfTemperaments
  );

  return {
    name: faker.animal.dog(),  // Using dog names for both cats and dogs
    type,
    breed: faker.helpers.arrayElement(breeds),
    age: faker.number.int({ min: 1, max: 15 }),
    gender: faker.helpers.objectValue(GENDER_OPTIONS),
    size: faker.helpers.objectValue(SIZE_OPTIONS),
    vaccinated: faker.helpers.objectValue(VACCINATION_STATUS),
    description: faker.lorem.paragraph().substring(0, 500),
    activityLevel: faker.helpers.objectValue(ACTIVITY_LEVELS),
    temperament,
    photos: [faker.image.urlLoremFlickr({ category: type })],
    owner: userId
  };
};

// Create match record between your pet and another pet
const createMatch = async (otherPetId) => {
  // Remember that in Match, pet1 should be the lower ObjectId
  let pet1, pet2, pet1LikedPet2, pet2LikedPet1;
  
  if (YOUR_PET_ID < otherPetId) {
    pet1 = YOUR_PET_ID;
    pet2 = otherPetId;
    pet1LikedPet2 = null; // Your pet hasn't liked them yet
    pet2LikedPet1 = true; // They liked your pet
  } else {
    pet1 = otherPetId;
    pet2 = YOUR_PET_ID;
    pet1LikedPet2 = true; // They liked your pet
    pet2LikedPet1 = null; // Your pet hasn't liked them yet
  }
  
  return {
    pet1,
    pet2,
    pet1LikedPet2,
    pet2LikedPet1,
    isMatch: false, // Not a match until both like each other
    lastInteraction: new Date()
  };
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // First verify that your pet exists
    const yourPet = await Pet.findById(YOUR_PET_ID);
    if (!yourPet) {
      console.error(`Error: Pet with ID ${YOUR_PET_ID} not found. Please provide a valid pet ID.`);
      process.exit(1);
    }
    
    console.log(`Found your pet: ${yourPet.name}`);
    
    // Generate 100 users with pets and matches
    const userCount = 100;
    let createdCount = 0;
    
    for (let i = 0; i < userCount; i++) {
      try {
        // Create user
        const userData = await generateUser(i);
        const user = await User.create(userData);
        
        // Create pet for this user
        const petData = generatePet(user._id);
        const pet = await Pet.create(petData);
        
        // Create match record (where this pet liked your pet)
        const matchData = await createMatch(pet._id);
        await Match.create(matchData);
        
        createdCount++;
        if (createdCount % 10 === 0) {
          console.log(`Created ${createdCount} users with pets...`);
        }
      } catch (err) {
        console.error(`Error creating record ${i}:`, err);
        // Continue with the next record even if this one fails
      }
    }
    
    console.log(`Database seeding completed. Created ${createdCount} users and pets that liked your pet.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();