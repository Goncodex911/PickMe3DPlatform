/**
 * Admin pricing of the monthly subscription plans (payment:plan:configure).
 * Prices live in the PlanPrice collection and are cached in config/plans.js so getPlan()/quote() stay synchronous.
 */
const mongoose = require('mongoose');
const { listPlans, isPriceConfigurable, defaultPrice, setPriceOverride, getPlan } = require('../config/plans');
const { MIN_PAID_PRICE_VND, MAX_PRICE_VND } = require('../config/pricing');

// A subscription is always paid: 0 would hand out Pro for free through the checkout.
const PLAN_PRICE_ERROR = `Giá gói phải là số nguyên VND từ ${MIN_PAID_PRICE_VND.toLocaleString('vi-VN')} đến ${MAX_PRICE_VND.toLocaleString('vi-VN')}`;

function isValidPlanPrice(value) {
  const n = Number(value);
  return typeof value !== 'boolean' && value !== '' && value != null &&
    Number.isInteger(n) && n >= MIN_PAID_PRICE_VND && n <= MAX_PRICE_VND;
}

function dbOn() {
  return mongoose.connection.readyState === 1;
}

/** Loads saved prices into the plan cache. Called once the DB is connected; safe to call again. */
async function loadPlanPrices() {
  if (!dbOn()) return 0;
  const PlanPrice = require('../models/PlanPrice');
  const rows = await PlanPrice.find({}).lean();
  rows.forEach((row) => {
    if (isPriceConfigurable(row.planId) && isValidPlanPrice(row.price)) setPriceOverride(row.planId, row.price);
  });
  return rows.length;
}

async function listForAdmin() {
  let meta = new Map();
  if (dbOn()) {
    const PlanPrice = require('../models/PlanPrice');
    meta = new Map((await PlanPrice.find({}).lean()).map((r) => [r.planId, r]));
  }
  return listPlans().map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    defaultPrice: defaultPrice(plan.id),
    configurable: isPriceConfigurable(plan.id),
    isCustom: plan.price !== defaultPrice(plan.id),
    updatedAt: meta.get(plan.id)?.updatedAt || null,
  }));
}

/**
 * @returns {{ error: 'NOT_CONFIGURABLE' | 'INVALID_PRICE' } | { plan, previous, persisted }}
 */
async function setPlanPrice(planId, price, userId) {
  if (!isPriceConfigurable(planId)) return { error: 'NOT_CONFIGURABLE' };
  if (!isValidPlanPrice(price)) return { error: 'INVALID_PRICE' };
  const previous = getPlan(planId).price;
  const value = Number(price);
  let persisted = false;
  if (dbOn()) {
    const PlanPrice = require('../models/PlanPrice');
    await PlanPrice.findOneAndUpdate(
      { planId },
      { $set: { price: value, currency: 'VND', updatedBy: mongoose.isValidObjectId(userId) ? userId : null } },
      { upsert: true, new: true, runValidators: true }
    );
    persisted = true;
  }
  setPriceOverride(planId, value);
  return { plan: getPlan(planId), previous, persisted };
}

module.exports = { loadPlanPrices, listForAdmin, setPlanPrice, isValidPlanPrice, PLAN_PRICE_ERROR };
