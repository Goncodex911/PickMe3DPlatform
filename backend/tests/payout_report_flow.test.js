const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Payout = require('../src/models/Payout');
const Report = require('../src/models/Report');
const Notification = require('../src/models/Notification');
const AuditLog = require('../src/models/AuditLog');
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

  await t.test('User schema supports Creator ratings and reviews (1-5 stars)', () => {
    const creator = new User({
      name: 'Nguyễn Hiếu Thuận',
      email: 'thuan@example.com',
      avgRating: 4.5,
      ratingsCount: 2,
      reviews: [
        {
          user: new mongoose.Types.ObjectId(),
          userName: 'Reviewer A',
          rating: 5,
          comment: 'Thiết kế rất đẹp và sáng tạo!',
        },
        {
          user: new mongoose.Types.ObjectId(),
          userName: 'Reviewer B',
          rating: 4,
          comment: 'Mẫu dễ sử dụng.',
        },
      ],
    });
    assert.equal(creator.validateSync(), undefined, 'Valid creator reviews should pass validation');
    assert.equal(creator.reviews.length, 2);

    const invalidCreator = new User({
      name: 'Invalid Rating Creator',
      email: 'invalid@example.com',
      reviews: [
        {
          user: new mongoose.Types.ObjectId(),
          userName: 'Reviewer C',
          rating: 6,
        },
      ],
    });
    const invalidErr = invalidCreator.validateSync();
    assert.ok(invalidErr, 'Rating > 5 should fail validation');
  });

  await t.test('Creator Report flow: Report(CREATOR), Admin Notification(/admin/reports), Creator Warning, and AuditLog', () => {
    const creatorId = new mongoose.Types.ObjectId();
    const reporterId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const creatorReport = new Report({
      ticketType: 'REPORT',
      reporter: reporterId,
      reporterName: 'Lê Minh',
      targetType: 'CREATOR',
      targetId: creatorId.toString(),
      targetTitle: 'Nguyễn Hiếu Thuận (@hieuthuan)',
      targetUrl: `/creator/?id=${creatorId.toString()}`,
      reason: 'copyright_infringement',
      description: 'Creator đăng nhiều mẫu sao chép trái phép',
    });
    assert.equal(creatorReport.validateSync(), undefined, 'CREATOR report should pass validation');
    assert.equal(creatorReport.ticketType, 'REPORT');
    assert.equal(creatorReport.targetType, 'CREATOR');

    const adminNotif = new Notification({
      recipient: adminId,
      actor: reporterId,
      type: 'report_submitted',
      message: 'User Lê Minh reported Creator Nguyễn Hiếu Thuận (copyright_infringement)',
      link: '/admin/reports',
    });
    assert.equal(adminNotif.validateSync(), undefined, 'Admin report_submitted notification should pass validation');
    assert.equal(adminNotif.isRead, false);
    assert.equal(adminNotif.link, '/admin/reports');

    const warningNotif = new Notification({
      recipient: creatorId,
      actor: adminId,
      type: 'creator_warning',
      message: 'Cảnh báo từ Quản trị viên về báo cáo trên hồ sơ Creator của bạn.',
      link: '/appeals',
    });
    assert.equal(warningNotif.validateSync(), undefined, 'Creator warning notification should pass validation');
    assert.equal(warningNotif.type, 'creator_warning');

    const audit = new AuditLog({
      actor: adminId,
      actorName: 'Admin User',
      actorEmail: 'admin@example.com',
      action: 'report_resolved',
      targetType: 'creator',
      targetId: creatorReport._id.toString(),
      targetLabel: 'Nguyễn Hiếu Thuận (@hieuthuan)',
    });
    assert.equal(audit.validateSync(), undefined, 'AuditLog with creator targetType should pass validation');
  });
});

