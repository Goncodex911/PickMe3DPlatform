// Tầng 4 – Visual Asset Engine. Quyết định slide nào cần hoạ tiết/visual và dựng chúng từ Design System
// (orbs, lưới, đường kẻ, mảng góc). Biểu đồ và huy hiệu số do layout tự dựng từ dữ liệu.
// Nguyên tắc chống lạm dụng: slide dày đặc (dashboard, swot, so sánh...) không có hoạ tiết; slide "thở" (hero, statement,
// closing, big-number) có hoạ tiết đầy đủ; còn lại chỉ có chi tiết nhỏ và không quá một slide liền kề có hoạ tiết lớn.
// Phần tử hoạ tiết bị khoá (lock) để người dùng chỉnh nội dung không vướng.

const { W, H, rect, ellipse, polygon, line } = require('./render/primitives');
const { mix } = require('./color');

const HERO_LIKE = new Set(['hero', 'statement', 'closing', 'big-number']);
const DENSE = new Set(['dashboard', 'swot', 'comparison', 'case-study', 'architecture', 'timeline', 'roadmap', 'funnel', 'pyramid']);

// Mức hoạ tiết cho từng slide: 'full' | 'light' | 'none'
function decorationLevel(layout, index, prevLevel) {
  if (DENSE.has(layout)) return 'none';
  if (HERO_LIKE.has(layout)) return 'full';
  return prevLevel === 'full' ? 'none' : 'light';
}

function locked(el) {
  return el ? { ...el, lock: true, name: 'decor' } : null;
}

function decorations(design, ink, level) {
  if (level === 'none' || design.decoration === 'none') return [];
  const full = level === 'full';
  const g = design.gradients.accent;
  const out = [];
  switch (design.decoration) {
    case 'orbs':
      out.push(ellipse({ x: W - (full ? 320 : 200), y: full ? -230 : -160, w: full ? 560 : 340, h: full ? 560 : 340, fill: g.colors[0], gradient: g, opacity: full ? 0.22 : 0.12 }));
      if (full) out.push(ellipse({ x: -110, y: H - 170, w: 300, h: 300, fill: design.palette.secondary, opacity: 0.14 }));
      break;
    case 'grid': {
      const color = mix(ink.bg, ink.title, full ? 0.08 : 0.05);
      const step = 100;
      for (let x = step; x < W; x += step) out.push(line({ x1: x, y1: 0, x2: x, y2: H, color, width: 1 }));
      if (full) for (let y = step; y < H; y += step) out.push(line({ x1: 0, y1: y, x2: W, y2: y, color, width: 1 }));
      break;
    }
    case 'lines':
      out.push(line({ x1: 64, y1: 26, x2: W - 64, y2: 26, color: ink.line, width: 1 }));
      if (full) out.push(line({ x1: 64, y1: H - 26, x2: W - 64, y2: H - 26, color: ink.line, width: 1 }));
      break;
    case 'corner': {
      const size = full ? 280 : 130;
      out.push(polygon({ x: W - size, y: H - size, w: size, h: size, points: [[size, 0], [size, size], [0, size]], fill: g.colors[0], gradient: g, opacity: full ? 0.9 : 0.55 }));
      if (full) out.push(rect({ x: 0, y: 0, w: 10, h: H, fill: design.palette.accent }));
      break;
    }
    default:
      break;
  }
  return out.map(locked);
}

module.exports = { decorations, decorationLevel, HERO_LIKE, DENSE };
