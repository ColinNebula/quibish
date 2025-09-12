const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Default MongoDB connection string (local)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quibish';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;