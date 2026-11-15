// Hợp đồng dữ liệu giữa các tầng của AI Presentation Pipeline. Mỗi tầng có version riêng để deck cũ vẫn đọc được
// khi schema đổi. Validator tự viết (không thêm thư viện): làm sạch dữ liệu AI trả về và báo lỗi cụ thể theo đường dẫn.

const SCHEMA_VERSIONS = Object.freeze({
  content: 'content@1',
  design: 'design@1',
  composition: 'composition@1',
  deck: 'deck@1',
});

// Ý đồ của từng slide do tầng nội dung xác định; tầng bố cục dùng nó để chọn layout phù hợp
const INTENTS = [
  'cover', 'agenda', 'statement', 'problem', 'solution', 'process', 'timeline', 'roadmap', 'comparison',
  'metrics', 'case', 'swot', 'funnel', 'hierarchy', 'architecture', 'features', 'quote', 'closing',
];

const LAYOUTS = [
  'hero', 'agenda', 'statement', 'infographic', 'timeline', 'comparison', 'dashboard', 'process-flow',
  'big-number', 'case-study', 'roadmap', 'pyramid', 'funnel', 'swot', 'architecture', 'cards-grid', 'closing',
];

// Số mục tối thiểu / tối đa mỗi layout trình bày được mà không vỡ bố cục
const LAYOUT_ITEMS = Object.freeze({
  hero: [0, 0],
  agenda: [3, 6],
  statement: [0, 0],
  infographic: [3, 5],
  timeline: [3, 6],
  comparison: [2, 8],
  dashboard: [0, 3],
  'process-flow': [3, 5],
  'big-number': [1, 3],
  'case-study': [3, 3],
  roadmap: [3, 5],
  pyramid: [3, 5],
  funnel: [3, 5],
  swot: [4, 4],
  architecture: [3, 4],
  'cards-grid': [3, 6],
  closing: [0, 3],
});

// Layout hợp với từng ý đồ, theo thứ tự ưu tiên; dùng khi AI không chọn được hoặc chọn sai
const INTENT_LAYOUTS = Object.freeze({
  cover: ['hero'],
  agenda: ['agenda', 'cards-grid'],
  statement: ['statement', 'big-number'],
  problem: ['infographic', 'cards-grid', 'statement'],
  solution: ['cards-grid', 'infographic', 'architecture'],
  process: ['process-flow', 'roadmap', 'timeline'],
  timeline: ['timeline', 'roadmap', 'process-flow'],
  roadmap: ['roadmap', 'timeline', 'process-flow'],
  comparison: ['comparison', 'cards-grid'],
  metrics: ['dashboard', 'big-number', 'cards-grid'],
  case: ['case-study', 'infographic'],
  swot: ['swot', 'cards-grid'],
  funnel: ['funnel', 'pyramid', 'process-flow'],
  hierarchy: ['pyramid', 'architecture', 'funnel'],
  architecture: ['architecture', 'pyramid', 'process-flow'],
  features: ['cards-grid', 'infographic'],
  quote: ['statement'],
  closing: ['closing'],
});

const FONTS = [
  'Inter', 'Roboto', 'Montserrat', 'Lato', 'Plus Jakarta Sans', 'Playfair Display', 'Merriweather', 'Literata',
  'OpenSans', 'SourceSansPro', 'SourceSerif4',
];
const ENTRANCES = ['fadeIn', 'fadeInUp', 'fadeInLeft', 'fadeInRight', 'zoomIn'];
const TRANSITIONS = ['no', 'fade', 'slideX', 'slideY', 'scale', 'scaleY', 'slideX3D'];
const CHART_TYPES = ['column', 'bar', 'line', 'area', 'pie', 'ring'];

const HEX = /^#[0-9a-f]{6}$/i;

function str(value, max, fallback = '') {
  if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, max) : fallback;
}

