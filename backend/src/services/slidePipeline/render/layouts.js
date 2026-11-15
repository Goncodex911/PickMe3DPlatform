// Thư viện layout: mỗi hàm nhận composition của một slide + ngữ cảnh thiết kế, đặt phần tử lên khung 1000 x 562.5.
// Vị trí/kích thước tính bằng hình học xác định (không để AI tự đặt toạ độ) nên mọi slide giữ lề, nhịp và phân cấp thị giác.
// Mỗi phần tử được gán vào một "nhóm" để tầng animation biết thứ tự xuất hiện.

const { W, H, text, rect, ellipse, polygon, line, chart, gradientOf, shadowOf, shapeText, fitText, charWidth } = require('./primitives');
const { mix, readable } = require('../color');
const { numeric, numericItems } = require('../composition');

const M = 64;

function add(ctx, el, group = 0) {
  if (!el || el.skip) return el || null;
  ctx.els.push(el);
  (ctx.groups[group] ||= []).push(el.id);
  return el;
}

function head(ctx, value, opts) {
  const t = ctx.d.typography;
  return text(ctx, {
    font: ctx.f.head, color: ctx.ink.title, bold: t.headingWeight === 'bold', upper: t.headingCase === 'upper',
    lineHeight: 1.12, textType: 'title', role: 'title', ...opts, value,
  });
}

function body(ctx, value, opts) {
  return text(ctx, { font: ctx.f.body, color: ctx.ink.body, lineHeight: 1.4, role: 'body', ...opts, value });
}

function kicker(ctx, value, opts) {
  return text(ctx, { font: ctx.f.body, color: ctx.ink.accentText, bold: true, upper: true, size: ctx.sz.kicker, min: 10, lineHeight: 1.2, h: 38, textType: 'subtitle', role: 'kicker', ...opts, value });
}

// Kicker + tiêu đề (+ phụ đề) ở đầu slide; trả về toạ độ y bên dưới khối tiêu đề
function header(ctx, s, { x = M, w = W - 2 * M, align = 'left', y = 40, sub = true, size } = {}) {
  let top = y;
  if (s.kicker) {
    const k = add(ctx, kicker(ctx, s.kicker, { x, y: top, w, align }));
    if (k) top = k.top + k.height - 4;
  }
  const t = add(ctx, head(ctx, s.title, { x, y: top, w, h: 104, size: size || ctx.sz.title, min: 22, align }));
  top = t ? t.top + t.height : top + 60;
  if (sub && s.subtitle) {
    const st = add(ctx, body(ctx, s.subtitle, { x, y: top - 2, w: Math.min(w, 760), h: 58, size: ctx.sz.sub, min: 13, color: ctx.ink.muted, align, role: 'subtitle' }));
    if (st) top = st.top + st.height;
  }
  return top;
}

function itemsFor(s, max) {
  return s.items.slice(0, max);
}

function card(ctx, { x, y, w, h, emphasis = false }) {
  const d = ctx.d;
  return rect({
    x, y, w, h,
    fill: emphasis ? d.palette.primary : ctx.ink.card,
    gradient: emphasis ? d.gradients.accent : undefined,
    radius: d.shape.radius,
    shadow: shadowOf(d.shape.shadow, ctx.ink.dark),
    outline: emphasis || d.shape.shadow ? undefined : { width: 1, color: ctx.ink.line, style: 'solid' },
  });
}

// Chữ trên nền nhấn (card emphasis, khối primary): đổi bảng màu chữ tạm thời
function onAccent(ctx) {
  const g = ctx.d.gradients.accent.colors;
  const pick = (c, min) => g.reduce((acc, stop) => readable(acc, stop, min), c);
  return { title: pick(ctx.d.palette.onPrimary, 4.5), body: pick(ctx.d.palette.onPrimary, 4.5), muted: pick(mix(ctx.d.palette.onPrimary, ctx.d.palette.primary, 0.2), 3.5) };
}

// Nhãn nằm trong shape (phễu, chevron, kim tự tháp): tự co chữ cho vừa
function label(ctx, value, { w, h, size, color, bold = true, font }) {
  const f = font || ctx.f.body;
  const fitted = fitText(String(value || ''), { width: w, height: h, size, min: 10, cw: charWidth(f, { bold }), lineHeight: 1.2 });
  if (fitted.truncated) ctx.issues.push({ type: 'overflow', role: 'label', text: String(value).slice(0, 60) });
  ctx.texts.push({ role: 'label', color, size: fitted.size });
  return shapeText(fitted.text, { size: fitted.size, font: f, color, bold });
}

