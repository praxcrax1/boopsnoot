require('dotenv').config();
const mongoose = require('mongoose');
const seedDatabase = require('./seedDatabase');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Run the seed function and disconnect
const runSeed = async () => {
  try {
    const connection = await connectDB();
    
    // Get the number of users from command line argument or default to 20
    const userCount = parseInt(process.argv[2]) || 20;
    console.log(`Starting to seed database with ${userCount} users...`);
    
    await seedDatabase(userCount);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding process:', error);
    process.exit(1);
  }
};

// Execute the seed script
runSeed();
