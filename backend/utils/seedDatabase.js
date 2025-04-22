const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Pet = require('../models/Pet');
const { 
  PET_TYPES, 
  GENDER_OPTIONS, 
  SIZE_OPTIONS, 
  ACTIVITY_LEVELS, 
  VACCINATION_STATUS 
} = require('../constants/petConstants');

// Sample data for seeding
const dogBreeds = [
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Bulldog', 
  'Beagle', 'Poodle', 'Siberian Husky', 'Dachshund', 'Boxer', 'Great Dane',
  'Shih Tzu', 'Pomeranian', 'Rottweiler', 'Doberman', 'Pug'
];

const temperaments = [
  'Friendly', 'Playful', 'Energetic', 'Calm', 'Shy', 'Protective', 
  'Independent', 'Sociable', 'Curious', 'Affectionate', 'Loyal', 
  'Intelligent', 'Stubborn', 'Gentle', 'Dominant'
];

const names = [
  'Alex', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Jamie', 'Morgan', 
  'Avery', 'Cameron', 'Skylar', 'Rohan', 'Priya', 'Arjun', 'Neha', 
  'Vikram', 'Ananya', 'Raj', 'Meera', 'Sanjay', 'Divya'
];

const petNames = [
  'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Luna', 'Buddy', 'Daisy', 
  'Rocky', 'Sadie', 'Milo', 'Molly', 'Bear', 'Lola', 'Duke', 'Zoe',
  'Tucker', 'Ruby', 'Oscar', 'Stella', 'Leo', 'Coco', 'Rex', 'Lily'
];

// Helper function to generate random locations within 100km radius of Delhi
const generateRandomLocation = () => {
  const DELHI_COORDS = [77.187799, 28.582801]; // [longitude, latitude]
  const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers
  const MAX_DISTANCE_KM = 100; // Maximum distance in kilometers
  
  // Random angle in radians
  const randomAngle = Math.random() * 2 * Math.PI;
  
  // Random radius (using square root to ensure uniform distribution)
  const randomDistanceKm = Math.sqrt(Math.random()) * MAX_DISTANCE_KM;
  
  // Convert distance to radians
  const distanceRadians = randomDistanceKm / EARTH_RADIUS_KM;
  
  // Calculate new coordinates
  const latRadians = DELHI_COORDS[1] * Math.PI / 180;
  const lngRadians = DELHI_COORDS[0] * Math.PI / 180;
  
  const newLatRadians = Math.asin(
    Math.sin(latRadians) * Math.cos(distanceRadians) +
    Math.cos(latRadians) * Math.sin(distanceRadians) * Math.cos(randomAngle)
  );
  
  const newLngRadians = lngRadians + Math.atan2(
    Math.sin(randomAngle) * Math.sin(distanceRadians) * Math.cos(latRadians),
    Math.cos(distanceRadians) - Math.sin(latRadians) * Math.sin(newLatRadians)
  );
  
  // Convert back to degrees
  const newLat = newLatRadians * 180 / Math.PI;
  const newLng = newLngRadians * 180 / Math.PI;
  
  const cities = [
    'Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad', 
    'Greater Noida', 'Sonipat', 'Bahadurgarh', 'Meerut'
  ];
  
  return {
    type: 'Point',
    coordinates: [newLng, newLat],
    address: `${Math.floor(Math.random() * 999) + 1}, Random Street`,
    city: cities[Math.floor(Math.random() * cities.length)]
  };
};

// Helper function to generate random elements from an array
const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random elements from an array
const getRandomElements = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Create a random user
const createRandomUser = async () => {
  const firstName = getRandomElement(names);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  return new User({
    name: firstName,
    email: `${firstName.toLowerCase()}${Math.floor(Math.random() * 10000)}@example.com`,
    password: hashedPassword,
    phoneNumber: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    location: generateRandomLocation(),
    profilePicture: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`
  });
};

// Create a random pet for a user
const createRandomPet = (userId) => {
  const randomSize = getRandomElement(Object.values(SIZE_OPTIONS));
  const preferredSizes = getRandomElements(
    Object.values(SIZE_OPTIONS).filter(size => size !== randomSize), 
    Math.floor(Math.random() * 3)
  );
  
  return new Pet({
    owner: userId,
    name: getRandomElement(petNames),
    type: PET_TYPES.DOG, // Only dogs as per requirement
    breed: getRandomElement(dogBreeds),
    age: Math.floor(Math.random() * 15) + 1,
    gender: getRandomElement(Object.values(GENDER_OPTIONS)),
    size: randomSize,
    vaccinated: getRandomElement(Object.values(VACCINATION_STATUS)),
    photos: [
      `https://placedog.net/500/280?id=${Math.floor(Math.random() * 100)}`,
      `https://placedog.net/500/280?id=${Math.floor(Math.random() * 100) + 100}`
    ],
    description: `A lovely dog who enjoys ${getRandomElement(['walks in the park', 'playing fetch', 'cuddling', 'running', 'swimming'])}.`,
    activityLevel: getRandomElement(Object.values(ACTIVITY_LEVELS)),
    temperament: getRandomElements(temperaments, Math.floor(Math.random() * 4) + 1),
    preferredPlaymates: {
      size: preferredSizes,
    }
  });
};

// Main seeding function
const seedDatabase = async (userCount = 20) => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Pet.deleteMany({});
    
    console.log('Existing data cleared');
    
    // Create users
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const user = await createRandomUser();
      await user.save();
      users.push(user);
      console.log(`Created user: ${user.name}`);
    }
    
    // Create pets (1-3 per user)
    const pets = [];
    for (const user of users) {
      const petCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < petCount; i++) {
        const pet = createRandomPet(user._id);
        await pet.save();
        pets.push(pet);
        console.log(`Created pet: ${pet.name} for ${user.name}`);
      }
    }
    
    // Add some disliked pets
    for (const pet of pets) {
      if (Math.random() > 0.7) { // 30% chance to have disliked pets
        const otherPets = pets.filter(p => p._id.toString() !== pet._id.toString());
        const dislikedCount = Math.min(Math.floor(Math.random() * 3), otherPets.length);
        if (dislikedCount > 0) {
          const dislikedPets = getRandomElements(otherPets, dislikedCount);
          pet.dislikedPets = dislikedPets.map(p => p._id);
          await pet.save();
        }
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log(`Created ${users.length} users and ${pets.length} pets.`);
    
    return { users, pets };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = seedDatabase;