function hex(value, fallback) {
  if (typeof value !== 'string') return fallback;
  let v = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX.test(v) ? v.toLowerCase() : fallback;
}

function oneOf(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

function clampNum(value, min, max, fallback) {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function item(raw) {
  if (typeof raw === 'string') return { heading: str(raw, 80), detail: '', value: '', group: '' };
  if (!raw || typeof raw !== 'object') return null;
  const out = {
    heading: str(raw.heading ?? raw.title ?? raw.label, 80),
    detail: str(raw.detail ?? raw.text ?? raw.description, 220),
    value: str(raw.value ?? raw.metric, 24),
    group: str(raw.group, 12),
  };
  return out.heading || out.detail || out.value ? out : null;
}

function items(list, max) {
  return (Array.isArray(list) ? list : []).map(item).filter(Boolean).slice(0, max);
}

/* ---------------------------------- content@1 ---------------------------------- */

function validateContent(raw, { topic = '', minSlides = 5, maxSlides = 12 } = {}) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['content: not an object'] };
  const slides = (Array.isArray(raw.slides) ? raw.slides : [])
    .map((s, i) => {
      if (!s || typeof s !== 'object') return null;
      const title = str(s.title, 90);
      if (!title) {
        errors.push(`content.slides[${i}].title missing`);
        return null;
      }
      return {
        intent: oneOf(s.intent, INTENTS, 'statement'),
        title,
        kicker: str(s.kicker, 40),
        keyMessage: str(s.keyMessage, 200),
        points: items(s.points, 8),
        speakerNotes: str(s.speakerNotes, 600),
      };
    })
    .filter(Boolean)
    .slice(0, maxSlides);
  if (slides.length < minSlides) errors.push(`content.slides: need at least ${minSlides}, got ${slides.length}`);
  if (slides.length && slides[0].intent !== 'cover') slides[0].intent = 'cover';
  if (slides.length > 1 && slides[slides.length - 1].intent !== 'closing') slides[slides.length - 1].intent = 'closing';
  const value = {
    version: SCHEMA_VERSIONS.content,
    title: str(raw.title, 120, str(topic, 120, 'Untitled deck')),
    subtitle: str(raw.subtitle, 160),
    audience: str(raw.audience, 120),
    goal: str(raw.goal, 200),
    tone: str(raw.tone, 60),
    language: str(raw.language, 20, 'en'),
    storyline: str(raw.storyline, 400),
    slides,
  };
  return { ok: errors.length === 0, errors, value };
}

/* ---------------------------------- design@1 ---------------------------------- */

function gradient(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;
  const colors = (Array.isArray(raw.colors) ? raw.colors : []).map((c) => hex(c, null)).filter(Boolean).slice(0, 3);
  if (colors.length < 2) return fallback;
  return {
    type: raw.type === 'radial' ? 'radial' : 'linear',
    angle: clampNum(raw.angle, 0, 360, fallback?.angle ?? 135),
    colors,
  };
}

