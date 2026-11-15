// Tầng 3 – Slide Composition (Gemini). Với từng slide: chọn layout trong thư viện, cách bố trí (variant), loại nền,
// sắp xếp lại các mục cho hợp layout và dữ liệu biểu đồ. Không có Gemini → bộ chọn theo luật, tránh lặp layout.
// Có thể chỉ dựng lại một số slide (QA yêu cầu hoặc người dùng redesign) mà vẫn giữ Design System.

const { callJson, isAvailable } = require('./llm');
const { LAYOUTS, LAYOUT_ITEMS, INTENT_LAYOUTS, CHART_TYPES, validateSlideComposition } = require('./schema');

const SEQUENTIAL = new Set(['process-flow', 'timeline', 'roadmap', 'funnel']);

function numeric(value) {
  const m = String(value || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function numericItems(items) {
  return items.filter((it) => numeric(it.value) !== null);
}

// Layout có trình bày được nội dung này không (đủ/không thừa mục, có số liệu khi cần)
function fits(layout, slide) {
  const [min, max] = LAYOUT_ITEMS[layout] || [0, 8];
  const n = slide.items.length;
  if (layout === 'big-number') return numericItems(slide.items).length >= 1;
  if (layout === 'dashboard') return Boolean(slide.chart) || numericItems(slide.items).length >= 2;
  if (layout === 'hero' || layout === 'statement' || layout === 'closing') return true;
  if (layout === 'comparison') return n >= 2 && n <= max;
  return n >= min && n <= max + 2; // dư vài mục thì cắt bớt, vẫn chấp nhận
}

function candidates(intent) {
  return [...(INTENT_LAYOUTS[intent] || []), 'cards-grid', 'infographic', 'statement'];
}

// Chọn layout theo luật: hợp ý đồ, vừa nội dung, không trùng slide liền trước và không quá 2 lần trong deck
function pickLayout(slide, intent, prev, counts, avoid = []) {
  const list = candidates(intent).filter((l) => !avoid.includes(l));
  const ok = (l) => fits(l, slide) && l !== prev && (counts[l] || 0) < 2;
  return list.find(ok) || list.find((l) => fits(l, slide) && l !== prev) || list.find((l) => fits(l, slide)) || 'statement';
}

function backgroundFor(index, total, layout, design) {
  if (layout === 'hero' || layout === 'closing') return design.backgroundStyle === 'solid' ? 'accent' : 'gradient';
  if (layout === 'statement' || layout === 'big-number') return index % 2 ? 'accent' : 'gradient';
  if (design.backgroundStyle === 'gradient') return 'gradient';
  return index % 3 === 2 ? 'surface' : 'base';
}

function ruleComposition(content, design, { only = null, avoid = {} } = {}) {
  const counts = {};
  let prev = '';
  return content.slides.map((slide, i) => {
    const base = validateSlideComposition({}, slide).value;
    if (only && !only.includes(i)) return null;
    const layout = i === 0 ? 'hero' : i === content.slides.length - 1 ? 'closing' : pickLayout(base, slide.intent, prev, counts, avoid[i]);
    counts[layout] = (counts[layout] || 0) + 1;
    prev = layout;
    return {
      ...base,
      layout,
      variant: ['left', 'right', 'center'][i % 3],
      background: backgroundFor(i, content.slides.length, layout, design),
      animation: design.animation.philosophy !== 'minimal' && SEQUENTIAL.has(layout) ? 'build' : 'subtle',
    };
  });
}

const SYSTEM = `You are a presentation layout designer. For each slide choose the layout that communicates its content best.
Available layouts and what they need:
- hero: cover, no items. - closing: final call to action, 0-3 short items.
- statement: one bold sentence (quote, key insight), no items.
- agenda: 3-6 items. - cards-grid: 3-6 parallel ideas. - infographic: 3-5 ideas around one central message.
- timeline: 3-6 dated items (value = date). - roadmap: 3-5 phases (value = phase label). - process-flow: 3-5 sequential steps.
- comparison: two sides, items with group "A" or "B" (2-4 per side; first item heading of each side is the side name).
- dashboard: KPI tiles + chart; give "chart" {type: ${CHART_TYPES.join('|')}, labels: [2-8], values: [numbers], unit, legend} with plausible data.
- big-number: 1-3 headline numbers (value is the number, heading explains it).
- case-study: exactly 3 items: challenge, approach, result (result may carry a value).
- pyramid: 3-5 levels, top = most important. - funnel: 3-5 stages from widest to narrowest, value optional.
- swot: exactly 4 items with group S, W, O, T. - architecture: 3-4 layers from top (user facing) to bottom (foundation).
Return JSON only: {"slides": [{"index": number, "layout": string, "variant": "left"|"right"|"center", "background": "base"|"surface"|"accent"|"gradient",
 "title": string, "subtitle": string, "kicker": string, "items": [{"heading","detail","value","group"}], "chart": object|null, "emphasis": index of the item to highlight or -1, "animation": "none"|"subtle"|"build"}]}
Rules:
- Keep the slide text meaning; you may shorten text and restructure items to suit the layout. Headings <= 40 chars, details <= 120 chars.
- Never use the same layout on two consecutive slides; use each layout at most twice per deck; maximise variety.
- First slide hero, last slide closing. Use "accent"/"gradient" backgrounds for rhythm (about 1 in 3 slides), not on dense slides.
- "build" animation only for sequential content (process, timeline, roadmap, funnel); otherwise "subtle".`;

function brief(content, design, only) {
  return {
    deck: { title: content.title, audience: content.audience, tone: content.tone, design: { name: design.name, mood: design.mood, animation: design.animation.philosophy } },
    slides: content.slides
      .map((s, index) => ({ index, intent: s.intent, title: s.title, kicker: s.kicker, keyMessage: s.keyMessage, points: s.points }))
      .filter((s) => !only || only.includes(s.index)),
  };
}

function validator(content, only) {
  const expected = only || content.slides.map((_, i) => i);
  return (raw) => {
    const list = Array.isArray(raw?.slides) ? raw.slides : [];
    const errors = [];
    const byIndex = new Map();
    list.forEach((s, pos) => {
      const index = Number.isInteger(s?.index) ? s.index : expected[pos];
      if (!expected.includes(index)) return;
      const slide = content.slides[index];
      const checked = validateSlideComposition(s, slide);
      // Layout sai tên thì nhờ model sửa; layout không vừa nội dung để Design QA đổi theo luật (không tốn thêm lượt gọi)
      if (!checked.ok) errors.push(...checked.errors.map((e) => `slides[${index}]: ${e}`));
      byIndex.set(index, checked.value);
    });
    const missing = expected.filter((i) => !byIndex.has(i));
    if (missing.length) errors.push(`missing slides ${missing.join(', ')}`);
    return { ok: errors.length === 0, errors, value: byIndex };
  };
}

/**
 * Dựng composition cho cả deck hoặc chỉ các slide trong `only`.
 * @returns {Promise<{slides: Array<object|null>, provider: string, calls: number, warnings: string[]}>}
 */
async function buildComposition(content, design, { only = null, avoid = {}, instruction = '' } = {}) {
  const rules = ruleComposition(content, design, { only, avoid });
  const warnings = [];
  if (!isAvailable('gemini')) return { slides: rules, provider: 'rules', calls: 0, warnings };
  try {
    const extra = [
      instruction ? `Designer request for these slides: ${instruction}` : '',
      Object.keys(avoid).length ? `Do not use these layouts: ${JSON.stringify(avoid)}` : '',
    ].filter(Boolean).join('\n');
    const res = await callJson({
      provider: 'gemini',
      system: SYSTEM,
      user: `${JSON.stringify(brief(content, design, only))}${extra ? `\n${extra}` : ''}`,
      validate: validator(content, only),
      maxTokens: 8000,
      temperature: 0.8,
    });
    const slides = rules.map((rule, i) => {
      const ai = res.value.get(i);
      if (!ai) return rule;
      // Layout bị cấm cho slide này (QA/redesign) thì giữ phương án theo luật
      return (avoid[i] || []).includes(ai.layout) ? rule : ai;
    });
    return { slides, provider: 'gemini', model: res.model, calls: res.calls, warnings };
  } catch (err) {
    warnings.push(`composition/gemini: ${err.message}`);
    return { slides: rules, provider: 'rules', calls: err.calls || 1, warnings };
  }
}

module.exports = { buildComposition, ruleComposition, fits, pickLayout, numeric, numericItems, LAYOUTS };
