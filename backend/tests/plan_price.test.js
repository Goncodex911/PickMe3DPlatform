const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getPlan, listPlans, setPriceOverride, defaultPrice } = require('../src/config/plans');
const { setPlanPrice, listForAdmin } = require('../src/services/planPriceService');
const { quote } = require('../src/services/promoService');
const payment = require('../src/controllers/paymentController');

afterEach(() => setPriceOverride('pro', null));

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, set() { return this; } };
}

test('admin price change applies to the plan list and to new quotes', async () => {
  const result = await setPlanPrice('pro', 129000, null);
  assert.equal(result.previous, defaultPrice('pro'));
  assert.equal(result.plan.price, 129000);
  assert.equal(result.persisted, false); // no DB in tests: memory only
  assert.equal(getPlan('pro').price, 129000);
  assert.equal(listPlans().find((p) => p.id === 'pro').price, 129000);
  assert.equal(quote({ planId: 'pro', months: 2 }).amount, 258000);
  // Legacy 'studio' accounts are served as Pro, at the Pro price.
  assert.equal(getPlan('studio').price, 129000);
  const row = (await listForAdmin()).find((p) => p.id === 'pro');
  assert.equal(row.isCustom, true);
  assert.equal(row.defaultPrice, 99000);
});

test('plan prices must be paid VND integers and Free is not configurable', async () => {
  for (const price of [0, -1, 999, 1.5, '99k', '', null, undefined, true, NaN, 50000001]) {
    assert.deepEqual(await setPlanPrice('pro', price, null), { error: 'INVALID_PRICE' }, `price ${String(price)}`);
  }
  for (const planId of ['free', 'studio', 'unknown', '__proto__', 'toString']) {
    assert.deepEqual(await setPlanPrice(planId, 99000, null), { error: 'NOT_CONFIGURABLE' }, planId);
  }
  assert.equal(getPlan('pro').price, 99000);
  assert.equal(getPlan('free').price, 0);
  assert.equal(getPlan('toString'), null);
});

test('admin cannot buy a monthly plan, even without a DB account', async () => {
  const res = response();
  await payment.checkout({ user: { id: 'mock-admin', role: 'admin' }, body: { planId: 'pro' } }, res, (err) => { throw err; });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ADMIN_NO_SUBSCRIPTION');
});
