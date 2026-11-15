// Tầng 5 – Rendering (biên dịch). Đổi composition@1 + design@1 thành slide PPTist. Kết quả được cả studio PPTist
// lẫn SlideView (React) vẽ ra, chỉnh sửa được từng phần tử và xuất được PPTX.

const { W, H, text, animation, uid, esc, gradientOf } = require('./primitives');
const { LAYOUT_FNS } = require('./layouts');
const { decorations, decorationLevel } = require('../assets');
const { readable, mix, isDark, contrast, bestText } = require('../color');
const { SCHEMA_VERSIONS } = require('../schema');

const SIZES = {
  compact: { hero: 54, title: 34, sub: 16, kicker: 12 },
  balanced: { hero: 60, title: 38, sub: 18, kicker: 13 },
  dramatic: { hero: 68, title: 42, sub: 18, kicker: 13 },
};

const DURATION = { minimal: 500, calm: 700, dynamic: 550 };

function backgroundOf(kind, design) {
  const p = design.palette;
  if (kind === 'gradient') return { type: 'gradient', gradient: gradientOf(design.gradients.hero), color: design.gradients.hero.colors[0] };
  if (kind === 'accent') return { type: 'solid', color: p.primary };
  if (kind === 'surface') return { type: 'solid', color: p.surface };
  return { type: 'solid', color: p.background };
}

// Bảng màu chữ theo nền của từng slide; với nền gradient phải đọc được trên mọi điểm dừng màu
function inkFor(kind, design) {
  const p = design.palette;
  const stops = kind === 'gradient' ? design.gradients.hero.colors : [kind === 'accent' ? p.primary : kind === 'surface' ? p.surface : p.background];
  const bg = stops[0];
  const on = (c, min) => stops.reduce((acc, s) => readable(acc, s, min), c);
  // Nền gradient có thể sáng (theme giấy) hoặc đậm: chọn màu chữ đọc tốt hơn giữa onPrimary và text
  const gradientText = kind === 'gradient' ? bestText(stops, [p.onPrimary, p.text]) : null;
  const onColored = kind === 'accent' || (kind === 'gradient' && gradientText === p.onPrimary);
  const title = on(gradientText || (onColored ? p.onPrimary : p.text), 4.5);
  const dark = isDark(bg);
  const cardBase = kind === 'base' && contrast(p.surface, bg) > 1.06 ? p.surface : mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.09 : 0.05);
  const accentRaw = onColored ? (contrast(p.accent, bg) >= 3 ? p.accent : title) : p.accent;
  const ink = {
    bg,
    dark,
    title,
    body: on(onColored ? p.onPrimary : p.text, 4.5),
    muted: on(onColored ? mix(p.onPrimary, bg, 0.25) : p.muted, 4.5),
    // accent cho số lớn/shape (≥3:1), accentText cho chữ nhỏ như kicker (≥4.5:1)
    accent: on(accentRaw, 3),
    accentText: on(accentRaw, 4.5),
    line: mix(bg, title, 0.28),
    card: cardBase,
    chip: onColored ? p.onPrimary : p.primary,
  };
  ink.chipText = readable(onColored ? p.primary : p.onPrimary, ink.chip, 4.5);
  ink.cardTitle = readable(p.text, cardBase, 4.5);
  ink.cardBody = readable(p.text, cardBase, 4.5);
  ink.cardMuted = readable(p.muted, cardBase, 4.5);
  ink.accentOnCard = readable(p.accent, cardBase, 3);
  return ink;
}

// Nhóm phần tử → danh sách animation. Giới hạn theo maxPerSlide của Design System: nhóm thừa gộp vào nhóm cuối.
function animationsFor(groups, slideAnim, design, decorIds) {
  const max = design.animation.maxPerSlide;
  if (slideAnim === 'none' || max === 0) return [];
  const ordered = groups.filter((g) => g && g.length).map((g) => g.filter((id) => !decorIds.has(id))).filter((g) => g.length);
  let steps = slideAnim === 'subtle' ? [ordered[0] || [], ordered.slice(1).flat()] : ordered;
  steps = steps.filter((g) => g.length);
  if (steps.length > max) steps = [...steps.slice(0, max - 1), steps.slice(max - 1).flat()];
  const duration = DURATION[design.animation.philosophy] || 600;
  const out = [];
  steps.forEach((ids, i) => {
    const effect = i === 0 && design.animation.entrance === 'zoomIn' ? 'fadeInUp' : design.animation.entrance;
    ids.forEach((id, k) => out.push(animation(id, effect, duration, k === 0 ? 'auto' : 'meantime')));
  });
  return out;
}

function notesHtml(notes) {
  return notes ? `<p>${esc(notes)}</p>` : '';
}

/**
 * Biên dịch một slide.
 * @returns {{slide: object, issues: object[], texts: object[], ink: object, decorLevel: string}}
 */
function renderSlide(comp, { index, total, design, prevDecor = 'none', slideId }) {
  const fn = LAYOUT_FNS[comp.layout] || LAYOUT_FNS['cards-grid'];
  const ink = inkFor(comp.background, design);
  const ctx = {
    d: design,
    ink,
    f: { head: design.typography.heading, body: design.typography.body },
    sz: SIZES[design.typography.scale] || SIZES.balanced,
    els: [],
    groups: [],
    issues: [],
    texts: [],
  };
  const decorLevel = decorationLevel(comp.layout, index, prevDecor);
  const decor = decorations(design, ink, decorLevel);
  ctx.els.push(...decor);
  const decorIds = new Set(decor.map((d) => d.id));

  fn(ctx, comp);

  if (comp.layout !== 'hero' && comp.layout !== 'closing') {
    const page = text(ctx, { x: W - 110, y: H - 40, w: 70, h: 36, value: String(index + 1).padStart(2, '0'), size: 11, font: ctx.f.body, color: ink.muted, align: 'right', role: 'page' });
    if (page && !page.skip) {
      ctx.els.push({ ...page, lock: true, name: 'page-number' });
      decorIds.add(page.id);
    }
  }

  const slide = {
    id: slideId || uid(),
    elements: ctx.els,
    background: backgroundOf(comp.background, design),
    animations: animationsFor(ctx.groups, comp.animation, design, decorIds),
    turningMode: design.animation.transition,
    type: comp.layout === 'hero' ? 'cover' : comp.layout === 'closing' ? 'end' : 'content',
    remark: notesHtml(comp.notes),
    pickme: { specVersion: SCHEMA_VERSIONS.composition, layout: comp.layout, composition: comp },
  };
  return { slide, issues: ctx.issues, texts: ctx.texts, ink, decorLevel };
}

module.exports = { renderSlide, inkFor, backgroundOf, animationsFor, SIZES };