function badge(ctx, n, x, y, size, emphasis) {
  const fill = emphasis ? ctx.d.palette.accent : ctx.ink.chip;
  const color = readable(emphasis ? ctx.d.palette.onPrimary : ctx.ink.chipText, fill, 4.5);
  return ellipse({ x, y, w: size, h: size, fill, text: label(ctx, String(n).padStart(2, '0'), { w: size, h: size, size: Math.round(size * 0.36), color }) });
}

/* ------------------------------------------------------------------------------------------------ */

function hero(ctx, s) {
  const center = s.variant === 'center';
  const x = center ? 110 : M;
  const w = center ? W - 220 : 720;
  const align = center ? 'center' : 'left';
  add(ctx, rect({ x: center ? W / 2 - 28 : x, y: 150, w: 56, h: 6, fill: ctx.ink.accent, radius: 3 }));
  let top = 172;
  if (s.kicker) {
    const k = add(ctx, kicker(ctx, s.kicker, { x, y: top, w, align }));
    top = k.top + k.height;
  }
  const t = add(ctx, head(ctx, s.title, { x, y: top, w, h: 200, size: ctx.sz.hero, min: 34, align, lineHeight: 1.04 }));
  if (s.subtitle) add(ctx, body(ctx, s.subtitle, { x: center ? x + 70 : x, y: t.top + t.height + 8, w: center ? w - 140 : 600, h: 90, size: ctx.sz.sub + 2, color: ctx.ink.muted, align, role: 'subtitle' }), 1);
}

function statement(ctx, s) {
  const center = s.variant !== 'left';
  const align = center ? 'center' : 'left';
  const x = center ? 120 : M + 40;
  const w = center ? W - 240 : 740;
  add(ctx, text(ctx, { x: center ? W / 2 - 60 : M, y: 36, w: 120, h: 170, value: '“', size: 150, font: ctx.f.head, color: ctx.ink.accent, bold: true, align, lineHeight: 1, role: 'decor' }));
  if (s.kicker) add(ctx, kicker(ctx, s.kicker, { x, y: 150, w, align }));
  const t = add(ctx, head(ctx, s.title, { x, y: 180, w, h: 210, size: Math.round(ctx.sz.title * 1.15), min: 24, align, lineHeight: 1.18 }));
  const y = t.top + t.height + 14;
  add(ctx, rect({ x: center ? W / 2 - 24 : x + 10, y, w: 48, h: 4, fill: ctx.ink.accent, radius: 2 }), 1);
  if (s.subtitle) add(ctx, body(ctx, s.subtitle, { x, y: y + 18, w, h: 70, size: ctx.sz.sub, color: ctx.ink.muted, align, role: 'subtitle' }), 1);
}

function agenda(ctx, s) {
  const left = s.variant === 'right' ? 560 : M;
  const listX = s.variant === 'right' ? M : 440;
  header(ctx, s, { x: left, w: 330, y: 150, sub: true });
  const list = itemsFor(s, 6);
  const top = 70;
  const rowH = Math.min(84, (H - 2 * top) / list.length);
  list.forEach((it, i) => {
    const y = top + i * rowH;
    const g = i + 1;
    add(ctx, text(ctx, { x: listX, y, w: 70, h: rowH, value: String(i + 1).padStart(2, '0'), size: 28, font: ctx.f.head, color: i === s.emphasis ? ctx.d.palette.accent : ctx.ink.accent, bold: true, vAlign: 'middle', role: 'number' }), g);
    const hasDetail = it.detail && rowH >= 64;
    add(ctx, head(ctx, it.heading || it.detail, { x: listX + 74, y: y + (hasDetail ? 4 : 0), w: 420, h: hasDetail ? 44 : rowH, size: 20, min: 14, vAlign: hasDetail ? undefined : 'middle', textType: 'item', role: 'item' }), g);
    if (hasDetail) add(ctx, body(ctx, it.detail, { x: listX + 74, y: y + 38, w: 420, h: rowH - 42, size: 14, min: 11, color: ctx.ink.muted }), g);
    if (i < list.length - 1) add(ctx, line({ x1: listX, y1: y + rowH, x2: listX + 496, y2: y + rowH, color: ctx.ink.line, width: 1 }), g);
  });
}

