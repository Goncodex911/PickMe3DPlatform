const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldSkipEmail,
  sendPayoutStatusEmail,
  sendReportStatusEmail,
  formatVND,
  _setTransporter,
} = require('../src/services/emailService');

test.describe('Automated Email Notification System', () => {
  // Mock transporter to capture dispatched emails
  let capturedEmails = [];

  const mockTransporter = {
    sendMail: async (mailOptions) => {
      capturedEmails.push(mailOptions);
      return {
        messageId: `test-${Date.now()}-${Math.random()}`,
        response: '250 Test OK',
      };
    },
  };

  test.beforeEach(() => {
    capturedEmails = [];
    _setTransporter(mockTransporter);
  });

  // ==========================================
  // 1. Business Rule: Admin Exclusion Verification
  // ==========================================
  test.it('Admin Exclusion Rule: should skip automated notification emails for admin users', () => {
    // Role is admin
    const checkRoleAdmin = shouldSkipEmail('user1@example.com', 'admin');
    assert.strictEqual(checkRoleAdmin.skip, true);
    assert.match(checkRoleAdmin.reason, /admin/i);

    // Sole platform administrator email
    const checkSoleAdmin = shouldSkipEmail('phantrongquy23032005@gmail.com', 'user');
    assert.strictEqual(checkSoleAdmin.skip, true);
    assert.match(checkSoleAdmin.reason, /fixed platform administrator/i);

    // System admin email
    const checkSysAdmin = shouldSkipEmail('admin@example.com', 'user');
    assert.strictEqual(checkSysAdmin.skip, true);

    // Empty/missing email
    const checkMissing = shouldSkipEmail('', 'user');
    assert.strictEqual(checkMissing.skip, true);
  });

  test.it('Admin Exclusion Rule: should ALLOW automated notification emails for standard users and creators', () => {
    const checkUser = shouldSkipEmail('creator123@gmail.com', 'user');
    assert.strictEqual(checkUser.skip, false);

    const checkNormal = shouldSkipEmail('nguyenvana@gmail.com');
    assert.strictEqual(checkNormal.skip, false);
  });

  // ==========================================
  // 2. Trigger Event: Payout Approval (PAID)
  // ==========================================
  test.it('Payout Request Approved: triggers email with amount, bank details, and wallet link', async () => {
    const payout = {
      _id: '6735a1b2c3d4e5f6a7b8c9d0',
      creatorEmail: 'creator_thuan@example.com',
      creatorName: 'Nguyễn Hiếu Thuận',
      amount: 500000,
      status: 'PAID',
      bankInfo: {
        bankName: 'MBBank',
        accountNumber: '999988887777',
        accountHolder: 'NGUYEN HIEU THUAN',
      },
      paymentProof: 'https://res.cloudinary.com/pickme3d/image/upload/proof123.jpg',
      adminNote: 'Đã giải ngân qua VietQR',
      processedAt: new Date('2026-11-14T10:00:00Z'),
    };

    const recipientUser = {
      _id: 'user_thuan_01',
      name: 'Nguyễn Hiếu Thuận',
      email: 'creator_thuan@example.com',
      role: 'user',
    };

    const res = await sendPayoutStatusEmail({ payout, recipientUser });
    assert.strictEqual(res.success, true);
    assert.strictEqual(capturedEmails.length, 1);

    const sent = capturedEmails[0];
    assert.strictEqual(sent.to, 'creator_thuan@example.com');
    assert.match(sent.subject, /500\.000 VNĐ/);
    assert.match(sent.subject, /giải ngân thành công/i);
    assert.match(sent.html, /MBBank/);
    assert.match(sent.html, /999988887777/);
    assert.match(sent.html, /proof123\.jpg/);
    assert.match(sent.html, /Đã giải ngân qua VietQR/);
    assert.match(sent.html, /\/creator\/wallet/);
  });

  // ==========================================
  // 3. Trigger Event: Payout Rejection (REJECTED)
  // ==========================================
  test.it('Payout Request Rejected: triggers email with explicit rejection reason', async () => {
    const payout = {
      _id: '6735a1b2c3d4e5f6a7b8c9d1',
      creatorEmail: 'creator_thuan@example.com',
      creatorName: 'Nguyễn Hiếu Thuận',
      amount: 250000,
      status: 'REJECTED',
      bankInfo: {
        bankName: 'Vietcombank',
        accountNumber: '0071000123456',
        accountHolder: 'NGUYEN HIEU THUAN',
      },
      adminNote: 'Số tài khoản thụ hưởng không khớp với tên CMND/CCCD đăng ký',
      processedAt: new Date('2026-11-14T11:00:00Z'),
    };

    const recipientUser = {
      _id: 'user_thuan_01',
      name: 'Nguyễn Hiếu Thuận',
      email: 'creator_thuan@example.com',
      role: 'user',
    };

    const res = await sendPayoutStatusEmail({ payout, recipientUser });
    assert.strictEqual(res.success, true);
    assert.strictEqual(capturedEmails.length, 1);

    const sent = capturedEmails[0];
    assert.strictEqual(sent.to, 'creator_thuan@example.com');
    assert.match(sent.subject, /bị từ chối/i);
    assert.match(sent.html, /Số tài khoản thụ hưởng không khớp/);
    assert.match(sent.html, /ĐÃ TỪ CHỐI \(REJECTED\)/);
    assert.match(sent.html, /\/creator\/wallet/);
  });

  // ==========================================
  // 4. Admin Exclusion for Payouts
  // ==========================================
  test.it('Payout Request to Admin User: is strictly skipped without dispatching email', async () => {
    const payout = {
      _id: '6735a1b2c3d4e5f6a7b8c9d2',
      creatorEmail: 'phantrongquy23032005@gmail.com',
      creatorName: 'Admin Quy',
      amount: 1000000,
      status: 'PAID',
    };

    const adminUser = {
      _id: 'admin_quy_01',
      name: 'Admin Quy',
      email: 'phantrongquy23032005@gmail.com',
      role: 'admin',
    };

    const res = await sendPayoutStatusEmail({ payout, recipientUser: adminUser });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.skipped, true);
    assert.strictEqual(capturedEmails.length, 0); // No email sent
  });

  // ==========================================
  // 5. Trigger Event: Report Resolution (REPORT)
  // ==========================================
  test.it('Violation Report Resolution: triggers email with status, target, and resolution notes', async () => {
    const report = {
      _id: '6735a1b2c3d4e5f6a7b8c9d3',
      ticketType: 'REPORT',
      senderEmail: 'reporter_cong@example.com',
      reporterName: 'Công Thành',
      targetType: 'template',
      targetTitle: 'Mẫu 3D Ghế Sofa Hiện Đại',
      reason: 'Copyright Infringement',
      status: 'resolved',
      resolutionNotes: 'Đã xác minh bản quyền và gỡ bỏ phiên bản sao chép trái phép.',
      resolvedAt: new Date('2026-11-14T12:00:00Z'),
    };

    const recipientUser = {
      _id: 'user_cong_01',
      name: 'Công Thành',
      email: 'reporter_cong@example.com',
      role: 'user',
    };

    const res = await sendReportStatusEmail({ report, recipientUser });
    assert.strictEqual(res.success, true);
    assert.strictEqual(capturedEmails.length, 1);

    const sent = capturedEmails[0];
    assert.strictEqual(sent.to, 'reporter_cong@example.com');
    assert.match(sent.subject, /báo cáo vi phạm/i);
    assert.match(sent.subject, /Mẫu 3D Ghế Sofa Hiện Đại/);
    assert.match(sent.html, /ĐÃ XỬ LÝ VI PHẠM/);
    assert.match(sent.html, /Đã xác minh bản quyền và gỡ bỏ/);
    assert.match(sent.html, /\/appeals/);
  });

  // ==========================================
  // 6. Trigger Event: Appeal Status Update (APPEAL)
  // ==========================================
  test.it('Direct Appeal Resolution: triggers email with status, reason, and admin feedback', async () => {
    const appeal = {
      _id: '6735a1b2c3d4e5f6a7b8c9d4',
      ticketType: 'APPEAL',
      senderEmail: 'user_tientien@example.com',
      reporterName: 'Thủy Tiên',
      targetTitle: 'Kháng nghị khóa tài khoản',
      reason: 'Account Restriction Appeal',
      status: 'resolved',
      resolutionNotes: 'Tài khoản của bạn đã được mở khóa sau khi xác minh danh tính hoàn tất.',
      resolvedAt: new Date('2026-11-14T13:00:00Z'),
    };

    const recipientUser = {
      _id: 'user_tien_01',
      name: 'Thủy Tiên',
      email: 'user_tientien@example.com',
      role: 'user',
    };

    const res = await sendReportStatusEmail({ report: appeal, recipientUser });
    assert.strictEqual(res.success, true);
    assert.strictEqual(capturedEmails.length, 1);

    const sent = capturedEmails[0];
    assert.strictEqual(sent.to, 'user_tientien@example.com');
    assert.match(sent.subject, /kết quả khiếu nại/i);
    assert.match(sent.html, /ĐÃ GIẢI QUYẾT/);
    assert.match(sent.html, /Tài khoản của bạn đã được mở khóa/);
    assert.match(sent.html, /\/appeals/);
  });

  // ==========================================
  // 7. Admin Exclusion for Reports/Appeals
  // ==========================================
  test.it('Report Status to Admin User: is strictly skipped without dispatching email', async () => {
    const report = {
      _id: '6735a1b2c3d4e5f6a7b8c9d5',
      ticketType: 'APPEAL',
      senderEmail: 'admin@pickme3d.com',
      reporterName: 'Admin',
      status: 'resolved',
    };

    const adminUser = {
      _id: 'admin_01',
      name: 'Admin',
      email: 'admin@pickme3d.com',
      role: 'admin',
    };

    const res = await sendReportStatusEmail({ report, recipientUser: adminUser });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.skipped, true);
    assert.strictEqual(capturedEmails.length, 0); // No email sent
  });
});
