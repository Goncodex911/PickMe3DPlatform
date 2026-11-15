// Tiện ích màu dùng chung cho Art Direction và Design QA: độ tương phản WCAG, pha màu, chọn màu chữ đọc được.

function rgb(hex) {
  const v = String(hex || '#000000').replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a, b, t) {
  const ca = rgb(a);
  const cb = rgb(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * t));
}

function isDark(hex) {
  return luminance(hex) < 0.35;
}

// Đẩy màu chữ về phía trắng/đen cho đến khi đạt tỉ lệ tương phản tối thiểu so với nền
function readable(text, bg, min = 4.5) {
  if (contrast(text, bg) >= min) return text;
  const target = isDark(bg) ? '#ffffff' : '#0b0b0f';
  for (let t = 0.15; t <= 1.001; t += 0.15) {
    const c = mix(text, target, Math.min(1, t));
    if (contrast(c, bg) >= min) return c;
  }
  return target;
}

// Màu trung bình của gradient, dùng để kiểm tra tương phản chữ đặt trên nền gradient
function average(colors) {
  const list = colors.map(rgb);
  return toHex([0, 1, 2].map((i) => list.reduce((s, c) => s + c[i], 0) / list.length));
}

// Trong các màu ứng viên, chọn màu có độ tương phản tệ nhất (trên mọi điểm màu nền) cao nhất
function bestText(stops, candidates) {
  const worst = (c) => Math.min(...stops.map((s) => contrast(c, s)));
  return candidates.reduce((best, c) => (worst(c) > worst(best) ? c : best), candidates[0]);
}

module.exports = { rgb, toHex, luminance, contrast, mix, isDark, readable, average, bestText };