function cardsGrid(ctx, s) {
  const list = itemsFor(s, 6);
  const n = list.length;
  const cols = n <= 4 ? n : 3;
  const rows = Math.ceil(n / cols);
  // Hai hàng thẻ thì nhường chỗ của phụ đề cho nội dung thẻ
  const hb = header(ctx, s, { sub: rows === 1 });
  const gap = 18;
  const top = hb + 20;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const ch = (H - 44 - top - gap * (rows - 1)) / rows;
  list.forEach((it, i) => {
    const x = M + (i % cols) * (cw + gap);
    const y = top + Math.floor(i / cols) * (ch + gap);
    const em = i === s.emphasis;
    const ink = em ? onAccent(ctx) : { title: ctx.ink.cardTitle, body: ctx.ink.cardBody, muted: ctx.ink.cardMuted };
    const g = i + 1;
    add(ctx, card(ctx, { x, y, w: cw, h: ch, emphasis: em }), g);
    let cy = y + 18;
    if (it.value) {
      const v = add(ctx, head(ctx, it.value, { x: x + 14, y: cy, w: cw - 28, h: 50, size: 32, min: 20, color: em ? ink.title : ctx.ink.accentOnCard, role: 'value' }), g);
      cy = v.top + v.height - 4;
    } else if (ch >= 150) {
      add(ctx, badge(ctx, i + 1, x + 18, cy, 34, em), g);
      cy += 46;
    }
    const hd = add(ctx, head(ctx, it.heading, { x: x + 12, y: cy, w: cw - 24, h: 56, size: 19, min: 14, color: ink.title, textType: 'itemTitle', role: 'item' }), g);
    if (hd) cy = hd.top + hd.height - 6;
    if (it.detail) add(ctx, body(ctx, it.detail, { x: x + 12, y: cy, w: cw - 24, h: y + ch - cy - 10, size: 14, min: 11, color: ink.muted }), g);
  });
}

function infographic(ctx, s) {
  const hb = header(ctx, s, { sub: false });
  const list = itemsFor(s, 5);
  const top = hb + 10;
  const bottom = H - 34;
  const cy = (top + bottom) / 2;
  const r = Math.min(108, (bottom - top) / 2 - 6);
  const core = ctx.d.palette.primary;
  add(ctx, ellipse({ x: W / 2 - r - 14, y: cy - r - 14, w: 2 * r + 28, h: 2 * r + 28, fill: ctx.ink.card, opacity: 0.9 }), 1);
  add(ctx, ellipse({ x: W / 2 - r, y: cy - r, w: 2 * r, h: 2 * r, fill: core, gradient: ctx.d.gradients.accent }), 1);
  const on = onAccent(ctx);
  add(ctx, text(ctx, { x: W / 2 - r * 0.72, y: cy - r * 0.72, w: r * 1.44, h: r * 1.44, value: s.subtitle || s.title, size: 17, min: 11, font: ctx.f.body, color: on.title, bold: true, align: 'center', vAlign: 'middle', role: 'core' }), 1);
  const leftCount = Math.ceil(list.length / 2);
  const colW = 280;
  list.forEach((it, i) => {
    const isLeft = i < leftCount;
    const k = isLeft ? i : i - leftCount;
    const count = isLeft ? leftCount : list.length - leftCount;
    const slot = (bottom - top) / count;
    const y = top + k * slot;
    const x = isLeft ? M : W - M - colW;
    const align = isLeft ? 'right' : 'left';
    const g = i + 2;
    const hd = add(ctx, head(ctx, it.heading, { x, y: y + 6, w: colW, h: 50, size: 18, min: 13, align, textType: 'itemTitle', role: 'item', color: i === s.emphasis ? ctx.ink.accent : ctx.ink.title }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x, y: hd.top + hd.height - 6, w: colW, h: slot - hd.height - 8, size: 14, min: 11, color: ctx.ink.muted, align }), g);
    const dotY = y + slot / 2 - 6;
    const dotX = isLeft ? x + colW + 14 : x - 26;
    add(ctx, ellipse({ x: dotX, y: dotY, w: 12, h: 12, fill: ctx.ink.accent }), g);
    const edgeX = isLeft ? W / 2 - r - 16 : W / 2 + r + 16;
    add(ctx, line({ x1: isLeft ? dotX + 12 : dotX, y1: dotY + 6, x2: edgeX, y2: cy + (dotY + 6 - cy) * 0.35, color: ctx.ink.line, width: 1.5, style: 'dashed' }), g);
  });
}

