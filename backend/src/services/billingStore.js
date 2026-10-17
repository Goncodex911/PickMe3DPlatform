const crypto = require('crypto');
const mongoose = require('mongoose');
const { getPlan } = require('../config/plans');

const memory = {
  accounts: new Map(),
  orders: new Map(),
  presentations: new Map(),
};

function dbOn() {
  return mongoose.connection.readyState === 1;
}

function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function publicAccount(account) {
  const plan = getPlan(account.plan) || getPlan('free');
  return {
    id: String(account.id),
    email: account.email || '',
    name: account.name || '',
    plan: plan.id,
    planExpiresAt: account.planExpiresAt || null,
    aiUsed: account.aiUsed || 0,
    aiLimit: plan.quotas.ai,
    quotas: plan.quotas,
    features: {
      exportPptx: plan.exportPptx,
      privateDeck: plan.privateDeck,
      brandKit: plan.brandKit,
      watermark: plan.watermark,
    },
  };
}

function expire(account) {
  if (account.plan !== 'free' && account.planExpiresAt && new Date(account.planExpiresAt).getTime() <= Date.now()) {
    account.plan = 'free';
    account.planExpiresAt = null;
  }
  if (account.aiPeriod !== periodKey()) {
    account.aiPeriod = periodKey();
    account.aiUsed = 0;
  }
  return account;
}

async function findDbUser(decoded) {
  if (!dbOn()) return null;
  const User = require('../models/User');
  const id = String(decoded.id || '');
  if (mongoose.isValidObjectId(id)) {
    const byId = await User.findById(id);
    if (byId) return byId;
  }
  const email = String(decoded.email || '').toLowerCase();
  if (!email) return null;
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: decoded.name || 'Designer',
      email,
    });
  }
  return user;
}

function accountFromUser(user) {
  return publicAccount({
    id: user._id,
    email: user.email,
    name: user.name,
    plan: user.plan || 'free',
    planExpiresAt: user.planExpiresAt,
    aiUsed: user.aiUsed,
    aiPeriod: user.aiPeriod,
  });
}

async function getAccount(decoded) {
  const user = await findDbUser(decoded);
  if (user) {
    expire(user);
    await user.save();
    return accountFromUser(user);
  }

  const id = String(decoded.id || '');
  let account = memory.accounts.get(id);
  if (!account) {
    account = {
      id,
      email: decoded.email || '',
      name: decoded.name || 'Designer',
      plan: 'free',
      planExpiresAt: null,
      aiUsed: 0,
      aiPeriod: periodKey(),
    };
    memory.accounts.set(id, account);
  }
  expire(account);
  return publicAccount(account);
}

async function extendPlan(userId, planId, months) {
  const id = String(userId);
  const addMs = Math.max(1, Number(months) || 1) * 30 * 24 * 60 * 60 * 1000;
  if (dbOn() && mongoose.isValidObjectId(id)) {
    const User = require('../models/User');
    const user = await User.findById(id);
    if (user) {
      const base = user.planExpiresAt && user.planExpiresAt.getTime() > Date.now() ? user.planExpiresAt.getTime() : Date.now();
      user.plan = planId;
      user.planExpiresAt = new Date(base + addMs);
      await user.save();
      return accountFromUser(user);
    }
  }
  const account = memory.accounts.get(id) || {
    id,
    plan: 'free',
    planExpiresAt: null,
    aiUsed: 0,
    aiPeriod: periodKey(),
  };
  const base = account.planExpiresAt && new Date(account.planExpiresAt).getTime() > Date.now()
    ? new Date(account.planExpiresAt).getTime()
    : Date.now();
  account.plan = planId;
  account.planExpiresAt = new Date(base + addMs).toISOString();
  memory.accounts.set(id, account);
  return publicAccount(account);
}

async function bumpAi(userId) {
  const id = String(userId);
  if (dbOn() && mongoose.isValidObjectId(id)) {
    const User = require('../models/User');
    const user = await User.findById(id);
    if (user) {
      expire(user);
      user.aiUsed = (user.aiUsed || 0) + 1;
      await user.save();
      return user.aiUsed;
    }
  }
  const account = memory.accounts.get(id);
  if (!account) return 0;
  expire(account);
  account.aiUsed += 1;
  return account.aiUsed;
}

function plainOrder(order) {
  const o = order.toObject ? order.toObject() : { ...order };
  return {
    orderCode: o.orderCode,
    userId: String(o.userId),
    planId: o.planId,
    months: o.months,
    amount: o.amount,
    status: o.status,
    paidAt: o.paidAt || null,
  };
}

async function createOrder(input) {
  if (dbOn()) {
    const Order = require('../models/Order');
    const created = await Order.create(input);
    return plainOrder(created);
  }
  const order = { ...input, paidAt: null, raw: null };
  memory.orders.set(order.orderCode, order);
  return plainOrder(order);
}

