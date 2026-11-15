// Khối dựng phần tử PPTist (khung 1000 x 562.5). Chỉ sinh các kiểu phần tử mà cả studio PPTist lẫn
// SlideView (React) đều vẽ được: text, shape (path SVG + gradient), line, chart. Không có HTML/CSS tự do từ AI:
// mọi chuỗi đều được escape, màu/font đến từ Design System đã kiểm tra.

const crypto = require('crypto');

const W = 1000;
const H = 562.5;

const SERIF = new Set(['Playfair Display', 'Merriweather', 'Literata', 'SourceSerif4']);
const WIDE = new Set(['Montserrat', 'Plus Jakarta Sans']);

function uid() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 10);
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function charWidth(font, { bold = false, upper = false } = {}) {
  let cw = SERIF.has(font) ? 0.5 : WIDE.has(font) ? 0.58 : 0.53;
  if (bold) cw *= 1.05;
  if (upper) cw *= 1.15;
  return cw;
}

// Ước lượng chiều cao khối chữ (PPTist chừa ~10px lề mỗi phía)
function measure(text, size, width, cw, lineHeight) {
  const perLine = Math.max(1, Math.floor(Math.max(20, width - 20) / (size * cw)));
  // Dư 8% cho chỗ xuống dòng theo từ, chỉ áp dụng khi đoạn thật sự phải xuống dòng
  const lines = String(text).split('\n').reduce((n, para) => n + (para.length <= perLine ? 1 : Math.ceil((para.length * 1.08) / perLine)), 0);
  return lines * size * lineHeight + 20;
}

// Giảm cỡ chữ tới mức tối thiểu cho vừa khung; vẫn tràn thì cắt theo từ và đánh dấu để Design QA biết
function fitText(text, { width, height, size, min = 12, cw, lineHeight }) {
  let s = size;
  while (s > min && measure(text, s, width, cw, lineHeight) > height) s -= 2;
  if (measure(text, s, width, cw, lineHeight) <= height) return { text, size: s, truncated: false, height: measure(text, s, width, cw, lineHeight) };
  const words = String(text).split(' ');
  while (words.length > 1 && measure(`${words.join(' ')}…`, s, width, cw, lineHeight) > height) words.pop();
  const cut = `${words.join(' ')}…`;
  return { text: cut, size: s, truncated: true, height: Math.min(height, measure(cut, s, width, cw, lineHeight)) };
}

function richText(text, { size, bold = false, italic = false, align = 'left' }) {
  return String(text).split('\n').map((line) => {
    let inner = `<span style="font-size: ${size}px;">${esc(line) || '<br>'}</span>`;
    if (italic) inner = `<em>${inner}</em>`;
    if (bold) inner = `<strong>${inner}</strong>`;
    return `<p style="text-align: ${align};">${inner}</p>`;
  }).join('');
}

/**
 * Ô chữ tự co theo khung. `ctx.issues` nhận cảnh báo tràn chữ cho Design QA.
 */
function text(ctx, { x, y, w, h, value, size, min, font, color, bold = false, italic = false, align = 'left', upper = false, lineHeight = 1.25, textType = 'content', role = 'text', vAlign }) {
  const raw = upper ? String(value || '').toUpperCase() : String(value || '');
  // Chuỗi rỗng: trả về chỗ trống có toạ độ để layout tính tiếp vị trí; add() bỏ qua phần tử này
  if (!raw.trim()) return { skip: true, top: y, height: 0 };
  const cw = charWidth(font, { bold, upper });
  const fitted = fitText(raw, { width: w, height: h, size, min: min ?? Math.max(11, Math.round(size * 0.6)), cw, lineHeight });
  if (fitted.truncated) ctx.issues.push({ type: 'overflow', role, text: raw.slice(0, 60) });
  if (fitted.size < size * 0.75) ctx.issues.push({ type: 'dense', role, from: size, to: fitted.size });
  const el = {
    type: 'text',
    id: uid(),
    left: round(x),
    top: round(vAlign === 'middle' ? y + Math.max(0, (h - fitted.height) / 2) : vAlign === 'bottom' ? y + Math.max(0, h - fitted.height) : y),
    width: round(w),
    height: round(fitted.height),
    rotate: 0,
    content: richText(fitted.text, { size: fitted.size, bold, italic, align }),
    defaultFontName: font,
    defaultColor: color,
    lineHeight,
    textType,
  };
  ctx.texts.push({ id: el.id, color, role, size: fitted.size, box: { x, y, w, h } });
  return el;
}

