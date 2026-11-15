const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Payout = require('../src/models/Payout');
const payoutController = require('../src/controllers/payoutController');
const admin = require('../src/controllers/adminController');

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const fail = (err) => { throw err; };
const creatorId = new mongoose.Types.ObjectId();
const bankInfo = { bankName: 'MB', accountNumber: '123', accountHolder: 'A' };

/** Wallet: sales earnings from PAID orders and existing payouts. */
function mockWallet(t, { earnings = 0, payouts = [] }) {
  t.mock.method(Order, 'find', () => ({
    populate() { return this; },
    sort: async () => (earnings ? [{ creatorEarnings: earnings }] : []),
  }));
  t.mock.method(Payout, 'find', () => ({ sort: async () => payouts }));
}

test('a second payout request while one is being processed is refused (no double spend)', async (t) => {
  t.mock.method(User, 'findOneAndUpdate', async () => null); // lock held by the other request
  t.mock.method(User, 'exists', async () => true);
  const create = t.mock.method(Payout, 'create', async () => ({}));
  const res = response();
  await payoutController.requestPayout({ user: { _id: creatorId }, body: { amount: 50000, bankInfo } }, res, fail);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'PAYOUT_IN_PROGRESS');
  assert.equal(create.mock.calls.length, 0);
});

test('withdrawing more than the available balance is blocked with a warning and the lock is released', async (t) => {
  t.mock.method(User, 'findOneAndUpdate', async () => ({ _id: creatorId, walletBalance: 0, savedBankInfo: {} }));
  const release = t.mock.method(User, 'updateOne', async () => ({}));
  const create = t.mock.method(Payout, 'create', async () => ({}));
  mockWallet(t, { earnings: 70000, payouts: [{ status: 'PENDING', amount: 30000 }] });
  const res = response();
  await payoutController.requestPayout({ user: { _id: creatorId }, body: { amount: 50000, bankInfo } }, res, fail);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'INSUFFICIENT_BALANCE');
  assert.match(res.body.message, /40\.000/);
  assert.equal(create.mock.calls.length, 0);
  assert.deepEqual(release.mock.calls[0].arguments[1], { $set: { payoutLockUntil: null } });
});

test('a negative wallet (voided order already withdrawn) blocks any payout', async (t) => {
  t.mock.method(User, 'findOneAndUpdate', async () => ({ _id: creatorId, walletBalance: 0, savedBankInfo: {} }));
  t.mock.method(User, 'updateOne', async () => ({}));
  mockWallet(t, { earnings: 35000, payouts: [{ status: 'PAID', amount: 70000 }] });
  const res = response();
  await payoutController.requestPayout({ user: { _id: creatorId }, body: { amount: 10000, bankInfo } }, res, fail);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'NEGATIVE_BALANCE');
  assert.equal(res.body.metrics.shortfall, 35000);
});

test('admin cannot change a payout that was already processed', async (t) => {
  t.mock.method(Payout, 'findById', async () => ({ _id: 'p1', status: 'PAID', amount: 50000, creatorId }));
  const update = t.mock.method(Payout, 'findOneAndUpdate', async () => null);
  const res = response();
  await admin.updatePayoutStatus({ params: { id: 'p1' }, body: { status: 'REJECTED' }, user: { _id: 'a' } }, res, fail);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'PAYOUT_ALREADY_PROCESSED');
  assert.equal(update.mock.calls.length, 0);
});

test('admin approval re-checks the creator balance at approval time', async (t) => {
  t.mock.method(Payout, 'findById', async () => ({ _id: 'p2', status: 'PENDING', amount: 50000, creatorId }));
  t.mock.method(User, 'findById', async () => ({ _id: creatorId, walletBalance: 0 }));
  // Earnings fell to 30k after a duplicate order was voided; this request (50k) is the only pending one.
  mockWallet(t, { earnings: 30000, payouts: [{ status: 'PENDING', amount: 50000 }] });
  const update = t.mock.method(Payout, 'findOneAndUpdate', async () => null);
  const res = response();
  await admin.updatePayoutStatus({ params: { id: 'p2' }, body: { status: 'PAID' }, user: { _id: 'a' } }, res, fail);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'INSUFFICIENT_CREATOR_BALANCE');
  assert.equal(res.body.coverable, 30000);
  assert.equal(update.mock.calls.length, 0);
});
