/* eslint-disable no-console */
// Tạo bộ deck mẫu cho Slide Studio theo các bộ sưu tập của PickMe3D.
// Dùng: npm run seed:demo -- <email>
// Chạy lại thì chỉ thay các deck mẫu (đánh dấu demoSeed), không đụng deck thật của tài khoản.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Presentation = require('../src/models/Presentation');

const SERIF = 'Playfair Display'; // có dấu tiếng Việt
const SANS = 'Plus Jakarta Sans';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Mỗi deck: thông tin chung + các slide (định dạng cũ; studio tự đổi sang PPTist khi mở lần đầu)
const DECKS = [
  {
    title: 'Lookbook Haute Couture Spring Blossom',
    ago: 18 * MIN,
    isPublic: false,
    look: { bg: '#f1e2df', fg: '#3a1d24', sub: '#6d4a50', kicker: 'Xuân Hè 2027 · Dạ hội' },
    slides: [
      ['title', 'Haute Couture Spring Blossom', 'Bộ sưu tập dạ hội Xuân Hè 2027. Gam phấn, đường cắt may tối giản.'],
      ['lookbook', 'Look 01 · Đầm suông Rosé', 'Organza hai lớp, tà chéo, dài chạm gót. Size 34 đến 42.'],
      ['lookbook', 'Look 02 · Áo choàng Petal', 'Mikado lụa dáng cape, cổ đứng 6 cm, lót satin hồng phấn.'],
      ['lookbook', 'Look 03 · Váy xếp ly Bloom', 'Chiffon xếp ly dập nhiệt, eo cao, độ xòe 270 độ.'],
      ['quote', '“Mỗi đường may là một cánh hoa mở.”', 'Ghi chú của nhà thiết kế'],
      ['closing', 'Lịch xem mẫu riêng', 'Showroom Quận 1, 10:00 đến 18:00 từ 02/11 đến 08/11/2026.'],
    ],
  },
  {
    title: 'Kế hoạch ra mắt Cyberpunk Streetwear Noir',
    ago: 2 * HOUR,
    isPublic: false,
    look: { bg: '#07080c', fg: '#f2f2f5', sub: '#a8acba', kicker: 'Ra mắt 15/01/2027' },
    slides: [
      ['title', 'Cyberpunk Streetwear Noir', 'Kế hoạch ra mắt Q1/2027: ba giai đoạn, ba kênh bán.'],
      ['pitch', 'Giai đoạn 1 · Teaser', '15/12 đến 14/01. Video 15 giây mỗi tuần, mở danh sách chờ trên storefront.'],
      ['pitch', 'Giai đoạn 2 · Drop 1', '15/01/2027. 12 mẫu, 1.200 sản phẩm, chỉ bán online trong 72 giờ đầu.'],
      ['pitch', 'Giai đoạn 3 · Pop-up', '01/02 đến 14/02 tại Hà Nội và TP.HCM, thử đồ bằng phòng thử 3D.'],
      ['case-study', 'Chỉ tiêu', 'Danh sách chờ 8.000 người. Bán hết Drop 1 trong 7 ngày. Tỉ lệ hoàn dưới 4%.'],
      ['closing', 'Việc cần chốt tuần này', 'Duyệt ảnh chiến dịch, chốt số lượng vải phản quang, ký hợp đồng mặt bằng pop-up.'],
    ],
  },
  {
    title: 'Báo cáo chuyển đổi storefront tháng 9',
    ago: 26 * HOUR,
    isPublic: true,
    look: { bg: '#0f1830', fg: '#eef2ff', sub: '#a9b7de', kicker: 'Storefront · tháng 9' },
    slides: [
      ['title', 'Chuyển đổi storefront tháng 9', 'Tỉ lệ chuyển đổi đạt 3,4%, tăng từ 1,8% của tháng 8.'],
      ['case-study', 'Điều gì đã thay đổi', 'Trang sản phẩm dựng lại trên canvas 3D: ảnh xoay 360 độ, bảng size theo số đo thật.'],
      ['pitch', 'Kết quả theo kênh', 'Organic 4,1% · Quảng cáo 2,9% · Email 5,6%. Giỏ hàng trung bình 1.840.000đ.'],
      ['pitch', 'Điểm rơi', '38% khách rời ở bước chọn size. Đề xuất thêm gợi ý size theo chiều cao và cân nặng.'],
      ['closing', 'Kế hoạch tháng 10', 'Thử nghiệm A/B trang thanh toán một bước, mục tiêu 4,0%.'],
    ],
  },
  {
    title: 'Hồ sơ chất liệu Silk L’Heure',
    ago: 3 * DAY,
    isPublic: true,
    look: { bg: '#f4ede2', fg: '#2f2723', sub: '#6e5a4b', kicker: 'Hồ sơ chất liệu' },
    slides: [
      ['title', 'Silk L’Heure', 'Hồ sơ chất liệu gửi xưởng may cho dòng sơ mi lụa tơ tằm sinh thái.'],
      ['pitch', 'Lụa tơ tằm 19 momme', 'Dùng cho thân áo. Co rút sau giặt dưới 3%. Nhuộm thực vật, không AZO.'],
      ['pitch', 'Lụa tơ tằm 22 momme', 'Dùng cho cổ và măng sét. Ép mex mỏng 30 g/m².'],
      ['pitch', 'Charmeuse và Crêpe', 'Charmeuse cho lót, Crêpe de Chine cho bản màu đen. Đường may kim số 9.'],
      ['closing', 'Yêu cầu kiểm định', 'Mẫu thử độ bền màu ISO 105-C06 trước ngày 30/10/2026.'],
    ],
  },
  {
    title: 'Line sheet Thu Đông 2026',
    ago: 6 * DAY,
    isPublic: true,
    look: { bg: '#12151d', fg: '#e9e6df', sub: '#9aa1b2', kicker: 'Line sheet · Giá sỉ' },
    slides: [
      ['title', 'Line sheet Thu Đông 2026', '36 mẫu, giá sỉ đã gồm VAT. Đặt hàng tối thiểu 30 sản phẩm mỗi mẫu.'],
      ['two-column', 'KT-0412 · Quần suông Kinetic', 'Len Ý pha 12% cashmere. Giá sỉ 1.290.000đ, giá lẻ đề xuất 2.390.000đ.'],
      ['two-column', 'CN-0108 · Áo dạ Chiffon Noir', 'Dạ lông cừu 70%. Giá sỉ 2.450.000đ, giá lẻ đề xuất 4.590.000đ.'],
      ['two-column', 'SL-0230 · Sơ mi Silk L’Heure', 'Lụa 19 momme. Giá sỉ 890.000đ, giá lẻ đề xuất 1.690.000đ.'],
      ['closing', 'Hạn đặt hàng', 'Chốt đơn trước 20/11/2026, giao hàng từ 15/12/2026.'],
    ],
  },
  {
    title: 'Pitch bán sỉ Kinetic Tailoring',
    ago: 11 * DAY,
    isPublic: true,
    look: { bg: '#10141c', fg: '#f5f2ea', sub: '#a8b0c0', kicker: 'Đối tác bán sỉ' },
    slides: [
      ['title', 'Kinetic Tailoring', 'Dòng quần âu dáng suông cho chuỗi cửa hàng đối tác.'],
      ['pitch', 'Vì sao khách chọn', 'Len Ý cao cấp, cạp chun ẩn, form giữ nếp sau 30 lần giặt.'],
      ['pitch', 'Điều kiện hợp tác', 'Tối thiểu 30 sản phẩm mỗi mẫu. Sản xuất 21 ngày. Chiết khấu sỉ 45%.'],
      ['case-study', 'Đối tác hiện tại', '14 cửa hàng tại 5 tỉnh thành, tỉ lệ bán hết trung bình 82% sau 6 tuần.'],
      ['closing', 'Bước tiếp theo', 'Đặt lịch xem mẫu thật hoặc mở storefront 3D để chọn mẫu trực tuyến.'],
    ],
  },
  {
    title: 'Moodboard Áo Dạ Chiffon Noir',
    ago: 18 * DAY,
    isPublic: true,
    look: { bg: '#0c0b0d', fg: '#f3efe7', sub: '#b4aca0', kicker: 'Moodboard' },
    slides: [
      ['title', 'Chiffon Noir', 'Moodboard cho áo dạ dáng dài: đen than, xám khói, nâu đá.'],
      ['lookbook', 'Ánh sáng', 'Chụp ngược sáng, bóng đổ dài, nền bê tông thô.'],
      ['lookbook', 'Chất liệu', 'Dạ lông cừu phối chiffon ở tay áo, nút sừng mờ.'],
      ['quote', '“Đen không phải một màu, mà là một độ sâu.”', 'Định hướng chiến dịch'],
    ],
  },
  {
    title: 'Bài trình bày mới',
    ago: 20 * DAY,
    isPublic: true,
    look: { bg: '#151c2c', fg: '#f5f2ea', sub: '#a8b0c0', kicker: '' },
    slides: [['title', 'Bài trình bày mới', 'Bắt đầu bài trình bày']],
  },
];

