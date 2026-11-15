const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const lifecycle = require('../src/services/paymentLifecycle');

function keptQuery(result) {
  return { sort() { return this; }, select: async () => result };
}

test('orders whose money is being returned can never become a sale again', () => {
  assert.equal(lifecycle.isReturnSettled({ status: 'VOIDED' }), true);
  assert.equal(lifecycle.isReturnSettled({ status: 'CANCELLED', excessReturn: { type: 'PARTIAL_PAYMENT', status: 'PENDING' } }), true);
  assert.equal(lifecycle.isReturnSettled({ status: 'CANCELLED', excessReturn: { type: 'PARTIAL_PAYMENT', status: 'CANCELLED' } }), false);
  assert.equal(lifecycle.isReturnSettled({ status: 'PAID', excessReturn: { type: 'OVERPAID', status: 'PENDING' } }), false, 'overpaid orders stay valid sales');
});

test('a second paid order for an owned digital product is detected as a duplicate', async (t) => {
  t.mock.method(Order, 'findOne', () => keptQuery({ orderCode: 111 }));
  const order = {
    _id: new mongoose.Types.ObjectId(), orderCode: 222, userId: 'u1', orderType: 'TEMPLATE_PURCHASE',
    templateId: new mongoose.Types.ObjectId(), status: 'PAID', amount: 50000, paidAmount: 50000, paymentMode: 'mock',
  };
  const { options, received } = await lifecycle.excessReturnOptions(order);
  assert.equal(received.total, 50000);
  const dup = options.find((o) => o.type === 'DUPLICATE_ORDER');
  assert.ok(dup);
  assert.equal(dup.amount, 50000);
  assert.equal(dup.keepOrderCode, 111);
  assert.equal(options.some((o) => o.type === 'OVERPAID'), false);
});

test('subscriptions are never treated as duplicate orders (renewals stack)', async (t) => {
  t.mock.method(Order, 'findOne', () => keptQuery({ orderCode: 111 }));
  const { options } = await lifecycle.excessReturnOptions({
    _id: new mongoose.Types.ObjectId(), orderCode: 3, userId: 'u1', orderType: 'SUBSCRIPTION', planId: 'pro',
    status: 'PAID', amount: 99000, paidAmount: 99000, paymentMode: 'mock',
  });
  assert.equal(options.length, 0);
});

test('overpayment and extra bank transactions give the surplus to return; partial payment returns what was paid', async (t) => {
  t.mock.method(Order, 'findOne', () => keptQuery(null));
  const over = await lifecycle.excessReturnOptions({
    _id: new mongoose.Types.ObjectId(), orderCode: 4, userId: 'u1', orderType: 'UI_PURCHASE', productId: 'x',
    status: 'PAID', amount: 49000, paidAmount: 49000, paymentMode: 'mock',
    extraTransactions: [{ reference: 'FT2', amount: 49000 }],
  });
  assert.deepEqual(over.options.map((o) => [o.type, o.amount]), [['OVERPAID', 49000]]);

  const partial = await lifecycle.excessReturnOptions({
    _id: new mongoose.Types.ObjectId(), orderCode: 5, userId: 'u1', orderType: 'TEMPLATE_PURCHASE',
    status: 'VERIFYING', amount: 50000, paidAmount: 20000, paymentMode: 'mock',
  });
  assert.deepEqual(partial.options.map((o) => [o.type, o.amount]), [['PARTIAL_PAYMENT', 20000]]);

  const open = await lifecycle.excessReturnOptions({
    _id: new mongoose.Types.ObjectId(), orderCode: 6, status: 'PAID', amount: 1, paidAmount: 5,
    excessReturn: { status: 'PENDING', type: 'OVERPAID' },
  });
  assert.equal(open.options.length, 0, 'no second return while one is open');
});

test('VOIDED is a valid order status and the customer view exposes the return', () => {
  const order = new Order({ orderCode: 9, userId: 'u', orderType: 'TEMPLATE_PURCHASE', amount: 50000, status: 'VOIDED',
    excessReturn: { status: 'PENDING', type: 'DUPLICATE_ORDER', amount: 50000, keepOrderCode: 8 } });
  assert.equal(order.validateSync(), undefined);
  const view = lifecycle.publicOrder(order);
  assert.equal(view.displayStatus, 'VOIDED');
  assert.equal(view.excessReturn.keepOrderCode, 8);
  assert.equal(view.refundEligible, false);
});