function validateDesign(raw, fallback) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['design: not an object'], value: fallback };
  const p = raw.palette && typeof raw.palette === 'object' ? raw.palette : {};
  const fp = fallback.palette;
  const palette = {};
  for (const key of Object.keys(fp)) {
    palette[key] = hex(p[key], null);
    if (!palette[key]) {
      errors.push(`design.palette.${key} invalid`);
      palette[key] = fp[key];
    }
  }
  const t = raw.typography && typeof raw.typography === 'object' ? raw.typography : {};
  const a = raw.animation && typeof raw.animation === 'object' ? raw.animation : {};
  const s = raw.shape && typeof raw.shape === 'object' ? raw.shape : {};
  const g = raw.gradients && typeof raw.gradients === 'object' ? raw.gradients : {};
  const value = {
    version: SCHEMA_VERSIONS.design,
    name: str(raw.name, 60, fallback.name),
    mood: str(raw.mood, 160, fallback.mood),
    palette,
    gradients: {
      hero: gradient(g.hero, fallback.gradients.hero),
      accent: gradient(g.accent, fallback.gradients.accent),
    },
    typography: {
      heading: oneOf(t.heading, FONTS, fallback.typography.heading),
      body: oneOf(t.body, FONTS, fallback.typography.body),
      headingWeight: t.headingWeight === 'normal' ? 'normal' : 'bold',
      headingCase: t.headingCase === 'upper' ? 'upper' : 'none',
      scale: oneOf(t.scale, ['compact', 'balanced', 'dramatic'], fallback.typography.scale),
    },
    shape: {
      radius: clampNum(s.radius, 0, 28, fallback.shape.radius),
      shadow: s.shadow === undefined ? fallback.shape.shadow : Boolean(s.shadow),
    },
    decoration: oneOf(raw.decoration, ['none', 'orbs', 'grid', 'lines', 'corner'], fallback.decoration),
    backgroundStyle: oneOf(raw.backgroundStyle, ['solid', 'gradient', 'mixed'], fallback.backgroundStyle),
    animation: {
      philosophy: oneOf(a.philosophy, ['minimal', 'calm', 'dynamic'], fallback.animation.philosophy),
      entrance: oneOf(a.entrance, ENTRANCES, fallback.animation.entrance),
      transition: oneOf(a.transition, TRANSITIONS, fallback.animation.transition),
      maxPerSlide: clampNum(a.maxPerSlide, 0, 6, fallback.animation.maxPerSlide),
    },
  };
  return { ok: errors.length === 0, errors, value };
}

/* -------------------------------- composition@1 -------------------------------- */

function chart(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const labels = (Array.isArray(raw.labels) ? raw.labels : []).map((l) => str(l, 24)).filter(Boolean).slice(0, 8);
  const values = (Array.isArray(raw.values) ? raw.values : []).map((v) => clampNum(v, -1e12, 1e12, NaN));
  if (labels.length < 2 || values.length < labels.length || values.slice(0, labels.length).some(Number.isNaN)) return null;
  return {
    type: oneOf(raw.type, CHART_TYPES, 'column'),
    labels,
    values: values.slice(0, labels.length),
    unit: str(raw.unit, 12),
    legend: str(raw.legend, 30, 'Series'),
  };
}

function validateSlideComposition(raw, contentSlide) {
  const errors = [];
  const src = raw && typeof raw === 'object' ? raw : {};
  let layout = src.layout;
  if (!LAYOUTS.includes(layout)) {
    if (layout !== undefined) errors.push(`layout "${layout}" unknown`);
    layout = INTENT_LAYOUTS[contentSlide.intent]?.[0] || 'cards-grid';
  }
  const own = items(src.items, 8);
  const value = {
    version: SCHEMA_VERSIONS.composition,
    layout,
    variant: oneOf(src.variant, ['left', 'right', 'center'], 'left'),
    background: oneOf(src.background, ['base', 'surface', 'accent', 'gradient'], 'base'),
    title: str(src.title, 90, contentSlide.title),
    subtitle: str(src.subtitle, 200, contentSlide.keyMessage),
    kicker: str(src.kicker, 40, contentSlide.kicker),
    items: own.length ? own : contentSlide.points,
    chart: chart(src.chart),
    emphasis: clampNum(src.emphasis, -1, 7, -1),
    animation: oneOf(src.animation, ['none', 'subtle', 'build'], 'subtle'),
    notes: contentSlide.speakerNotes,
  };
  return { ok: errors.length === 0, errors, value };
}

module.exports = {
  SCHEMA_VERSIONS,
  INTENTS,
  LAYOUTS,
  LAYOUT_ITEMS,
  INTENT_LAYOUTS,
  FONTS,
  ENTRANCES,
  TRANSITIONS,
  CHART_TYPES,
  validateContent,
  validateDesign,
  validateSlideComposition,
  str,
  hex,
};
