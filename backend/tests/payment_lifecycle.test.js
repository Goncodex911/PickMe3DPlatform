const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const payos = require('../src/services/payosService');
const lifecycle = require('../src/services/paymentLifecycle');
const payment = require('../src/controllers/paymentController');
const billing = require('../src/services/billingStore');

const ENV_KEYS = ['PAYMENT_MOCK', 'NODE_ENV', 'ALLOW_MOCK_PAYMENT_IN_PRODUCTION', 'PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY', 'FRONTEND_URL'];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  billing.memory.orders.clear();
});

function env(values) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, values);
}

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, set() { return this; } };
}
const fail = (err) => { throw err; };

test('mock payment is never a silent fallback on a deployed server', () => {
  env({ FRONTEND_URL: 'http://localhost:3000' });
  assert.equal(payos.isMockMode(), true, 'local dev without keys may use mock');

  env({ FRONTEND_URL: 'https://pickme3d.vercel.app' });
  assert.equal(payos.isMockMode(), false, 'deployed frontend without keys must not fall back to mock');
  assert.equal(payos.isConfigured(), false, 'and checkout must be refused instead');

  env({ NODE_ENV: 'production', PAYMENT_MOCK: 'true', FRONTEND_URL: 'http://localhost:3000' });
  assert.equal(payos.isMockMode(), false, 'production ignores PAYMENT_MOCK without the explicit override');

  env({ NODE_ENV: 'production', PAYMENT_MOCK: 'true', ALLOW_MOCK_PAYMENT_IN_PRODUCTION: 'true' });
  assert.equal(payos.isMockMode(), true);

  env({ PAYMENT_MOCK: 'false', FRONTEND_URL: 'http://localhost:3000' });
  assert.equal(payos.isMockMode(), false);
});

test('webhook rejects mock bodies and bad signatures even in mock mode', async () => {
  env({ PAYMENT_MOCK: 'true', FRONTEND_URL: 'http://localhost:3000' });
  assert.equal(payos.verifyWebhook({ mock: true, data: { orderCode: 1, amount: 99000, code: '00' } }).ok, false);

  env({ PAYOS_CLIENT_ID: 'c', PAYOS_API_KEY: 'k', PAYOS_CHECKSUM_KEY: 'secret', PAYMENT_MOCK: 'false' });
  const data = { orderCode: 5, amount: 99000, code: '00', reference: 'FT123' };
  assert.equal(payos.verifyWebhook({ data, signature: 'nope' }).ok, false);
  const good = payos.verifyWebhook({ data, signature: payos.signData(data, 'secret') });
  assert.equal(good.ok, true);
  assert.equal(good.reference, 'FT123');

  const res = response();
  await payment.webhook({ body: { mock: true, data: { orderCode: 1, amount: 1, code: '00' } } }, res);
  assert.equal(res.statusCode, 400);
});

test('display status separates delivery, refunds and expiry from the raw payment status', () => {
  const future = new Date(Date.now() + 60000);
  const past = new Date(Date.now() - 60000);
  assert.equal(lifecycle.displayStatus({ status: 'PENDING', expiresAt: future }), 'AWAITING_PAYMENT');
  assert.equal(lifecycle.displayStatus({ status: 'PENDING', expiresAt: past }), 'EXPIRED');
  assert.equal(lifecycle.displayStatus({ status: 'VERIFYING' }), 'VERIFYING');
  assert.equal(lifecycle.displayStatus({ status: 'PAID', fulfillmentStatus: 'FAILED' }), 'PROCESSING');
  assert.equal(lifecycle.displayStatus({ status: 'PAID', fulfillmentStatus: 'DONE' }), 'COMPLETED');
  assert.equal(lifecycle.displayStatus({ status: 'PAID', fulfillmentStatus: 'DONE', refund: { status: 'REQUESTED' } }), 'REFUND_IN_PROGRESS');
  assert.equal(lifecycle.displayStatus({ status: 'REFUNDED' }), 'REFUNDED');
});

test('refunds only for paid orders inside the window and only once', () => {
  const recent = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const old = new Date(Date.now() - 40 * 24 * 3600 * 1000);
  assert.equal(lifecycle.refundEligibility({ status: 'PAID', paidAt: recent, refund: { status: 'NONE' } }).ok, true);
  assert.equal(lifecycle.refundEligibility({ status: 'PAID', paidAt: old, refund: { status: 'NONE' } }).ok, false);
  assert.equal(lifecycle.refundEligibility({ status: 'PENDING' }).ok, false);
  assert.equal(lifecycle.refundEligibility({ status: 'PAID', paidAt: recent, refund: { status: 'REQUESTED' } }).ok, false);
  assert.equal(lifecycle.refundEligibility({ status: 'PAID', paidAt: recent, refund: { status: 'REJECTED' } }).ok, false);
});

test('mock confirmation needs the owner and is idempotent', async () => {
  env({ PAYMENT_MOCK: 'true', FRONTEND_URL: 'http://localhost:3000' });
  const res = response();
  await payment.checkout({ user: { id: 'alice', name: 'Alice' }, body: { planId: 'pro' } }, res, fail);
  const code = String(res.body.orderCode);

  const other = response();
  await payment.mockConfirm({ params: { orderCode: code }, user: { id: 'mallory' } }, other, fail);
  assert.equal(other.statusCode, 404);

  const first = response();
  await payment.mockConfirm({ params: { orderCode: code }, user: { id: 'alice' } }, first, fail);
  assert.equal(first.body.result, 'PAID');
  const second = response();
  await payment.mockConfirm({ params: { orderCode: code }, user: { id: 'alice' } }, second, fail);
  assert.equal(second.body.result, 'DUPLICATE');

  env({ PAYMENT_MOCK: 'false' });
  const off = response();
  await payment.mockConfirm({ params: { orderCode: code }, user: { id: 'alice' } }, off, fail);
  assert.equal(off.statusCode, 403);
});

test('checkout is refused when no gateway is configured instead of silently mocking', async () => {
  env({ FRONTEND_URL: 'https://pickme3d.vercel.app' });
  let error;
  await payment.checkout({ user: { id: 'alice' }, body: { planId: 'pro' } }, response(), (err) => { error = err; });
  assert.equal(error.statusCode, 503);
  assert.equal(error.code, 'PAYMENT_NOT_CONFIGURED');
});

test('only subscription plans are refundable; digital products are final sale', () => {
  const paidAt = new Date(Date.now() - 24 * 3600 * 1000);
  const base = { status: 'PAID', paidAt, refund: { status: 'NONE' } };
  assert.equal(lifecycle.refundEligibility({ ...base, orderType: 'SUBSCRIPTION' }).ok, true);
  for (const orderType of ['TEMPLATE_PURCHASE', 'UI_PURCHASE']) {
    const result = lifecycle.refundEligibility({ ...base, orderType });
    assert.equal(result.ok, false, `${orderType} must not be refundable`);
    assert.match(result.reason, /không áp dụng hoàn tiền/);
    assert.equal(lifecycle.isRefundableOrder({ orderType }), false);
  }
  assert.equal(lifecycle.publicOrder({ ...base, orderType: 'TEMPLATE_PURCHASE', amount: 50000 }).refundable, false);
  assert.equal(lifecycle.publicOrder({ ...base, orderType: 'SUBSCRIPTION', planId: 'pro', amount: 99000 }).refundable, true);
});
