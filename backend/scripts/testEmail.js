const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

async function main() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
  const to = process.argv[2] || process.env.ADMIN_EMAIL || 'congdvt119214@gmail.com';

  console.log('--- KIỂM TRA CẤU HÌNH GMAIL SMTP ---');
  console.log('1. Tài khoản gửi (SMTP_USER):', user || '(CHƯA CÓ TRONG .ENV)');
  console.log('2. Mật khẩu ứng dụng (SMTP_PASS):', pass ? `******** (${pass.length} ký tự)` : '(CHƯA CÓ TRONG .ENV)');
  console.log('3. Người nhận thử nghiệm:', to);

  if (!user || !pass) {
    console.error('\n❌ THẤT BẠI: Bạn chưa thêm SMTP_USER và SMTP_PASS vào file backend/.env!');
    console.error('Vui lòng mở backend/.env và thêm:');
    console.error('  SMTP_USER=email_cua_ban@gmail.com');
    console.error('  SMTP_PASS=mat_khau_ung_dung_16_chu_cai\n');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  console.log('\nĐang kết nối và xác thực với máy chủ Gmail (smtp.gmail.com)...');
  try {
    await transporter.verify();
    console.log('✅ Xác thực Gmail thành công! Tài khoản và Mật khẩu ứng dụng hợp lệ.');

    console.log(`Đang gửi email thử nghiệm tới ${to}...`);
    const info = await transporter.sendMail({
      from: `"PickMe3D Platform" <${user}>`,
      to,
      subject: '[PickMe3D] Thử nghiệm kết nối Gmail thành công!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #090d16; color: #fff; border-radius: 12px;">
          <h2 style="color: #6366f1;">PickMe3D Platform</h2>
          <p>Xin chào,</p>
          <p>Đây là email kiểm tra kết nối từ hệ thống PickMe3D Platform.</p>
          <p>Nếu bạn nhận được email này, tính năng gửi thông báo tự động từ Admin tới Gmail đã hoạt động <strong>100% hoàn hảo</strong>!</p>
          <div style="margin-top: 15px; padding: 10px; background: rgba(99,102,241,0.2); border-radius: 8px;">
            Thời gian gửi: ${new Date().toLocaleString('vi-VN')}
          </div>
        </div>
      `,
    });

    console.log(`\n🎉 THÀNH CÔNG: Đã gửi email tới ${to}!`);
    console.log(`Message ID: ${info.messageId}`);
    console.log('Vui lòng mở hộp thư Gmail của người nhận để kiểm tra thư mới.');
  } catch (error) {
    console.error('\n❌ GỬI MAIL THẤT BẠI:');
    console.error(error.message);
    if (error.code === 'EAUTH') {
      console.error('\n👉 Gợi ý: Lỗi EAUTH (535-5.7.8) xảy ra do mật khẩu chưa đúng. Bạn phải dùng "Mật khẩu ứng dụng" (App Password 16 ký tự) tạo từ https://myaccount.google.com/apppasswords, không dùng mật khẩu đăng nhập tài khoản thông thường.');
    }
    process.exit(1);
  }
}

main();