function slide(look, [layout, title, body], index) {
  const isTitle = layout === 'title' || layout === 'quote';
  return {
    id: `demo-${index + 1}`,
    layout,
    title,
    body,
    bg: look.bg,
    titleColor: look.fg,
    bodyColor: look.sub,
    titleFont: SERIF,
    bodyFont: SANS,
    titleSize: isTitle ? 52 : 40,
    bodySize: 20,
    titleItalic: true,
  };
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Ảnh bìa SVG 640x360 cho DeckCard (cột thumbnail chứa data URI)
function cover(deck) {
  const { bg, fg, sub, kicker } = deck.look;
  const [, title, body] = deck.slides[0];
  const words = title.split(' ');
  const lines = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length <= 20) lines[lines.length - 1] = last + ' ' + word;
    else lines.push(word);
  }
  const titleSvg = lines.slice(0, 3).map((line, i) => `<tspan x="44" dy="${i ? 52 : 0}">${escapeXml(line)}</tspan>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<rect width="640" height="360" fill="${bg}"/>
${kicker ? `<text x="44" y="64" fill="${sub}" font-family="Plus Jakarta Sans, Segoe UI, sans-serif" font-size="14" font-weight="600" letter-spacing="3">${escapeXml(kicker.toUpperCase())}</text>` : ''}
<text x="44" y="${kicker ? 130 : 160}" fill="${fg}" font-family="Playfair Display, Georgia, serif" font-style="italic" font-size="46">${titleSvg}</text>
<text x="44" y="318" fill="${sub}" font-family="Plus Jakarta Sans, Segoe UI, sans-serif" font-size="15">${escapeXml(body.length > 70 ? body.slice(0, 68) + '…' : body)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Thiếu email. Dùng: npm run seed:demo -- ban@vidu.com');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Chưa có MONGODB_URI trong backend/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`Không thấy tài khoản ${email}. Đăng nhập app một lần bằng email này rồi chạy lại.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  const userId = String(user._id);
  const removed = await Presentation.collection.deleteMany({ userId, demoSeed: true });
  const now = Date.now();
  const docs = DECKS.map((deck) => {
    const at = new Date(now - deck.ago);
    return {
      userId,
      authorName: user.name || 'Designer',
      title: deck.title,
      slides: deck.slides.map((item, index) => slide(deck.look, item, index)),
      theme: { mode: 'dark', accent: '#e11d48' },
      thumbnail: cover(deck),
      isPublic: deck.isPublic,
      likesCount: 0,
      likedBy: [],
      comments: [],
      demoSeed: true,
      createdAt: at,
      updatedAt: at,
    };
  });
  // Ghi thẳng vào collection để giữ updatedAt theo kịch bản (Mongoose sẽ ghi đè bằng thời điểm hiện tại)
  await Presentation.collection.insertMany(docs);
  console.log(`Đã xoá ${removed.deletedCount} deck mẫu cũ, thêm ${docs.length} deck mẫu cho ${email}.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
