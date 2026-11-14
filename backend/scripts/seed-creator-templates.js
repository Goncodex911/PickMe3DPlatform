/**
 * Seeds 4 finished, published, priced templates owned by the demo Creator (buyer@pickme3d.local by default),
 * plus their price history (AuditLog rows, the same store the app writes to).
 *
 *   node scripts/seed-creator-templates.js                     dry run, writes nothing
 *   node scripts/seed-creator-templates.js --apply             creates the templates
 *   node scripts/seed-creator-templates.js --email=x@y.z       another owner (must be an approved Creator)
 *
 * Touches only this owner's templates: no schema change, no other user. Idempotent (skips titles that exist).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Template = require('../src/models/Template');
const AuditLog = require('../src/models/AuditLog');
const { resolveAccess } = require('../src/config/permissions');

const APPLY = process.argv.includes('--apply');
const EMAIL = (process.argv.find((a) => a.startsWith('--email=')) || '--email=buyer@pickme3d.local').slice(8).toLowerCase();

let seq = 0;
const id = (p) => `${p}${(++seq).toString(36).padStart(4, '0')}`;
const FRAME = { id: 'f-main', name: 'Màn hình chính', x: 0, y: 0, w: 412, h: 892 };
const THEME = { dark: false, bothModes: false, contrast: 'standard', shape: 'rounded', font: 'roboto', emphasized: false, motion: 'standard' };

const item = (kind, label, extra = {}) => ({ id: id('i'), kind, label, icon: null, variant: 'filled', ...extra });
const group = (x, y, axis, items) => ({ id: id('g'), x, y, axis, items });
// bottom navigation sits flush with the bottom of the 892dp phone screen (bar height 104)
const nav = (tabs) => group(0, 788, 'x', [item('bottomNav', 'Nav', { size: 412, selected: 0, tabs })]);
const doc = (title, brief, paletteKey, groups) => ({
  title,
  brief,
  paletteKey,
  frame: 'phone',
  dynamicColor: false,
  theme: THEME,
  frames: [{ ...FRAME, note: brief }],
  groups,
});

const daysAgo = (n) => new Date(Date.now() - n * 864e5);

// price history: [price, days ago, note]; the last entry is the current price
const TEMPLATES = [
  {
    title: 'Lumen Pay — Ví điện tử',
    description: 'Màn hình ví điện tử hoàn chỉnh: số dư, thao tác nhanh nạp / chuyển / quét QR, danh sách giao dịch gần đây và thanh điều hướng 4 tab. Bố cục Material 3, sẵn sàng tùy biến màu thương hiệu.',
    tags: ['fintech', 'wallet', 'mobile', 'material3'],
    history: [[79000, 12, 'Giá ra mắt']],
    docData: doc('Lumen Pay — Ví điện tử', 'Ví điện tử: số dư, thao tác nhanh và lịch sử giao dịch.', 'teal', [
      group(0, 0, 'x', [item('topAppBar', 'Ví của tôi', { size: 412, icon: 'menu', icon2: 'notifications' })]),
      group(16, 104, 'y', [item('card', 'Số dư khả dụng', { size: 380, size2: 150, noImage: true, icon: 'account_balance_wallet', supporting: '12.450.000 ₫ · tăng 8,2% so với tháng trước' })]),
      group(16, 272, 'x', [
        item('button', 'Nạp tiền', { size: 116, icon: 'add' }),
        item('button', 'Chuyển', { size: 116, icon: 'send', variant: 'tonal' }),
        item('button', 'Quét QR', { size: 116, icon: 'qr_code_scanner', variant: 'outlined' }),
      ]),
      group(16, 336, 'y', [item('text', 'Giao dịch gần đây', { size: 18, bold: true })]),
      group(0, 372, 'y', [
        item('listItem', 'Cà phê sáng', { size: 412, icon: 'local_cafe', supporting: '-55.000 ₫ · Hôm nay, 08:12' }),
        item('listItem', 'Lương tháng 11', { size: 412, icon: 'payments', supporting: '+18.000.000 ₫ · 10/11' }),
        item('listItem', 'Hóa đơn điện', { size: 412, icon: 'bolt', supporting: '-1.240.000 ₫ · 08/11' }),
        item('listItem', 'Taxi công nghệ', { size: 412, icon: 'local_taxi', supporting: '-86.000 ₫ · 07/11' }),
      ]),
      nav([{ icon: 'home', label: 'Trang chủ' }, { icon: 'insights', label: 'Thống kê' }, { icon: 'credit_card', label: 'Thẻ' }, { icon: 'person', label: 'Tài khoản' }]),
    ]),
  },
  {
    title: 'Bếp Nhà — Đặt món nhanh',
    description: 'Giao diện đặt đồ ăn: tìm kiếm, lọc theo danh mục bằng chip, thẻ nhà hàng có đánh giá và thời gian giao, nút giỏ hàng nổi. Phù hợp app giao đồ ăn hoặc chuỗi F&B.',
    tags: ['food', 'delivery', 'ecommerce', 'mobile'],
    history: [[59000, 9, 'Giá ra mắt']],
    docData: doc('Bếp Nhà — Đặt món nhanh', 'Ứng dụng đặt món: tìm kiếm, lọc danh mục, danh sách nhà hàng và giỏ hàng.', 'coral', [
      group(0, 0, 'x', [item('topAppBar', 'Giao đến: Quận 1', { size: 412, icon: 'location_on', icon2: 'shopping_bag' })]),
      group(16, 100, 'y', [item('searchBar', 'Tìm món, nhà hàng…', { size: 380, icon: 'search' })]),
      group(16, 172, 'x', [
        item('chip', 'Tất cả', { checked: true }),
        item('chip', 'Cơm'),
        item('chip', 'Trà sữa'),
      ]),
      group(16, 228, 'y', [item('card', 'Bún bò Huế O Xuân', { size: 380, size2: 220, icon: 'restaurant', supporting: '4.8 ★ · 25 phút · Miễn phí giao hàng' })]),
      group(16, 464, 'y', [item('card', 'Trà sữa Mộc', { size: 380, size2: 200, icon: 'local_drink', variant: 'tonal', supporting: '4.6 ★ · 15 phút · Giảm 20% đơn đầu' })]),
      group(204, 712, 'x', [item('extendedFab', 'Giỏ hàng (3)', { icon: 'shopping_cart' })]),
      nav([{ icon: 'home', label: 'Trang chủ' }, { icon: 'local_offer', label: 'Ưu đãi' }, { icon: 'receipt_long', label: 'Đơn hàng' }, { icon: 'person', label: 'Tôi' }]),
    ]),
  },
  {
    title: 'Pulse — Theo dõi sức khỏe',
    description: 'Bảng điều khiển sức khỏe trong ngày: vòng tiến độ số bước, thẻ năng lượng và thời gian vận động, tiến độ mục tiêu tuần và các công tắc nhắc nhở.',
    tags: ['health', 'fitness', 'dashboard', 'mobile'],
    history: [[39000, 20, 'Giá ra mắt'], [49000, 4, 'Bổ sung màn hình mục tiêu tuần']],
    docData: doc('Pulse — Theo dõi sức khỏe', 'Theo dõi số bước, năng lượng, thời gian vận động và nhắc nhở.', 'green', [
      group(0, 0, 'x', [item('topAppBar', 'Hôm nay', { size: 412, icon: 'menu', icon2: 'calendar_month' })]),
      group(146, 108, 'y', [item('circularProgress', 'Số bước', { size: 120, value: 72 })]),
      group(16, 246, 'y', [item('text', '7.240 / 10.000 bước', { size: 20, bold: true })]),
      group(16, 290, 'x', [
        item('card', '520 kcal', { size: 184, size2: 110, noImage: true, icon: 'local_fire_department', supporting: 'Năng lượng đã đốt' }),
        item('card', '48 phút', { size: 184, size2: 110, noImage: true, icon: 'timer', variant: 'tonal', supporting: 'Thời gian vận động' }),
      ]),
      group(16, 420, 'y', [item('text', 'Mục tiêu tuần · 64%', { size: 16, bold: true })]),
      group(16, 452, 'y', [item('linearProgress', 'Mục tiêu tuần', { size: 380, value: 64 })]),
      group(0, 488, 'y', [
        item('listItem', 'Nhắc uống nước', { size: 412, icon: 'water_drop', supporting: 'Mỗi 2 giờ', switch: true, checked: true }),
        item('listItem', 'Báo cáo cuối ngày', { size: 412, icon: 'summarize', supporting: '21:00 hằng ngày', switch: true, checked: true }),
        item('listItem', 'Chế độ tập trung', { size: 412, icon: 'do_not_disturb_on', supporting: 'Tắt thông báo khi tập', switch: true, checked: false }),
      ]),
      nav([{ icon: 'today', label: 'Hôm nay' }, { icon: 'fitness_center', label: 'Bài tập' }, { icon: 'monitoring', label: 'Thống kê' }, { icon: 'person', label: 'Hồ sơ' }]),
    ]),
  },
  {
    title: 'Skyway — Săn vé du lịch',
    description: 'Màn hình đặt vé du lịch: tab chuyến bay / khách sạn / tour, form điểm đi, điểm đến và ngày đi, nút tìm chuyến và thẻ ưu đãi nổi bật. Dùng cho đại lý vé hoặc app du lịch.',
    tags: ['travel', 'booking', 'form', 'mobile'],
    history: [[129000, 15, 'Giá ra mắt'], [99000, 2, 'Khuyến mãi cuối năm']],
    docData: doc('Skyway — Săn vé du lịch', 'Đặt vé: chọn loại dịch vụ, điểm đi, điểm đến, ngày đi và xem ưu đãi.', 'blue', [
      group(0, 0, 'x', [item('topAppBar', 'Khám phá', { size: 412, icon: 'menu', icon2: 'account_circle' })]),
      group(0, 96, 'x', [
        item('tabs', 'Dịch vụ', { size: 412, selected: 0, tabs: [{ icon: 'flight', label: 'Chuyến bay' }, { icon: 'hotel', label: 'Khách sạn' }, { icon: 'tour', label: 'Tour' }] }),
      ]),
      group(16, 176, 'y', [
        item('textField', 'Điểm đi', { size: 380, icon: 'flight_takeoff', supporting: 'Hà Nội (HAN)' }),
        item('textField', 'Điểm đến', { size: 380, icon: 'flight_land', supporting: 'Đà Nẵng (DAD)' }),
        item('textField', 'Ngày đi', { size: 380, icon: 'event', supporting: '20/12/2026' }),
      ]),
      group(16, 400, 'x', [item('button', 'Tìm chuyến bay', { size: 380, icon: 'search' })]),
      group(16, 468, 'y', [item('text', 'Ưu đãi nổi bật', { size: 18, bold: true })]),
      group(16, 504, 'y', [item('card', 'Phú Quốc 3N2Đ', { size: 380, size2: 200, icon: 'beach_access', supporting: 'Từ 2.990.000 ₫ · Vé máy bay + resort 4★' })]),
      nav([{ icon: 'explore', label: 'Khám phá' }, { icon: 'luggage', label: 'Chuyến đi' }, { icon: 'bookmark', label: 'Đã lưu' }, { icon: 'person', label: 'Tôi' }]),
    ]),
  },
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const owner = await User.findOne({ email: EMAIL });
  if (!owner) throw new Error(`User ${EMAIL} not found`);
  const access = resolveAccess(owner);
  if (access.accountType !== 'CREATOR' || access.creatorStatus !== 'APPROVED') {
    throw new Error(`${EMAIL} is not an approved Creator (${access.accountType}/${access.creatorStatus})`);
  }

  console.log(`Owner: ${owner.name} (${owner._id}) | mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);
  for (const t of TEMPLATES) {
    const exists = await Template.exists({ author: owner._id, title: t.title });
    const prices = t.history.map(([p]) => `${p.toLocaleString('vi-VN')}₫`).join(' → ');
    if (exists) {
      console.log(`skip   ${t.title} (already exists)`);
      continue;
    }
    console.log(`create ${t.title} | price ${prices} | v${t.history.length}`);
    if (!APPLY) continue;

    const createdAt = daysAgo(t.history[0][1]);
    const current = t.history[t.history.length - 1][0];
    const tpl = await Template.create({
      title: t.title,
      description: t.description,
      category: 'Outfit',
      tags: t.tags,
      author: owner._id,
      authorName: owner.name,
      authorAvatar: owner.picture || '',
      docData: t.docData,
      isPublic: true,
      isSystem: false,
      price: current,
      reviewStatus: 'APPROVED',
      reviewedAt: new Date(),
    });
    // Back-date creation so the history reads in order.
    await Template.collection.updateOne({ _id: tpl._id }, { $set: { createdAt } });

    let previous = 0;
    for (const [price, ago, note] of t.history) {
      await AuditLog.collection.insertOne({
        actor: owner._id,
        actorName: owner.name,
        actorEmail: owner.email,
        action: 'TEMPLATE_PRICE_CHANGE',
        targetType: 'template',
        targetId: String(tpl._id),
        targetLabel: t.title,
        details: { previousPrice: previous, newPrice: price, note },
        ipAddress: 'seed',
        status: 'success',
        createdAt: daysAgo(ago),
      });
      previous = price;
    }
  }
  if (!APPLY) console.log('\nDry run only. Re-run with --apply to create them.');
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('Seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { TEMPLATES };
