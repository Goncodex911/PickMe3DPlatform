const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Payout = require('../src/models/Payout');
const Report = require('../src/models/Report');
const Notification = require('../src/models/Notification');
const User = require('../src/models/User');

test('Creator Payout & Report Flow Validation', async (t) => {
  await t.test('Payout schema rejects amounts under 10,000 VND', () => {
    const p = new Payout({
      creatorId: new mongoose.Types.ObjectId(),
      creatorName: 'Test Creator',
      creatorEmail: 'creator@example.com',
      amount: 5000,
      bankInfo: {
        bankName: 'MB Bank',
        accountNumber: '123456789',
        accountHolder: 'TEST CREATOR',
      },
    });

    const err = p.validateSync();
    assert.ok(err, 'Should fail validation');
    assert.ok(err.errors.amount, 'amount should fail minimum 10000 check');
  });

  await t.test('Payout schema validates required bank info', () => {
    const p = new Payout({
      creatorId: new mongoose.Types.ObjectId(),
      creatorName: 'Test Creator',
      creatorEmail: 'creator@example.com',
      amount: 50000,
      bankInfo: {
        bankName: '',
        accountNumber: '',
        accountHolder: '',
      },
    });

    const err = p.validateSync();
    assert.ok(err, 'Should fail validation when bank info is empty');
    assert.ok(err.errors['bankInfo.bankName']);
    assert.ok(err.errors['bankInfo.accountNumber']);
    assert.ok(err.errors['bankInfo.accountHolder']);
  });

  await t.test('Payout schema accepts paymentProof URL upon successful payout resolution', () => {
    const p = new Payout({
      creatorId: new mongoose.Types.ObjectId(),
      creatorName: 'Test Creator',
      creatorEmail: 'creator@example.com',
      amount: 50000,
      bankInfo: {
        bankName: 'MB Bank',
        accountNumber: '123456789',
        accountHolder: 'TEST CREATOR',
      },
      status: 'PAID',
      adminNote: 'Đã chuyển khoản Napas',
      paymentProof: 'https://cloudinary.com/pickme3d/payout-proofs/bill_123.jpg',
    });

    const err = p.validateSync();
    assert.equal(err, undefined, 'Payout with paymentProof should pass validation');
    assert.equal(p.paymentProof, 'https://cloudinary.com/pickme3d/payout-proofs/bill_123.jpg');
  });

  await t.test('Report schema accepts both REPORT and APPEAL ticketType with custom reasons and attachments', () => {
    const report = new Report({
      ticketType: 'REPORT',
      reporter: new mongoose.Types.ObjectId(),
      reporterName: 'Reporter User',
      targetType: 'template',
      targetId: new mongoose.Types.ObjectId().toString(),
      reason: 'copyright_infringement',
      description: 'Mẫu thiết kế này sao chép bản quyền',
      attachments: ['https://example.com/evidence1.png'],
    });
    assert.equal(report.validateSync(), undefined, 'Valid report should pass validation');

    const appeal = new Report({
      ticketType: 'APPEAL',
      reporter: new mongoose.Types.ObjectId(),
      reporterName: 'Appeal User',
      appealCategory: 'account_restriction',
      reason: 'Tài khoản bị khóa nhầm lẫn',
      description: 'Tôi không vi phạm tiêu chuẩn cộng đồng, xin xem xét lại',
      attachments: ['https://example.com/evidence2.png'],
    });
    assert.equal(appeal.validateSync(), undefined, 'Valid appeal should pass validation without targetId');
    assert.equal(appeal.ticketType, 'APPEAL');
  });

  await t.test('Notification schema supports new social/admin notification types and link', () => {
    const notif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      type: 'payout_paid',
      message: 'Yêu cầu rút tiền 500.000 VNĐ đã được duyệt',
      link: '/creator/wallet',
      metadata: { amount: 500000 },
    });

    const err = notif.validateSync();
    assert.equal(err, undefined, 'Notification should be valid without actor');
    assert.equal(notif.link, '/creator/wallet');
    assert.equal(notif.type, 'payout_paid');
  });
});

