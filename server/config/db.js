// MongoDB Connection Configuration
const mongoose = require('mongoose');

// Local MongoDB connection string
const MONGO_URI = 'mongodb://127.0.0.1:27017/focussync';

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${MONGO_URI}`);
    
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('   Make sure MongoDB is running locally!');
    console.error('   Start MongoDB with: mongod');
    process.exit(1);
  }
};

module.exports = connectDB;
