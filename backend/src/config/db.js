const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB Atlas] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Atlas] Connection warning: ${error.message}`);
    console.warn(`[MongoDB Atlas] Server will continue running without database.`);
  }
};

module.exports = connectDB;
