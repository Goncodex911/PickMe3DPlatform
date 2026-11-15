const mongoose = require('mongoose');
const User = require('../models/User');

const SOLE_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'phantrongquy23032005@gmail.com').toLowerCase().trim();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB Atlas] Connected successfully: ${conn.connection.host}`);

    // Enforce that Phan Trọng Quý is the ONLY fixed administrator in the system
    try {
      await User.updateMany(
        { email: { $ne: SOLE_ADMIN_EMAIL }, role: 'admin' },
        { $set: { role: 'user' } }
      );
      await User.findOneAndUpdate(
        { email: SOLE_ADMIN_EMAIL },
        {
          $set: {
            name: 'Phan Trọng Quý',
            role: 'admin',
            status: 'active',
            plan: 'pro',
          },
        },
        { upsert: true }
      );
    } catch (adminSyncErr) {
      console.warn('[Admin Sync Warning]:', adminSyncErr.message);
    }

    // Admin-set subscription prices (otherwise the defaults from config/plans.js apply).
    try {
      await require('../services/planPriceService').loadPlanPrices();
    } catch (planPriceErr) {
      console.warn('[Plan Price Warning]:', planPriceErr.message);
    }
  } catch (error) {
    console.warn(`[MongoDB Atlas] Connection warning: ${error.message}`);
    console.warn(`[MongoDB Atlas] Server will continue running without database.`);
  }
};

module.exports = connectDB;