function timeline(ctx, s) {
  const hb = header(ctx, s);
  const list = itemsFor(s, 6);
  const n = list.length;
  const axis = Math.max(hb + 150, (hb + H - 30) / 2 + 6);
  add(ctx, line({ x1: M, y1: axis, x2: W - M, y2: axis, color: ctx.ink.line, width: 3 }));
  const span = W - 2 * M - 80;
  const step = n > 1 ? span / (n - 1) : 0;
  const colW = Math.min(230, n > 1 ? step * 2 - 24 : 300);
  list.forEach((it, i) => {
    const cx = M + 40 + i * step;
    const em = i === s.emphasis;
    const g = i + 1;
    const dot = em ? 24 : 18;
    add(ctx, ellipse({ x: cx - dot / 2, y: axis - dot / 2, w: dot, h: dot, fill: em ? ctx.d.palette.accent : ctx.ink.chip, outline: { width: 4, color: ctx.ink.bg, style: 'solid' } }), g);
    const above = i % 2 === 0;
    const x = Math.min(W - M - colW, Math.max(M - 10, cx - colW / 2));
    const blockTop = above ? Math.max(hb + 6, axis - 150) : axis + 22;
    const blockH = above ? axis - 22 - blockTop : Math.min(150, H - 24 - blockTop);
    let y = blockTop;
    if (above) add(ctx, line({ x1: cx, y1: axis - 16, x2: cx, y2: axis - 4, color: ctx.ink.line, width: 1 }), g);
    if (it.value) {
      const v = add(ctx, head(ctx, it.value, { x, y, w: colW, h: 46, size: 22, min: 14, align: 'center', color: ctx.ink.accent, role: 'value' }), g);
      y = v.top + v.height - 8;
    }
    const hd = add(ctx, head(ctx, it.heading, { x, y, w: colW, h: 46, size: 16, min: 12, align: 'center', textType: 'itemTitle', role: 'item' }), g);
    if (hd) y = hd.top + hd.height - 8;
    if (it.detail && blockTop + blockH - y > 30) add(ctx, body(ctx, it.detail, { x, y, w: colW, h: blockTop + blockH - y, size: 13, min: 10, color: ctx.ink.muted, align: 'center' }), g);
  });
}

function roadmap(ctx, s) {
  const hb = header(ctx, s);
  const list = itemsFor(s, 5);
  const n = list.length;
  const t = 22;
  const gap = 6;
  const cw = (W - 2 * M + (n - 1) * (t - gap)) / n;
  const y = hb + 34;
  const h = 86;
  list.forEach((it, i) => {
    const x = M + i * (cw - t + gap);
    const em = i === s.emphasis;
    const fill = em ? ctx.d.palette.accent : mix(ctx.d.palette.primary, ctx.d.palette.secondary, n > 1 ? i / (n - 1) : 0);
    const color = readable(ctx.d.palette.onPrimary, fill, 4.5);
    const points = i === 0
      ? [[0, 0], [cw - t, 0], [cw, h / 2], [cw - t, h], [0, h]]
      : [[0, 0], [cw - t, 0], [cw, h / 2], [cw - t, h], [0, h], [t, h / 2]];
    const g = i + 1;
    add(ctx, polygon({ x, y, w: cw, h, points, fill, text: label(ctx, it.value || `Phase ${i + 1}`, { w: cw - 2 * t - 6, h: h - 16, size: 17, color }) }), g);
    const tx = x + (i === 0 ? 4 : t);
    const hd = add(ctx, head(ctx, it.heading, { x: tx, y: y + h + 16, w: cw - t - 8, h: 50, size: 17, min: 12, textType: 'itemTitle', role: 'item' }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: tx, y: hd.top + hd.height - 6, w: cw - t - 8, h: H - 30 - (hd.top + hd.height), size: 13, min: 10, color: ctx.ink.muted }), g);
  });
}

function processFlow(ctx, s) {
  const hb = header(ctx, s);
  const list = itemsFor(s, 5);
  const n = list.length;
  const colW = (W - 2 * M) / n;
  const d = 76;
  const cy = hb + 34 + d / 2;
  list.forEach((it, i) => {
    const cx = M + colW * i + colW / 2;
    const em = i === s.emphasis;
    const g = i + 1;
    const fill = em ? ctx.d.palette.accent : ctx.d.palette.primary;
    add(ctx, ellipse({ x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill, gradient: em ? undefined : ctx.d.gradients.accent,
      text: label(ctx, String(i + 1).padStart(2, '0'), { w: d, h: d, size: 24, color: readable(ctx.d.palette.onPrimary, fill, 4.5), font: ctx.f.head }) }), g);
    if (i < n - 1) add(ctx, line({ x1: cx + d / 2 + 10, y1: cy, x2: cx + colW - d / 2 - 10, y2: cy, color: ctx.ink.line, width: 2, arrow: true }), g);
    const hd = add(ctx, head(ctx, it.heading, { x: cx - colW / 2 + 8, y: cy + d / 2 + 16, w: colW - 16, h: 50, size: 17, min: 12, align: 'center', textType: 'itemTitle', role: 'item' }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: cx - colW / 2 + 8, y: hd.top + hd.height - 6, w: colW - 16, h: H - 30 - (hd.top + hd.height), size: 14, min: 10, color: ctx.ink.muted, align: 'center' }), g);
  });
}

