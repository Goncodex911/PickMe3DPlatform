require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const SOLE_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'phantrongquy23032005@gmail.com').toLowerCase().trim();

async function fixSoleAdmin() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Fix Sole Admin] Connected to MongoDB.');

  // 1. Demote any account that is not Phan Trọng Quý
  const demoteRes = await User.updateMany(
    { email: { $ne: SOLE_ADMIN_EMAIL }, role: 'admin' },
    { $set: { role: 'user' } }
  );
  console.log(`[Fix Sole Admin] Demoted ${demoteRes.modifiedCount} account(s) to 'user'.`);

  // 2. Ensure Phan Trọng Quý is always 'admin', 'active', 'studio', and correct name
  const adminUser = await User.findOneAndUpdate(
    { email: SOLE_ADMIN_EMAIL },
    {
      $set: {
        name: 'Phan Trọng Quý',
        role: 'admin',
        status: 'active',
        plan: 'studio',
      },
    },
    { new: true, upsert: true }
  );
  console.log(`[Fix Sole Admin] Sole Admin verified: ${adminUser.name} <${adminUser.email}>, role: ${adminUser.role}`);

  // 3. Output current admins list
  const admins = await User.find({ role: 'admin' });
  console.log(`[Fix Sole Admin] Total Admins in DB: ${admins.length}`);
  admins.forEach((a) => {
    console.log(` - Admin: ${a.name} <${a.email}> (ID: ${a._id})`);
  });

  await mongoose.disconnect();
  console.log('[Fix Sole Admin] Done.');
}

if (require.main === module) {
  fixSoleAdmin().catch((err) => {
    console.error('Error fixing sole admin:', err);
    process.exit(1);
  });
}

module.exports = fixSoleAdmin;
