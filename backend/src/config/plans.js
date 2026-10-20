/** Single source of truth for PickMe3D plans. Amounts are VND per month. */
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    quotas: { designs: 5, slides: 3, ai: 3 },
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
    exportPptx: true,
    privateDeck: true,
    brandKit: false,
    watermark: false,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 249000,
    quotas: { designs: null, slides: null, ai: null },
    exportPptx: true,
    privateDeck: true,
    brandKit: true,
    watermark: false,
  },
};

function listPlans() {
  return Object.values(PLANS);
}

function getPlan(id) {
  return PLANS[id] || null;
}

module.exports = { PLANS, listPlans, getPlan };
