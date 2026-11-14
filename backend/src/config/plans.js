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

function listPlans() {
  return Object.values(PLANS);
}

// The Studio plan was retired; accounts/orders still stored as 'studio' are served as Pro.
const LEGACY_PLAN_ALIASES = { studio: 'pro' };

function getPlan(id) {
  return PLANS[id] || PLANS[LEGACY_PLAN_ALIASES[id]] || null;
}

module.exports = { PLANS, listPlans, getPlan };
