/** Single source of truth for PickMe3D plans. Amounts are VND per month. */
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    // Free: manual Slide Studio only. AI slide generation and the 3D blueprint studio need Pro.
    quotas: { designs: 5, slides: 3, ai: 0 },
    aiSlides: false,
    blueprint3d: false,
    exportPptx: false,
    privateDeck: false,
    brandKit: false,
    watermark: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99000,
    quotas: { designs: null, slides: null, ai: 50 },
    aiSlides: true,
    blueprint3d: true,
    exportPptx: true,
    privateDeck: true,
    brandKit: false,
    watermark: false,
  },
};

// The Studio plan was retired; accounts/orders still stored as 'studio' are served as Pro.
const LEGACY_PLAN_ALIASES = { studio: 'pro' };

// Admin-set monthly prices (services/planPriceService.js loads them from the DB). Only paid plans are priced:
// Free stays 0. Orders already created keep the amount they were quoted.
const priceOverrides = new Map();

function own(map, key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);
}

function withPrice(plan) {
  if (!plan) return null;
  return priceOverrides.has(plan.id) ? { ...plan, price: priceOverrides.get(plan.id) } : plan;
}

function listPlans() {
  return Object.values(PLANS).map(withPrice);
}

function getPlan(id) {
  const base = own(PLANS, id) ? PLANS[id] : own(LEGACY_PLAN_ALIASES, id) ? PLANS[LEGACY_PLAN_ALIASES[id]] : null;
  return withPrice(base);
}

/** Plans whose price the Admin may change: every plan sold by subscription (price > 0 by default). */
function isPriceConfigurable(id) {
  return own(PLANS, id) && PLANS[id].price > 0;
}

function defaultPrice(id) {
  return own(PLANS, id) ? PLANS[id].price : null;
}

/** null/undefined clears the override (back to the default price). */
function setPriceOverride(id, price) {
  if (!isPriceConfigurable(id)) return;
  if (price == null) priceOverrides.delete(id);
  else priceOverrides.set(id, Number(price));
}

module.exports = { PLANS, listPlans, getPlan, isPriceConfigurable, defaultPrice, setPriceOverride };