function splitSides(items) {
  const a = items.filter((it) => /^a$/i.test(it.group));
  const b = items.filter((it) => /^b$/i.test(it.group));
  if (a.length && b.length) return [a, b];
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

function comparison(ctx, s) {
  const hb = header(ctx, s);
  const sides = splitSides(s.items);
  const gap = 64;
  const pw = (W - 2 * M - gap) / 2;
  const y = hb + 18;
  const ph = H - 36 - y;
  sides.forEach((list, k) => {
    const x = M + k * (pw + gap);
    const em = k === 1;
    const ink = em ? onAccent(ctx) : { title: ctx.ink.cardTitle, body: ctx.ink.cardBody, muted: ctx.ink.cardMuted };
    const g = k + 1;
    add(ctx, card(ctx, { x, y, w: pw, h: ph, emphasis: em }), g);
    const first = list[0] || { heading: k ? 'B' : 'A' };
    const t = add(ctx, head(ctx, first.heading, { x: x + 22, y: y + 18, w: pw - 44, h: 44, size: 22, min: 14, color: ink.title, textType: 'itemTitle', role: 'item' }), g);
    const lines = list.slice(0, 5).map((it, idx) => (idx === 0 ? it.detail : it.detail ? `${it.heading}: ${it.detail}` : it.heading)).filter(Boolean);
    if (lines.length) {
      add(ctx, body(ctx, lines.map((l) => `•  ${l}`).join('\n'), { x: x + 22, y: t.top + t.height + 4, w: pw - 44, h: y + ph - (t.top + t.height) - 20, size: 16, min: 11, color: ink.body, lineHeight: 1.55 }), g);
    }
  });
  const vs = 52;
  add(ctx, ellipse({ x: W / 2 - vs / 2, y: y + ph / 2 - vs / 2, w: vs, h: vs, fill: ctx.ink.bg, outline: { width: 2, color: ctx.ink.line, style: 'solid' },
    text: label(ctx, 'VS', { w: vs, h: vs, size: 15, color: ctx.ink.accent }) }), 1);
}

function chartData(s) {
  if (s.chart) return s.chart;
  const nums = numericItems(s.items);
  if (nums.length < 2) return null;
  return { type: 'column', labels: nums.map((it) => it.heading.slice(0, 24) || it.value), values: nums.map((it) => numeric(it.value)), unit: '', legend: s.title.slice(0, 30) };
}

function dashboard(ctx, s) {
  const hb = header(ctx, s);
  const data = chartData(s);
  const tiles = numericItems(s.items).slice(0, 3);
  const top = hb + 14;
  const bottom = H - 34;
  const tileW = tiles.length ? 250 : 0;
  const gap = tiles.length ? 20 : 0;
  tiles.forEach((it, i) => {
    const th = (bottom - top - (tiles.length - 1) * 14) / tiles.length;
    const y = top + i * (th + 14);
    const em = i === s.emphasis;
    const ink = em ? onAccent(ctx) : { title: ctx.ink.cardTitle, muted: ctx.ink.cardMuted };
    const g = i + 1;
    add(ctx, card(ctx, { x: M, y, w: tileW, h: th, emphasis: em }), g);
    const v = add(ctx, head(ctx, it.value, { x: M + 14, y: y + 8, w: tileW - 28, h: Math.min(60, th * 0.55), size: 36, min: 18, color: em ? ink.title : ctx.ink.accentOnCard, role: 'value', vAlign: 'bottom' }), g);
    add(ctx, body(ctx, it.heading, { x: M + 14, y: v.top + v.height - 6, w: tileW - 28, h: y + th - (v.top + v.height) - 2, size: 13, min: 10, color: ink.muted }), g);
  });
  if (!data) return;
  const cx = M + tileW + gap;
  const cw = W - M - cx;
  const g = tiles.length + 1;
  add(ctx, card(ctx, { x: cx, y: top, w: cw, h: bottom - top }), g);
  const p = ctx.d.palette;
  const colors = [p.primary, p.secondary, p.accent, mix(p.primary, p.secondary, 0.5), mix(p.secondary, p.accent, 0.5), mix(p.primary, ctx.ink.bg, 0.4)];
  add(ctx, chart({ x: cx + 16, y: top + 16, w: cw - 32, h: bottom - top - 32, type: data.type, labels: data.labels, values: data.values, legend: data.unit ? `${data.legend} (${data.unit})` : data.legend, colors, textColor: ctx.ink.cardMuted, lineColor: ctx.ink.line }), g);
}

function bigNumber(ctx, s) {
  const nums = numericItems(s.items).slice(0, 3);
  const list = nums.length ? nums : s.items.slice(0, 1);
  const n = list.length;
  const center = s.variant !== 'left';
  header(ctx, s, { align: center ? 'center' : 'left', sub: false, size: Math.round(ctx.sz.title * 0.8) });
  if (n === 1) {
    const it = list[0];
    const align = center ? 'center' : 'left';
    const v = add(ctx, head(ctx, it.value || it.heading, { x: M, y: 160, w: W - 2 * M, h: 170, size: 128, min: 56, align, color: ctx.ink.accent, lineHeight: 1, role: 'value' }), 1);
    const hd = add(ctx, head(ctx, it.heading, { x: center ? 160 : M, y: v.top + v.height, w: center ? W - 320 : 640, h: 50, size: 24, min: 15, align, textType: 'itemTitle', role: 'item' }), 2);
    const note = it.detail || s.subtitle;
    if (note) add(ctx, body(ctx, note, { x: center ? 160 : M, y: (hd ? hd.top + hd.height : v.top + v.height) + 2, w: center ? W - 320 : 640, h: 70, size: 16, color: ctx.ink.muted, align }), 2);
    return;
  }
  const colW = (W - 2 * M) / n;
  list.forEach((it, i) => {
    const x = M + i * colW;
    const g = i + 1;
    if (i > 0) add(ctx, line({ x1: x, y1: 190, x2: x, y2: 470, color: ctx.ink.line, width: 1 }), g);
    const v = add(ctx, head(ctx, it.value, { x: x + 16, y: 190, w: colW - 32, h: 110, size: 76, min: 34, align: 'center', color: i === s.emphasis ? ctx.d.palette.accent : ctx.ink.accent, lineHeight: 1, role: 'value' }), g);
    const hd = add(ctx, head(ctx, it.heading, { x: x + 16, y: v.top + v.height + 4, w: colW - 32, h: 52, size: 19, min: 13, align: 'center', textType: 'itemTitle', role: 'item' }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: x + 16, y: (hd ? hd.top + hd.height : v.top + v.height) - 4, w: colW - 32, h: 90, size: 14, min: 10, color: ctx.ink.muted, align: 'center' }), g);
  });
}