function gradientOf(g) {
  if (!g) return undefined;
  const n = g.colors.length;
  return { type: g.type, rotate: g.angle || 0, colors: g.colors.map((color, i) => ({ pos: n === 1 ? 0 : Math.round((i / (n - 1)) * 100), color })) };
}

function shadowOf(on, dark) {
  return on ? { h: 0, v: 10, blur: 28, color: dark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.14)' } : undefined;
}

function shapeText(value, { size, font, color, bold = false, align = 'center' }) {
  return {
    content: richText(value, { size, bold, align }),
    defaultFontName: font,
    defaultColor: color,
    align: 'middle',
  };
}

function base(type, x, y, w, h) {
  return { type, id: uid(), left: round(x), top: round(y), width: round(Math.max(1, w)), height: round(Math.max(1, h)), rotate: 0 };
}

function rect({ x, y, w, h, fill, gradient, radius = 0, outline, shadow, opacity, text: label }) {
  const el = { ...base('shape', x, y, w, h), viewBox: [round(w), round(h)], fixedRatio: false, fill: fill || 'transparent' };
  const r = Math.min(radius, Math.min(w, h) / 2);
  if (r > 0) {
    const k = r / Math.min(w, h);
    el.pathFormula = 'roundRect';
    el.keypoints = [round(k, 3)];
    el.path = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  } else {
    el.path = `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
  el.path = roundPath(el.path);
  if (gradient) el.gradient = gradientOf(gradient);
  if (outline) el.outline = outline;
  if (shadow) el.shadow = shadow;
  if (opacity !== undefined) el.opacity = opacity;
  if (label) el.text = label;
  return el;
}

function ellipse({ x, y, w, h, fill, gradient, opacity, outline, text: label }) {
  const el = { ...base('shape', x, y, w, h), viewBox: [200, 200], path: 'M 100 0 A 50 50 0 1 1 100 200 A 50 50 0 1 1 100 0 Z', fixedRatio: false, fill: fill || 'transparent' };
  if (gradient) el.gradient = gradientOf(gradient);
  if (opacity !== undefined) el.opacity = opacity;
  if (outline) el.outline = outline;
  if (label) el.text = label;
  return el;
}

// Đa giác tự do; điểm tính theo toạ độ trong khung (w, h) của chính phần tử
function polygon({ x, y, w, h, points, fill, gradient, opacity, text: label }) {
  const path = `M ${points.map(([px, py]) => `${round(px)} ${round(py)}`).join(' L ')} Z`;
  const el = { ...base('shape', x, y, w, h), viewBox: [round(w), round(h)], path, fixedRatio: false, fill: fill || 'transparent' };
  if (gradient) el.gradient = gradientOf(gradient);
  if (opacity !== undefined) el.opacity = opacity;
  if (label) el.text = label;
  return el;
}

function line({ x1, y1, x2, y2, color, width = 2, style = 'solid', arrow = false }) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  return {
    type: 'line',
    id: uid(),
    left: round(left),
    top: round(top),
    width,
    start: [round(x1 - left), round(y1 - top)],
    end: [round(x2 - left), round(y2 - top)],
    style,
    color,
    points: ['', arrow ? 'arrow' : ''],
  };
}

function chart({ x, y, w, h, type, labels, values, legend, colors, textColor, lineColor }) {
  return {
    ...base('chart', x, y, w, h),
    chartType: type,
    data: { labels, legends: [legend || 'Series'], series: [values] },
    options: type === 'line' || type === 'area' ? { lineSmooth: true } : {},
    themeColors: colors,
    textColor,
    lineColor,
  };
}

function animation(elId, effect, duration, trigger) {
  return { id: uid(), elId, effect, type: 'in', duration, trigger };
}

function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function roundPath(path) {
  return path.replace(/-?\d+\.\d+/g, (m) => String(round(Number(m))));
}

module.exports = { W, H, uid, esc, text, rect, ellipse, polygon, line, chart, animation, gradientOf, shadowOf, shapeText, fitText, measure, charWidth, richText, round };
