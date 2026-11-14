const nodemailer = require('nodemailer');

const SOLE_ADMIN_EMAIL = 'phantrongquy23032005@gmail.com';
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

let transporter = null;

/**
 * Returns or initializes the nodemailer transporter.
 * If SMTP credentials are not present in .env, falls back to a clean mock transport.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } else {
    // In local dev/test without credentials, simulate transport without crashing
    transporter = {
      isMock: true,
      sendMail: async (mailOptions) => {
        console.log(`[EmailService:Mock] Dispatched to: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
        return {
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          response: '250 Mock email accepted',
          mocked: true,
          mailOptions,
        };
      },
    };
  }

  return transporter;
}

/**
 * Test hook to override the transport (used in unit tests)
 */
function _setTransporter(customTransporter) {
  transporter = customTransporter;
}

/**
 * Checks whether automated notification emails should be skipped for a given recipient.
 * Business Rule: Admins must NEVER receive automated user-notification emails.
 */
function shouldSkipEmail(recipientEmail, recipientRole) {
  if (!recipientEmail || typeof recipientEmail !== 'string') {
    return { skip: true, reason: 'No valid recipient email address' };
  }

  const cleanEmail = recipientEmail.trim().toLowerCase();

  // 1. Role is admin
  if (recipientRole === 'admin') {
    return { skip: true, reason: `Recipient has 'admin' role (${cleanEmail})` };
  }

  // 2. Sole platform administrator email
  if (cleanEmail === SOLE_ADMIN_EMAIL.toLowerCase()) {
    return { skip: true, reason: `Recipient is fixed platform administrator (${cleanEmail})` };
  }

  // 3. Known system admin emails
  if (cleanEmail === 'admin@example.com' || cleanEmail === 'admin@pickme3d.com') {
    return { skip: true, reason: `Recipient is system administrator (${cleanEmail})` };
  }

  return { skip: false };
}

/**
 * Format currency in Vietnamese Dong (VND)
 */
function formatVND(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + ' VNĐ';
}

/**
 * Generates the responsive HTML email template for PickMe3D
 */
function generateEmailHtml({
  badgeText = 'THÔNG BÁO TỪ QUẢN TRỊ VIÊN',
  badgeColor = '#6366f1',
  badgeBg = 'rgba(99, 102, 241, 0.15)',
  recipientName = 'Quý khách',
  headline = 'Cập nhật trạng thái yêu cầu của bạn',
  introMessage = 'Yêu cầu của bạn trên hệ thống PickMe3D Platform vừa được Ban Quản Trị xem xét và cập nhật trạng thái.',
  summaryItems = [],
  notesTitle = 'Ghi chú / Phản hồi từ Ban Quản Trị:',
  notesContent = '',
  actionUrl = `${FRONTEND_URL}/`,
  actionLabel = 'Xem chi tiết trên hệ thống',
}) {
  const summaryRowsHtml = summaryItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #94a3b8; font-size: 13px; font-weight: 500; width: 38%;">
          ${item.label}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #f1f5f9; font-size: 13px; font-weight: 600;">
          ${item.value}
        </td>
      </tr>
    `
    )
    .join('');

  const notesBoxHtml = notesContent
    ? `
      <div style="margin-top: 20px; padding: 14px 18px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          ${notesTitle}
        </div>
        <div style="font-size: 13px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap;">${notesContent}</div>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PickMe3D Platform Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(17, 24, 39, 0) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      <span style="color: #6366f1;">PickMe3D</span> Platform
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                      Hệ thống Thông báo Tự động & Quản trị Sự cố
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeColor}40; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 19px; font-weight: 700; color: #ffffff; line-height: 1.4;">
                ${headline}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Xin chào <strong style="color: #f1f5f9;">${recipientName}</strong>,<br>
                ${introMessage}
              </p>

              <!-- Summary Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background: rgba(0, 0, 0, 0.25); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; margin-bottom: 16px;">
                ${summaryRowsHtml}
              </table>

              <!-- Notes Box -->
              ${notesBoxHtml}

              <!-- Action Button -->
              <div style="margin-top: 32px; text-align: center;">
                <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; border-radius: 12px; background: #6366f1; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);">
                  ${actionLabel} →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                Đây là email thông báo tự động từ hệ thống quản trị PickMe3D Platform.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} PickMe3D Platform. Bảo lưu mọi quyền.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Base generic email sender. Safe, non-blocking and respects admin exclusion.
 */