function caseStudy(ctx, s) {
  const panelW = 380;
  const right = s.variant === 'right';
  const px = right ? W - panelW : 0;
  add(ctx, rect({ x: px, y: 0, w: panelW, h: H, fill: ctx.d.palette.primary, gradient: ctx.d.gradients.accent }));
  const on = onAccent(ctx);
  const saved = ctx.ink;
  ctx.ink = { ...ctx.ink, title: on.title, body: on.body, muted: on.muted, accent: on.title };
  header(ctx, s, { x: px + 40, w: panelW - 80, y: 110 });
  ctx.ink = saved;
  const x = right ? M : panelW + 48;
  const w = W - panelW - 48 - M;
  const list = itemsFor(s, 3);
  const top = 56;
  const rowH = (H - 2 * top) / list.length;
  list.forEach((it, i) => {
    const y = top + i * rowH;
    const g = i + 1;
    const hasValue = Boolean(it.value);
    add(ctx, kicker(ctx, it.heading, { x, y: y + 8, w: hasValue ? w - 150 : w }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x, y: y + 34, w: hasValue ? w - 150 : w, h: rowH - 44, size: 17, min: 12, color: ctx.ink.title }), g);
    if (hasValue) add(ctx, head(ctx, it.value, { x: x + w - 140, y: y + 10, w: 140, h: rowH - 20, size: 40, min: 20, align: 'right', color: ctx.ink.accent, vAlign: 'middle', role: 'value' }), g);
    if (i < list.length - 1) add(ctx, line({ x1: x, y1: y + rowH, x2: x + w, y2: y + rowH, color: ctx.ink.line, width: 1 }), g);
  });
}