async function findOrder(orderCode) {
  const code = Number(orderCode);
  if (dbOn()) {
    const Order = require('../models/Order');
    const found = await Order.findOne({ orderCode: code });
    return found ? plainOrder(found) : null;
  }
  const found = memory.orders.get(code);
  return found ? plainOrder(found) : null;
}

async function markPaid(orderCode, raw) {
  const code = Number(orderCode);
  if (dbOn()) {
    const Order = require('../models/Order');
    const found = await Order.findOne({ orderCode: code });
    if (!found) return null;
    if (found.status === 'PAID') return { order: plainOrder(found), already: true };
    found.status = 'PAID';
    found.paidAt = new Date();
    found.raw = raw || null;
    await found.save();
    return { order: plainOrder(found), already: false };
  }
  const found = memory.orders.get(code);
  if (!found) return null;
  if (found.status === 'PAID') return { order: plainOrder(found), already: true };
  found.status = 'PAID';
  found.paidAt = new Date().toISOString();
  found.raw = raw || null;
  return { order: plainOrder(found), already: false };
}

async function listOrders(userId) {
  if (dbOn()) {
    const Order = require('../models/Order');
    const rows = await Order.find({ userId: String(userId) }).sort({ createdAt: -1 }).limit(20);
    return rows.map(plainOrder);
  }
  return [...memory.orders.values()]
    .filter((order) => String(order.userId) === String(userId))
    .map(plainOrder);
}

function plainDeck(deck) {
  const o = deck.toObject ? deck.toObject() : { ...deck };
  return {
    id: String(o.id || o._id),
    userId: String(o.userId),
    authorName: o.authorName || '',
    title: o.title,
    slides: o.slides || [],
    theme: o.theme || {},
    thumbnail: o.thumbnail || '',
    isPublic: o.isPublic !== false,
    likesCount: o.likesCount || 0,
    likedBy: o.likedBy || [],
    comments: o.comments || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function applyReadOnly(decks, planId) {
  const limit = (getPlan(planId) || getPlan('free')).quotas.slides;
  const sorted = [...decks].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return sorted.map((deck, index) => ({
    ...deck,
    readOnly: limit != null && index >= limit,
  }));
}

async function countDecks(userId) {
  if (dbOn()) {
    const Presentation = require('../models/Presentation');
    return Presentation.countDocuments({ userId: String(userId) });
  }
  return [...memory.presentations.values()].filter((deck) => String(deck.userId) === String(userId)).length;
}

async function createDeck(input) {
  const now = new Date().toISOString();
  if (dbOn()) {
    const Presentation = require('../models/Presentation');
    const created = await Presentation.create(input);
    return plainDeck(created);
  }
  const deck = {
    id: crypto.randomUUID(),
    likesCount: 0,
    likedBy: [],
    comments: [],
    isPublic: true,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  memory.presentations.set(deck.id, deck);
  return plainDeck(deck);
}

async function listDecks(userId) {
  if (dbOn()) {
    const Presentation = require('../models/Presentation');
    const rows = await Presentation.find({ userId: String(userId) }).sort({ updatedAt: -1 });
    return rows.map(plainDeck);
  }
  return [...memory.presentations.values()]
    .filter((deck) => String(deck.userId) === String(userId))
    .map(plainDeck);
}

async function getDeck(id) {
  if (dbOn() && mongoose.isValidObjectId(id)) {
    const Presentation = require('../models/Presentation');
    const found = await Presentation.findById(id);
    return found ? plainDeck(found) : null;
  }
  const found = memory.presentations.get(String(id));
  return found ? plainDeck(found) : null;
}

async function updateDeck(id, patch) {
  if (dbOn() && mongoose.isValidObjectId(id)) {
    const Presentation = require('../models/Presentation');
    const found = await Presentation.findByIdAndUpdate(id, patch, { new: true });
    return found ? plainDeck(found) : null;
  }
  const found = memory.presentations.get(String(id));
  if (!found) return null;
  Object.assign(found, patch, { updatedAt: new Date().toISOString() });
  return plainDeck(found);
}

async function deleteDeck(id) {
  if (dbOn() && mongoose.isValidObjectId(id)) {
    const Presentation = require('../models/Presentation');
    const found = await Presentation.findByIdAndDelete(id);
    return Boolean(found);
  }
  return memory.presentations.delete(String(id));
}

module.exports = {
  memory,
  getAccount,
  extendPlan,
  bumpAi,
  createOrder,
  findOrder,
  markPaid,
  listOrders,
  countDecks,
  createDeck,
  listDecks,
  getDeck,
  updateDeck,
  deleteDeck,
  applyReadOnly,
};
