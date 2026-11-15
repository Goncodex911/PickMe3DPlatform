/**
 * Mock user database for email + password login (local development / demo).
 *
 * Two system roles only (user, admin). Creator is an account type of 'user':
 *   - admin                         : platform administrator
 *   - user + accountType CREATOR    : approved creator, publishes/sells templates and owns a wallet
 *   - user + accountType REGULAR    : buys and uses products, may create private templates
 *
 * Passwords are NOT in the repository: each account reads MOCK_PASSWORD_<KEY> from backend/.env (git-ignored),
 * falling back to MOCK_PASSWORD. An account without a password cannot sign in. Passwords are hashed with scrypt
 * at load time. Disabled in production unless MOCK_AUTH=true.
 */
const crypto = require('crypto');

const ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user' });

function passwordFor(key) {
  const value = process.env[`MOCK_PASSWORD_${key}`] || process.env.MOCK_PASSWORD || '';
  return value.length >= 8 ? value : '';
}

// Ids are valid 24-hex ObjectId strings so Mongo-backed queries treat them as "no rows" instead of throwing.
const SEED = [
  {
    id: '000000000000000000000a01',
    name: 'Admin PickMe3D',
    email: 'admin@pickme3d.local',
    key: 'ADMIN',
    role: ROLES.ADMIN,
    jobRole: 'Platform Administrator',
    plan: 'pro',
  },
  {
    id: '000000000000000000000c01',
    name: 'Creator Demo',
    email: 'creator@pickme3d.local',
    key: 'CREATOR',
    role: ROLES.USER,
    accountType: 'CREATOR',
    creatorStatus: 'APPROVED',
    jobRole: 'Fashion Designer',
    plan: 'pro',
  },
  {
    id: '000000000000000000000b01',
    name: 'Buyer Demo',
    email: 'buyer@pickme3d.local',
    key: 'BUYER',
    role: ROLES.USER,
    accountType: 'REGULAR',
    creatorStatus: 'NONE',
    jobRole: 'Buyer',
    plan: 'free',
  },
  {
    // Plain buyer that stays a Regular user (never applied for Creator): for testing purchases.
    id: '000000000000000000000b02',
    name: 'Khách Hàng Demo',
    email: 'customer@pickme3d.local',
    key: 'CUSTOMER',
    role: ROLES.USER,
    accountType: 'REGULAR',
    creatorStatus: 'NONE',
    jobRole: 'Khách hàng',
    plan: 'free',
  },
  {
    // Regular users (not Creators) for testing: user1 on Free (sees the Pro checkout), user2 already on Pro.
    id: '000000000000000000000b03',
    name: 'User Demo 1',
    email: 'user1@pickme3d.local',
    key: 'USER1',
    role: ROLES.USER,
    accountType: 'REGULAR',
    creatorStatus: 'NONE',
    jobRole: 'Người dùng',
    plan: 'free',
  },
  {
    id: '000000000000000000000b04',
    name: 'User Demo 2',
    email: 'user2@pickme3d.local',
    key: 'USER2',
    role: ROLES.USER,
    accountType: 'REGULAR',
    creatorStatus: 'NONE',
    jobRole: 'Người dùng',
    plan: 'pro',
  },
];

function hashPassword(password, salt = crypto.randomBytes(16)) {
  return { salt, hash: crypto.scryptSync(password, salt, 64) };
}

const users = new Map();
for (const seed of SEED) {
  users.set(seed.id, { ...seed, email: seed.email.toLowerCase(), status: 'active' });
}

// Hashed on first use (after dotenv has loaded backend/.env). null = no password configured: sign-in refused.
const credentials = new Map();
function credentialFor(user) {
  if (!credentials.has(user.id)) {
    const password = passwordFor(user.key);
    credentials.set(user.id, password ? hashPassword(password) : null);
  }
  return credentials.get(user.id);
}

// Used to keep response time similar when the email does not exist or has no password.
const DUMMY = hashPassword('pickme3d-dummy-password');

function isEnabled() {
  if (process.env.MOCK_AUTH === 'true') return true;
  if (process.env.MOCK_AUTH === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

function findByEmail(email) {
  const key = String(email || '').toLowerCase().trim();
  for (const user of users.values()) {
    if (user.email === key) return user;
  }
  return null;
}

function findById(id) {
  return users.get(String(id || '')) || null;
}

/** Returns the user when email + password match, otherwise null. */
function verifyCredentials(email, password) {
  const user = findByEmail(email);
  const credential = user ? credentialFor(user) : null;
  const target = credential || DUMMY;
  const { hash } = hashPassword(String(password || ''), target.salt);
  const match = crypto.timingSafeEqual(hash, target.hash);
  return user && credential && match ? user : null;
}

/** Safe shape returned to clients (no password material). */
function publicUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    picture: '',
    role: user.role,
    accountType: user.accountType,
    creatorStatus: user.creatorStatus,
    jobRole: user.jobRole,
    status: user.status,
    plan: user.plan,
  };
}

/** Shape used as req.user by the protect middleware (mirrors the fields controllers read from the User model). */
function requestUser(user) {
  return {
    ...publicUser(user),
    walletBalance: 0,
    savedBankInfo: { bankName: '', accountNumber: '', accountHolder: '' },
    isMock: true,
  };
}

/**
 * When MongoDB is connected, make sure the mock user has a real User document (same _id, role kept in sync)
 * so DB-backed controllers (wallet, admin console, marketplace) work. Returns the document, or null when offline.
 */
async function syncToDb(user) {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) return null;
  const User = require('../models/User');
  return User.findOneAndUpdate(
    { email: user.email },
    {
      $set: {
        name: user.name,
        role: user.role,
        status: 'active',
      },
      // Seed values only on first insert: the Creator application flow (PENDING, APPROVED, …) must persist
      // across requests instead of being reset to the seed on every call.
      $setOnInsert: {
        _id: new mongoose.Types.ObjectId(user.id),
        plan: user.plan,
        jobRole: user.jobRole, // editable profession: seeded once, never overwritten
        ...(user.accountType ? { accountType: user.accountType, creatorStatus: user.creatorStatus } : {}),
      },
    },
    { upsert: true, new: true }
  );
}

module.exports = {
  ROLES,
  isEnabled,
  syncToDb,
  findById,
  verifyCredentials,
  publicUser,
  requestUser,
};