function pyramid(ctx, s) {
  const hb = header(ctx, s, { sub: false });
  const list = itemsFor(s, 5);
  const n = list.length;
  const x0 = M;
  const pw = 420;
  const top = hb + 16;
  const ph = H - 30 - top;
  const gap = 6;
  const lh = (ph - (n - 1) * gap) / n;
  const half = (yy) => ((yy - top) / ph) * (pw / 2);
  const labelX = x0 + pw + 50;
  list.forEach((it, i) => {
    const y0 = top + i * (lh + gap);
    const y1 = y0 + lh;
    const h0 = half(y0);
    const h1 = half(y1);
    const bx = x0 + pw / 2 - h1;
    const em = i === s.emphasis;
    const fill = em ? ctx.d.palette.accent : mix(ctx.d.palette.primary, ctx.d.palette.secondary, n > 1 ? i / (n - 1) : 0);
    const g = i + 1;
    add(ctx, polygon({ x: bx, y: y0, w: 2 * h1, h: lh, points: [[h1 - h0, 0], [h1 + h0, 0], [2 * h1, lh], [0, lh]], fill,
      text: i > 0 && it.value ? label(ctx, it.value, { w: h1, h: lh - 8, size: 15, color: readable(ctx.d.palette.onPrimary, fill, 4.5) }) : undefined }), g);
    const cy = (y0 + y1) / 2;
    add(ctx, line({ x1: x0 + pw / 2 + (h0 + h1) / 2 + 8, y1: cy, x2: labelX - 10, y2: cy, color: ctx.ink.line, width: 1, style: 'dotted' }), g);
    const hd = add(ctx, head(ctx, it.heading, { x: labelX, y: cy - Math.min(lh, 64) / 2, w: W - M - labelX, h: 42, size: 18, min: 12, textType: 'itemTitle', role: 'item', color: em ? ctx.ink.accent : ctx.ink.title }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: labelX, y: hd.top + hd.height - 8, w: W - M - labelX, h: Math.max(28, lh - hd.height + 8), size: 13, min: 10, color: ctx.ink.muted }), g);
  });
}

function funnel(ctx, s) {
  const hb = header(ctx, s, { sub: false });
  const list = itemsFor(s, 5);
  const n = list.length;
  const fw = 500;
  const cx = M + fw / 2;
  const top = hb + 16;
  const fh = H - 30 - top;
  const gap = 6;
  const lh = (fh - (n - 1) * gap) / n;
  const width = (k) => fw * (1 - 0.62 * (k / n));
  const detailX = M + fw + 44;
  list.forEach((it, i) => {
    const w0 = width(i);
    const w1 = width(i + 1);
    const y = top + i * (lh + gap);
    const em = i === s.emphasis;
    const fill = em ? ctx.d.palette.accent : mix(ctx.d.palette.primary, ctx.d.palette.secondary, n > 1 ? i / (n - 1) : 0);
    const color = readable(ctx.d.palette.onPrimary, fill, 4.5);
    const g = i + 1;
    const caption = it.value ? `${it.heading}\n${it.value}` : it.heading;
    add(ctx, polygon({ x: cx - w0 / 2, y, w: w0, h: lh, points: [[0, 0], [w0, 0], [w0 / 2 + w1 / 2, lh], [w0 / 2 - w1 / 2, lh]], fill,
      text: label(ctx, caption, { w: w1 - 20, h: lh - 8, size: 16, color }) }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: detailX, y, w: W - M - detailX, h: lh, size: 14, min: 10, color: ctx.ink.muted, vAlign: 'middle' }), g);
  });
}

const SWOT_ORDER = ['S', 'W', 'O', 'T'];
const SWOT_NAMES = { S: 'Strengths', W: 'Weaknesses', O: 'Opportunities', T: 'Threats' };

function swot(ctx, s) {
  const hb = header(ctx, s, { sub: false });
  const byGroup = new Map();
  for (const it of s.items) {
    const key = String(it.group || '').toUpperCase().charAt(0);
    if (SWOT_ORDER.includes(key) && !byGroup.has(key)) byGroup.set(key, it);
  }
  const rest = s.items.filter((it) => ![...byGroup.values()].includes(it));
  for (const key of SWOT_ORDER) if (!byGroup.has(key) && rest.length) byGroup.set(key, rest.shift());
  const p = ctx.d.palette;
  const tones = { S: p.primary, W: p.secondary, O: p.accent, T: mix(p.primary, p.accent, 0.5) };
  const gap = 14;
  const top = hb + 14;
  const qw = (W - 2 * M - gap) / 2;
  const qh = (H - 30 - top - gap) / 2;
  SWOT_ORDER.forEach((key, i) => {
    const it = byGroup.get(key) || { heading: SWOT_NAMES[key], detail: '' };
    const x = M + (i % 2) * (qw + gap);
    const y = top + Math.floor(i / 2) * (qh + gap);
    const g = i + 1;
    add(ctx, card(ctx, { x, y, w: qw, h: qh }), g);
    add(ctx, rect({ x, y, w: 8, h: qh, fill: tones[key], radius: Math.min(4, ctx.d.shape.radius) }), g);
    add(ctx, text(ctx, { x: x + qw - 110, y: y + qh / 2 - 60, w: 100, h: 120, value: key, size: 96, font: ctx.f.head, color: mix(ctx.ink.card, tones[key], 0.35), bold: true, align: 'right', lineHeight: 1, role: 'decor' }), g);
    const hd = add(ctx, head(ctx, it.heading || SWOT_NAMES[key], { x: x + 24, y: y + 14, w: qw - 140, h: 46, size: 19, min: 13, color: ctx.ink.cardTitle, textType: 'itemTitle', role: 'item' }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: x + 24, y: hd.top + hd.height - 6, w: qw - 140, h: y + qh - (hd.top + hd.height) - 4, size: 14, min: 10, color: ctx.ink.cardMuted }), g);
  });
}

