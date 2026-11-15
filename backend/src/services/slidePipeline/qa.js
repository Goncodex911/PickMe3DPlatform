// Tầng 6 – Design QA & Refinement. Kiểm tra theo luật trước (miễn phí, xác định), chỉ gọi AI dựng lại những slide
// mà luật không sửa được (vẫn tràn chữ sau khi rút gọn). Mỗi vấn đề ghi vào báo cáo kèm cách đã xử lý.

const { fits, pickLayout, buildComposition } = require('./composition');
const { renderSlide } = require('./render');
const { LAYOUT_ITEMS } = require('./schema');
const { contrast } = require('./color');
const { isAvailable } = require('./llm');

const MAX_CHARS = 700;
const ON_SLIDE_BG = new Set(['title', 'subtitle', 'kicker']);

function chars(comp) {
  return [comp.title, comp.subtitle, comp.kicker, ...comp.items.flatMap((it) => [it.heading, it.detail, it.value])].join('').length;
}

function shorten(value, max) {
  if (!value || value.length <= max) return value;
  const cut = value.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 12)).trim()}…`;
}

// Sửa composition trước khi dựng: layout không vừa nội dung, lặp layout, quá nhiều chữ, nhịp nền/animation
function preflight(content, comps, design, report) {
  const counts = {};
  comps.forEach((comp, i) => {
    const intent = content.slides[i].intent;
    const prev = comps[i - 1]?.layout;
    if (!fits(comp.layout, comp)) {
      const next = pickLayout(comp, intent, prev, counts, [comp.layout]);
      report.push({ slide: i, type: 'layout-misfit', severity: 'medium', fixed: true, action: `${comp.layout} → ${next}` });
      comp.layout = next;
    }
    if (i > 0 && comp.layout === prev && i < comps.length - 1) {
      const next = pickLayout(comp, intent, prev, counts, [prev]);
      report.push({ slide: i, type: 'layout-duplicate', severity: 'medium', fixed: next !== prev, action: `${prev} → ${next}` });
      comp.layout = next;
    }
    if ((counts[comp.layout] || 0) >= 2 && !['hero', 'closing'].includes(comp.layout)) {
      const next = pickLayout(comp, intent, prev, counts, [comp.layout]);
      if (next !== comp.layout) {
        report.push({ slide: i, type: 'layout-overused', severity: 'low', fixed: true, action: `${comp.layout} → ${next}` });
        comp.layout = next;
      }
    }
    counts[comp.layout] = (counts[comp.layout] || 0) + 1;
    const [, max] = LAYOUT_ITEMS[comp.layout] || [0, 8];
    if (max && comp.items.length > max && comp.layout !== 'comparison') {
      report.push({ slide: i, type: 'too-many-items', severity: 'low', fixed: true, action: `${comp.items.length} → ${max} items` });
      comp.items = comp.items.slice(0, max);
    }
    if (chars(comp) > MAX_CHARS) {
      comp.items = comp.items.map((it) => ({ ...it, detail: shorten(it.detail, 90) }));
      comp.subtitle = shorten(comp.subtitle, 140);
      report.push({ slide: i, type: 'content-density', severity: 'medium', fixed: true, action: 'shortened details' });
    }
  });
  // Nền màu đậm (accent/gradient) không được đứng liền nhau quá 2 slide, kẻo deck nặng nề
  for (let i = 2; i < comps.length; i += 1) {
    const strong = (c) => c.background === 'accent' || c.background === 'gradient';
    if (strong(comps[i]) && strong(comps[i - 1]) && strong(comps[i - 2]) && i !== comps.length - 1) {
      comps[i - 1].background = 'base';
      report.push({ slide: i - 1, type: 'visual-rhythm', severity: 'low', fixed: true, action: 'background → base' });
    }
  }
  // Animation dạng build cho tối đa một nửa số slide
  const builds = comps.map((c, i) => (c.animation === 'build' ? i : -1)).filter((i) => i >= 0);
  const limit = Math.ceil(comps.length / 2);
  if (design.animation.philosophy === 'minimal' || builds.length > limit) {
    const SEQUENTIAL = new Set(['process-flow', 'timeline', 'roadmap', 'funnel']);
    builds.filter((i) => design.animation.philosophy === 'minimal' || !SEQUENTIAL.has(comps[i].layout)).forEach((i) => {
      comps[i].animation = 'subtle';
      report.push({ slide: i, type: 'animation-excess', severity: 'low', fixed: true, action: 'build → subtle' });
    });
  }
}

function renderAll(comps, design, slideIds = []) {
  let prevDecor = 'none';
  return comps.map((comp, index) => {
    const out = renderSlide(comp, { index, total: comps.length, design, prevDecor, slideId: slideIds[index] });
    prevDecor = out.decorLevel;
    return out;
  });
}

// Kiểm tra sau khi dựng: tràn chữ, tương phản
function inspect(rendered, comps) {
  const problems = [];
  rendered.forEach((r, i) => {
    const content = r.issues.filter((x) => x.role !== 'decor');
    const overflow = content.filter((x) => x.type === 'overflow');
    if (overflow.length) problems.push({ slide: i, type: 'text-overflow', severity: 'high', count: overflow.length, roles: [...new Set(overflow.map((x) => x.role))] });
    const dense = content.filter((x) => x.type === 'dense');
    if (dense.length >= 3) problems.push({ slide: i, type: 'text-shrunk', severity: 'low', count: dense.length });
    if (comps[i].layout !== 'case-study') {
      const stops = r.slide.background.type === 'gradient' ? r.slide.background.gradient.colors.map((c) => c.color) : [r.slide.background.color];
      for (const t of r.texts) {
        if (!ON_SLIDE_BG.has(t.role)) continue;
        const ratio = Math.min(...stops.map((s) => contrast(t.color, s)));
        const min = t.size >= 24 ? 3 : 4.5;
        if (ratio < min) problems.push({ slide: i, type: 'low-contrast', severity: 'high', role: t.role, ratio: Math.round(ratio * 100) / 100 });
      }
    }
  });
  return problems;
}

/**
 * Chạy QA + dựng slide. Trả về slide PPTist cuối cùng và báo cáo.
 * @param {{allowAi?: boolean}} opts
 */
async function refine(content, design, comps, { allowAi = true, slideIds = [] } = {}) {
  const report = [];
  let aiCalls = 0;
  preflight(content, comps, design, report);
  let rendered = renderAll(comps, design, slideIds);
  let problems = inspect(rendered, comps);

  // Vòng sửa theo luật: slide tràn chữ → rút gọn chi tiết rồi dựng lại
  const overflowing = [...new Set(problems.filter((p) => p.type === 'text-overflow').map((p) => p.slide))];
  if (overflowing.length) {
    for (const i of overflowing) {
      comps[i].items = comps[i].items.map((it) => ({ ...it, heading: shorten(it.heading, 32), detail: shorten(it.detail, 70) }));
      comps[i].subtitle = shorten(comps[i].subtitle, 110);
      comps[i].title = shorten(comps[i].title, 64);
    }
    rendered = renderAll(comps, design, slideIds);
    const after = inspect(rendered, comps);
    overflowing.forEach((i) => {
      const still = after.some((p) => p.slide === i && p.type === 'text-overflow');
      report.push({ slide: i, type: 'text-overflow', severity: 'high', fixed: !still, action: 'shortened text' });
    });
    problems = after;
  }

  // Chỉ gọi AI khi luật không đủ: dựng lại các slide còn tràn chữ với layout khác
  const stuck = [...new Set(problems.filter((p) => p.type === 'text-overflow').map((p) => p.slide))];
  if (stuck.length && allowAi && isAvailable('gemini')) {
    const avoid = Object.fromEntries(stuck.map((i) => [i, [comps[i].layout]]));
    const res = await buildComposition(content, design, { only: stuck, avoid, instruction: 'The previous layout overflowed. Pick a roomier layout and shorten every text by about 30%.' });
    aiCalls += res.calls;
    stuck.forEach((i) => {
      if (res.slides[i]) comps[i] = res.slides[i];
    });
    rendered = renderAll(comps, design, slideIds);
    problems = inspect(rendered, comps);
    stuck.forEach((i) => {
      const still = problems.some((p) => p.slide === i && p.type === 'text-overflow');
      report.push({ slide: i, type: 'ai-regenerate', severity: 'high', fixed: !still, action: `re-composed by ${res.provider}` });
    });
  }

  for (const p of problems) {
    if (p.type === 'text-overflow') continue;
    report.push({ ...p, fixed: false, action: 'reported' });
  }
  const unfixed = report.filter((r) => !r.fixed);
  const score = Math.max(0, 100 - unfixed.reduce((s, r) => s + (r.severity === 'high' ? 12 : r.severity === 'medium' ? 6 : 2), 0) - report.filter((r) => r.fixed).length);
  return { slides: rendered.map((r) => r.slide), comps, report, score, aiCalls };
}

module.exports = { refine, preflight, inspect, renderAll };
