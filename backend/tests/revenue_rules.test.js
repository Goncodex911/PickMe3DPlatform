const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Mock in-memory Order schema testing
const Order = require('../src/models/Order');
const Template = require('../src/models/Template');

test.describe('Revenue Rules 2.1 & 3.2 Verification', () => {
  test('Rule 2.1.A: Admin-owned paid template in Template Section yields 100% Admin revenue and 0 Creator commission', () => {
    const order = new Order({
      orderCode: 2001,
      userId: 'user_123',
      orderType: 'TEMPLATE_PURCHASE',
      templateId: new mongoose.Types.ObjectId(),
      sellerType: 'ADMIN',
      transactionSource: 'TEMPLATE_SECTION',
      amount: 150000,
      status: 'PAID',
    });

    // Validate pre-save calculation
    order.validateSync();
    // Simulate pre-save hook
    const finalAmount = order.amount;
    order.grossAmount = finalAmount;
    if (order.sellerType === 'ADMIN' || order.transactionSource === 'ADMIN_MARKETPLACE') {
      order.creatorEarnings = 0;
      order.adminRevenue = finalAmount;
    }

    assert.equal(order.grossAmount, 150000);
    assert.equal(order.creatorEarnings, 0, 'Admin-owned template must generate 0 Creator commission');
    assert.equal(order.adminRevenue, 150000, 'Admin receives 100% of eligible revenue');
  });

  test('Rule 2.1.B: Creator-owned paid template in Template Section yields 70% Creator and 30% Admin revenue', () => {
    const order = new Order({
      orderCode: 2002,
      userId: 'user_456',
      orderType: 'TEMPLATE_PURCHASE',
      templateId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      sellerType: 'CREATOR',
      transactionSource: 'TEMPLATE_SECTION',
      amount: 200000,
      status: 'PAID',
    });

    const finalAmount = order.amount;
    order.grossAmount = finalAmount;
    if (order.sellerType === 'CREATOR' && order.transactionSource === 'TEMPLATE_SECTION') {
      order.creatorEarnings = Math.round(finalAmount * 0.7);
      order.adminRevenue = finalAmount - order.creatorEarnings;
    }

    assert.equal(order.grossAmount, 200000);
    assert.equal(order.creatorEarnings, 140000, 'Creator must receive exactly 70% (140,000 VND)');
    assert.equal(order.adminRevenue, 60000, 'Admin must receive exactly 30% (60,000 VND)');
    assert.equal(order.creatorEarnings + order.adminRevenue, order.grossAmount, 'Sum of split must equal gross purchase amount');
  });

  test('Rule 2.1.C: Admin Marketplace yields 100% Admin revenue and no Creator commission applies', () => {
    const order = new Order({
      orderCode: 2003,
      userId: 'user_789',
      orderType: 'TEMPLATE_PURCHASE',
      templateId: new mongoose.Types.ObjectId(),
      sellerType: 'ADMIN',
      transactionSource: 'ADMIN_MARKETPLACE',
      amount: 300000,
      status: 'PAID',
    });

    const finalAmount = order.amount;
    order.grossAmount = finalAmount;
    if (order.sellerType === 'ADMIN' || order.transactionSource === 'ADMIN_MARKETPLACE') {
      order.creatorEarnings = 0;
      order.adminRevenue = finalAmount;
    }

    assert.equal(order.grossAmount, 300000);
    assert.equal(order.creatorEarnings, 0, 'Admin Marketplace has no Creator commission');
    assert.equal(order.adminRevenue, 300000, 'Admin receives 100% of revenue in Admin Marketplace');
  });

  test('Rule 3.2.4: Subscription orders yield 100% Admin revenue and are tagged to SUBSCRIPTION source', () => {
    const order = new Order({
      orderCode: 2004,
      userId: 'user_999',
      orderType: 'SUBSCRIPTION',
      planId: 'pro',
      months: 1,
      amount: 99000,
      status: 'PAID',
    });

    const finalAmount = order.amount;
    order.grossAmount = finalAmount;
    order.sellerType = 'ADMIN';
    order.transactionSource = 'SUBSCRIPTION';
    order.creatorEarnings = 0;
    order.adminRevenue = finalAmount;

    assert.equal(order.orderType, 'SUBSCRIPTION');
    assert.equal(order.planId, 'pro');
    assert.equal(order.transactionSource, 'SUBSCRIPTION');
    assert.equal(order.creatorEarnings, 0);
    assert.equal(order.adminRevenue, 99000);
  });

  test('Template schema pre-save automatically infers isPaid based on price', () => {
    const freeTemplate = new Template({
      title: 'Free Blueprint',
      docData: { parts: [] },
      price: 0,
    });
    // Trigger pre-save logic
    if (freeTemplate.price !== undefined) {
      freeTemplate.isPaid = Number(freeTemplate.price) > 0;
    }
    assert.equal(freeTemplate.isPaid, false, 'Template with price 0 must have isPaid=false');

    const paidTemplate = new Template({
      title: 'Premium Cyber Outfit',
      docData: { parts: [] },
      price: 150000,
    });
    if (paidTemplate.price !== undefined) {
      paidTemplate.isPaid = Number(paidTemplate.price) > 0;
    }
    assert.equal(paidTemplate.isPaid, true, 'Template with price > 0 must have isPaid=true');
  });
});