function architecture(ctx, s) {
  const hb = header(ctx, s, { sub: false });
  const list = itemsFor(s, 4);
  const n = list.length;
  const gap = 22;
  const top = hb + 14;
  const lh = (H - 30 - top - (n - 1) * gap) / n;
  list.forEach((it, i) => {
    const y = top + i * (lh + gap);
    const em = i === 0 || i === s.emphasis;
    const ink = em ? onAccent(ctx) : { title: ctx.ink.cardTitle, muted: ctx.ink.cardMuted };
    const g = i + 1;
    add(ctx, card(ctx, { x: M, y, w: W - 2 * M, h: lh, emphasis: em }), g);
    add(ctx, head(ctx, it.heading, { x: M + 24, y, w: 260, h: lh, size: 19, min: 12, color: ink.title, vAlign: 'middle', textType: 'itemTitle', role: 'item' }), g);
    if (it.detail) add(ctx, body(ctx, it.detail, { x: M + 300, y, w: W - 2 * M - 324 - (it.value ? 130 : 0), h: lh, size: 14, min: 10, color: ink.muted, vAlign: 'middle' }), g);
    if (it.value) add(ctx, text(ctx, { x: W - M - 150, y, w: 130, h: lh, value: it.value, size: 15, font: ctx.f.body, color: em ? ink.title : ctx.ink.accentOnCard, bold: true, align: 'right', vAlign: 'middle', role: 'value' }), g);
    if (i < n - 1) add(ctx, line({ x1: W / 2, y1: y + lh + 3, x2: W / 2, y2: y + lh + gap - 3, color: ctx.ink.line, width: 2, arrow: true }), g);
  });
}

function closing(ctx, s) {
  const x = 110;
  const w = W - 220;
  let top = 150;
  if (s.kicker) {
    const k = add(ctx, kicker(ctx, s.kicker, { x, y: top, w, align: 'center' }));
    top = k.top + k.height;
  }
  const t = add(ctx, head(ctx, s.title, { x, y: top, w, h: 150, size: Math.round(ctx.sz.hero * 0.85), min: 30, align: 'center', lineHeight: 1.06 }));
  top = t.top + t.height + 4;
  if (s.subtitle) {
    const st = add(ctx, body(ctx, s.subtitle, { x: x + 60, y: top, w: w - 120, h: 70, size: ctx.sz.sub, color: ctx.ink.muted, align: 'center', role: 'subtitle' }), 1);
    top = st.top + st.height + 18;
  }
  const chips = s.items.slice(0, 3).map((it) => it.heading || it.detail).filter(Boolean);
  if (!chips.length) return;
  const widths = chips.map((c) => Math.min(250, 48 + c.length * 8.6));
  const total = widths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 14;
  let cx = W / 2 - total / 2;
  chips.forEach((c, i) => {
    const fill = i === 0 ? ctx.ink.chip : ctx.ink.card;
    const color = readable(i === 0 ? ctx.ink.chipText : ctx.ink.cardTitle, fill, 4.5);
    add(ctx, rect({ x: cx, y: Math.min(top, H - 90), w: widths[i], h: 44, fill, radius: 22, text: label(ctx, c, { w: widths[i] - 24, h: 40, size: 15, color }) }), 2 + i);
    cx += widths[i] + 14;
  });
}

const LAYOUT_FNS = {
  hero,
  statement,
  agenda,
  'cards-grid': cardsGrid,
  infographic,
  timeline,
  roadmap,
  'process-flow': processFlow,
  comparison,
  dashboard,
  'big-number': bigNumber,
  'case-study': caseStudy,
  pyramid,
  funnel,
  swot,
  architecture,
  closing,
};

module.exports = { LAYOUT_FNS, M, add, gradientOf };
