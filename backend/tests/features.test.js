const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('../src/services/promoService');
const payment = require('../src/controllers/paymentController');
const billing = require('../src/services/billingStore');
const social = require('../src/controllers/socialController');
const User = require('../src/models/User');
const Follow = require('../src/models/Follow');
const Template = require('../src/models/Template');
const originalPromo = process.env.PROMO_CODES_JSON;
afterEach(() => {
  if (originalPromo === undefined) delete process.env.PROMO_CODES_JSON;
  else process.env.PROMO_CODES_JSON = originalPromo;
  billing.memory.orders.clear();
});
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, set() { return this; } };
}
const fail = err => { throw err; };
test('quote normalizes promo codes and computes percent and fixed VND discounts on server', () => {
  process.env.PROMO_CODES_JSON = JSON.stringify([
    { code: 'SAVE20', type: 'percent', value: 20 },
    { code: 'FIXED', type: 'fixed', value: 15000, plans: ['studio'] },
  ]);
  assert.deepEqual(quote({ planId: 'pro', months: 2, promoCode: ' save20 ' }), {
    planId: 'pro', months: 2, subtotal: 198000, discount: 39600, amount: 158400, promoCode: 'SAVE20',
  });
  assert.equal(quote({ planId: 'studio', promoCode: 'FIXED' }).amount, 234000);
  assert.throws(() => quote({ planId: 'pro', promoCode: 'FIXED' }), /không/);
});
test('rejects expired, disabled, unknown, excessive promos and malformed checkout inputs', () => {
  process.env.PROMO_CODES_JSON = JSON.stringify([
    { code: 'OLD', type: 'percent', value: 10, expiresAt: '2020-01-01' },
    { code: 'OFF', type: 'percent', value: 10, active: false },
    { code: 'FREE', type: 'fixed', value: 999999 },
  ]);
  for (const promoCode of ['OLD', 'OFF', 'FREE', 'UNKNOWN', {}]) {
    assert.throws(() => quote({ planId: 'pro', promoCode }), { statusCode: 400 });
  }
  for (const months of [0, -1, 13, 1.5, '2', NaN]) {
    assert.throws(() => quote({ planId: 'pro', months }), { statusCode: 400 });
  }
  for (const planId of ['free', 'toString', '__proto__', 'unknown']) {
    assert.throws(() => quote({ planId }), { statusCode: 400 });
  }
});
test('checkout ignores client amounts and stores the discounted receipt snapshot', async () => {
  process.env.PAYMENT_MOCK = 'true';
  process.env.PROMO_CODES_JSON = '[{"code":"SAVE20","type":"percent","value":20}]';
  const res = response();
  await payment.checkout({ user: { id: 'alice' }, body: { planId: 'pro', promoCode: 'SAVE20', amount: 1, discount: 99999 } }, res, fail);
  assert.equal(res.body.amount, 79200);
  const order = await billing.findOrder(res.body.orderCode);
  assert.equal(order.subtotal, 99000);
  assert.equal(order.discount, 19800);
  assert.equal(order.promoCode, 'SAVE20');
});
test('receipt rejects another owner and unpaid orders, then returns paid totals', async () => {
  await billing.createOrder({ orderCode: 123, userId: 'alice', planId: 'pro', months: 1, subtotal: 99000, discount: 9900, amount: 89100, status: 'PENDING' });
  let res = response();
  await payment.receipt({ params: { orderCode: '123' }, user: { id: 'bob' } }, res, fail);
  assert.equal(res.statusCode, 404);
  res = response();
  await payment.receipt({ params: { orderCode: '123' }, user: { id: 'alice' } }, res, fail);
  assert.equal(res.statusCode, 409);
  await billing.markPaid(123, {});
  res = response();
  await payment.receipt({ params: { orderCode: '123' }, user: { id: 'alice', name: 'Alice', email: 'alice@example.com' } }, res, fail);
  assert.equal(res.body.data.amount, 89100);
  assert.equal(res.body.data.receiptNumber, 'PM3D-123');
  assert.equal(res.body.data.customer.email, 'alice@example.com');
});
test('follow rejects self and uses an idempotent upsert / delete for other creators', async t => {
  const alice = '507f1f77bcf86cd799439011', bob = '507f191e810c19729de860ea';
  t.mock.method(User, 'exists', async () => true);
  const upsert = t.mock.method(Follow, 'updateOne', async () => ({}));
  const remove = t.mock.method(Follow, 'deleteOne', async () => ({}));
  t.mock.method(Follow, 'exists', async () => true);
  t.mock.method(Follow, 'countDocuments', async () => 1);
  let res = response();
  await social.setFollow({ method: 'PUT', user: { id: alice }, params: { id: alice } }, res, fail);
  assert.equal(res.statusCode, 400);
  assert.equal(upsert.mock.calls.length, 0);
  res = response();
  await social.setFollow({ method: 'PUT', user: { id: alice }, params: { id: bob } }, res, fail);
  assert.equal(upsert.mock.calls[0].arguments[2].upsert, true);
  assert.deepEqual(res.body.data, { following: true, followersCount: 1 });
  await social.setFollow({ method: 'DELETE', user: { id: alice }, params: { id: bob } }, response(), fail);
  assert.deepEqual(remove.mock.calls[0].arguments[0], { follower: alice, creator: bob });
});
test('activity feed enforces public visibility, followed creators, projection and bounded pagination', async t => {
  const aggregate = t.mock.method(Template, 'aggregate', async () => Array.from({ length: 21 }, (_, i) => ({ _id: i })));
  const res = response();
  await social.activityFeed({ user: { id: '507f1f77bcf86cd799439011' }, query: { page: '2' } }, res, fail);
  const pipeline = aggregate.mock.calls[0].arguments[0];
  assert.deepEqual(pipeline[0], { $match: { isPublic: true } });
  assert.equal(pipeline.find(s => s.$lookup).$lookup.from, 'follows');
  assert.deepEqual(pipeline.find(s => s.$skip), { $skip: 20 });
  assert.deepEqual(pipeline.find(s => s.$limit), { $limit: 21 });
  assert.equal(pipeline.at(-1).$project.docData, undefined);
  assert.equal(res.body.data.length, 20);
  assert.equal(res.body.hasMore, true);
});