async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"PickMe3D Platform" <notifications@pickme3d.com>';

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text: text || subject,
  };

  try {
    const result = await mailTransporter.sendMail(mailOptions);
    return { success: true, result };
  } catch (error) {
    console.warn(`[EmailService] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger 1: Payout Request Status Update (Approved/Paid or Rejected)
 * Recipient: Creator who requested the payout.
 */
async function sendPayoutStatusEmail({ payout, recipientUser = null }) {
  if (!payout) return { success: false, message: 'No payout provided' };

  const recipientEmail = payout.creatorEmail || recipientUser?.email;
  const recipientRole = recipientUser?.role || 'user';
  const recipientName = payout.creatorName || recipientUser?.name || 'Creator';

  // Enforce Admin Exclusion Rule
  const check = shouldSkipEmail(recipientEmail, recipientRole);
  if (check.skip) {
    console.log(`[EmailService] Skipped Payout email: ${check.reason}`);
    return { success: false, skipped: true, reason: check.reason };
  }

  const isPaid = payout.status === 'PAID';
  const formattedAmount = formatVND(payout.amount);

  const subject = isPaid
    ? `[PickMe3D] Yêu cầu rút tiền ${formattedAmount} đã được giải ngân thành công`
    : `[PickMe3D] Yêu cầu rút tiền ${formattedAmount} đã bị từ chối`;

  const headline = isPaid
    ? `Yêu cầu rút tiền ${formattedAmount} đã được duyệt và chi trả`
    : `Yêu cầu rút tiền ${formattedAmount} đã bị từ chối`;

  const introMessage = isPaid
    ? `Ban Quản Trị PickMe3D đã phê duyệt yêu cầu rút tiền của bạn và chuyển khoản thành công tới tài khoản ngân hàng đã cung cấp.`
    : `Yêu cầu rút tiền của bạn đã bị từ chối sau khi Ban Quản Trị xem xét thông tin. Số dư khả dụng của bạn đã được cập nhật lại theo quy định.`;

  const badgeText = isPaid ? 'ĐÃ GIẢI NGÂN (PAID)' : 'ĐÃ TỪ CHỐI (REJECTED)';
  const badgeColor = isPaid ? '#10b981' : '#f43f5e';
  const badgeBg = isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';

  const summaryItems = [
    { label: 'Mã yêu cầu', value: payout._id ? String(payout._id) : 'N/A' },
    { label: 'Số tiền yêu cầu', value: formattedAmount },
    {
      label: 'Ngân hàng nhận',
      value: payout.bankInfo
        ? `${payout.bankInfo.bankName} - STK: ${payout.bankInfo.accountNumber} (${payout.bankInfo.accountHolder})`
        : 'N/A',
    },
    {
      label: 'Trạng thái',
      value: `<span style="color: ${badgeColor}; font-weight: 700;">${isPaid ? 'Thành công (PAID)' : 'Từ chối (REJECTED)'}</span>`,
    },
    {
      label: 'Thời gian xử lý',
      value: new Date(payout.processedAt || Date.now()).toLocaleString('vi-VN'),
    },
  ];

  if (isPaid && payout.paymentProof) {
    summaryItems.push({
      label: 'Chứng từ chuyển tiền',
      value: `<a href="${payout.paymentProof}" target="_blank" style="color: #6366f1; text-decoration: underline;">Xem ảnh biên lai ngân hàng ↗</a>`,
    });
  }

  const html = generateEmailHtml({
    badgeText,
    badgeColor,
    badgeBg,
    recipientName,
    headline,
    introMessage,
    summaryItems,
    notesTitle: isPaid ? 'Ghi chú xác nhận từ Quản trị viên:' : 'Lý do từ chối yêu cầu rút tiền:',
    notesContent: payout.adminNote || (isPaid ? 'Đã hoàn tất thanh toán giải ngân.' : 'Vui lòng kiểm tra lại thông tin tài khoản ngân hàng hoặc số dư khả dụng.'),
    actionUrl: `${FRONTEND_URL}/creator/wallet`,
    actionLabel: 'Truy cập Ví Creator & Lịch sử Giao dịch',
  });

  return await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * Trigger 2: Report & Appeal Status Update (Resolved, Dismissed, Investigating)
 * Recipient: User who submitted the report or appeal.
 */
async function sendReportStatusEmail({ report, recipientUser = null }) {
  if (!report) return { success: false, message: 'No report provided' };

  const recipientEmail = report.senderEmail || recipientUser?.email;
  const recipientRole = recipientUser?.role || 'user';
  const recipientName = report.reporterName || recipientUser?.name || 'Người dùng';

  // Enforce Admin Exclusion Rule
  const check = shouldSkipEmail(recipientEmail, recipientRole);
  if (check.skip) {
    console.log(`[EmailService] Skipped Report email: ${check.reason}`);
    return { success: false, skipped: true, reason: check.reason };
  }

  const isAppeal = report.ticketType === 'APPEAL';
  const status = report.status || 'pending';

  let statusLabel = 'Đã cập nhật';
  let badgeColor = '#6366f1';
  let badgeBg = 'rgba(99, 102, 241, 0.15)';

  if (status === 'resolved') {
    statusLabel = isAppeal ? 'ĐÃ GIẢI QUYẾT' : 'ĐÃ XỬ LÝ VI PHẠM';
    badgeColor = '#10b981';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
  } else if (status === 'dismissed') {
    statusLabel = 'ĐÃ TỪ CHỐI / BÁC BỎ';
    badgeColor = '#f43f5e';
    badgeBg = 'rgba(244, 63, 94, 0.15)';
  } else if (status === 'investigating') {
    statusLabel = 'ĐANG ĐIỀU TRA & XỬ LÝ';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
  }

  const entityTitle = report.targetTitle || report.reason || 'Yêu cầu hỗ trợ';

  const subject = isAppeal
    ? `[PickMe3D] Cập nhật kết quả khiếu nại: "${entityTitle}"`
    : `[PickMe3D] Thông báo xử lý báo cáo vi phạm: "${entityTitle}"`;

  const headline = isAppeal
    ? `Khiếu nại / Kháng nghị của bạn đã được Admin xử lý`
    : `Báo cáo vi phạm của bạn đã được Ban Quản Trị xem xét`;

  const introMessage = isAppeal
    ? `Ban Quản Trị PickMe3D đã xem xét khiếu nại của bạn về <strong>${entityTitle}</strong> và đưa ra kết luận xử lý chính thức.`
    : `Cảm ơn bạn đã đóng góp bảo vệ cộng đồng PickMe3D. Báo cáo vi phạm về <strong>${entityTitle}</strong> vừa được cập nhật tiến trình xử lý.`;

  const summaryItems = [
    { label: 'Mã số phiếu', value: report._id ? String(report._id) : 'N/A' },
    { label: 'Phân loại', value: isAppeal ? 'Khiếu nại / Kháng nghị (APPEAL)' : 'Báo cáo vi phạm (REPORT)' },
    { label: 'Lý do gửi', value: report.reason || 'N/A' },
    { label: 'Đối tượng liên quan', value: entityTitle },
    {
      label: 'Kết quả xử lý',
      value: `<span style="color: ${badgeColor}; font-weight: 700;">${statusLabel}</span>`,
    },
    {
      label: 'Thời gian xử lý',
      value: new Date(report.resolvedAt || Date.now()).toLocaleString('vi-VN'),
    },
  ];

  const html = generateEmailHtml({
    badgeText: statusLabel,
    badgeColor,
    badgeBg,
    recipientName,
    headline,
    introMessage,
    summaryItems,
    notesTitle: 'Phản hồi chi tiết từ Ban Quản Trị:',
    notesContent: report.resolutionNotes || 'Ban Quản Trị đã ghi nhận và xử lý sự vụ theo đúng Điều khoản & Tiêu chuẩn cộng đồng PickMe3D.',
    actionUrl: `${FRONTEND_URL}/appeals`,
    actionLabel: 'Kiểm tra Lịch sử Báo cáo & Khiếu nại',
  });

  return await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

module.exports = {
  sendEmail,
  sendPayoutStatusEmail,
  sendReportStatusEmail,
  shouldSkipEmail,
  generateEmailHtml,
  formatVND,
  _setTransporter,
};
