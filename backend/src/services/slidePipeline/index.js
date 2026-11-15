// AI Presentation Pipeline: Content (Groq) → Art Direction (Gemini) → Composition (Gemini) → Assets → Render → QA.
// Mỗi tầng tự hạ cấp về luật khi không có key hoặc AI lỗi, nên luôn ra được deck; `stages` ghi lại tầng nào do ai làm.

const { buildContent } = require('./content');
const { buildDesign } = require('./artDirection');
const { buildComposition } = require('./composition');
const { refine } = require('./qa');
const { SCHEMA_VERSIONS } = require('./schema');
const { mix, isDark } = require('./color');

const AI_PROVIDERS = new Set(['groq', 'gemini']);

function cleanInput(raw = {}) {
  const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const count = Number(raw.slideCount);
  return {
    topic: text(raw.topic, 300),
    audience: text(raw.audience, 120),
    goal: text(raw.goal, 200),
    style: text(raw.style, 120),
    language: text(raw.language, 20),
    slideCount: Number.isFinite(count) ? Math.min(12, Math.max(5, Math.round(count))) : 8,
  };
}

// Theme PPTist cho studio + Design System gốc để các lần redesign sau dùng lại (không phải gọi Art Direction nữa)
function deckTheme(design, content) {
  const p = design.palette;
  return {
    backgroundColor: p.background,
    themeColors: [p.primary, p.secondary, p.accent, mix(p.primary, p.secondary, 0.5), p.text, p.muted],
    fontColor: p.text,
    fontName: design.typography.body,
    outline: { width: 2, color: p.muted, style: 'solid' },
    shadow: { h: 3, v: 3, blur: 2, color: '#808080' },
    mode: isDark(p.background) ? 'dark' : 'light',
    accent: p.primary,
    pickme: {
      specVersion: SCHEMA_VERSIONS.deck,
      design,
      brief: { title: content.title, audience: content.audience, goal: content.goal, tone: content.tone, language: content.language, storyline: content.storyline },
    },
  };
}

/**
 * @param {object} rawInput {topic, audience?, goal?, style?, language?, slideCount?}
 * @param {(pct: number, stage: string) => void} [onProgress]
 */
async function generatePresentation(rawInput, onProgress = () => {}) {
  const input = cleanInput(rawInput);
  if (!input.topic) throw new Error('Enter a topic');
  const warnings = [];

  onProgress(10, 'Planning the storyline');
  const c = await buildContent(input);
  warnings.push(...c.warnings);

  onProgress(35, 'Designing the visual identity');
  const d = await buildDesign(c.content, input);
  warnings.push(...d.warnings);

  onProgress(55, 'Composing slide layouts');
  const comp = await buildComposition(c.content, d.design);
  warnings.push(...comp.warnings);

  onProgress(78, 'Rendering and checking quality');
  const qa = await refine(c.content, d.design, comp.slides, { allowAi: true });

  const stages = { content: c.provider, design: d.provider, composition: comp.provider };
  const aiCalls = c.calls + d.calls + comp.calls + qa.aiCalls;
  const usedAi = Object.values(stages).some((p) => AI_PROVIDERS.has(p));
  if (warnings.length) console.warn('[slidePipeline]', warnings.join(' | '));

  onProgress(95, 'Saving the deck');
  return {
    title: c.content.title,
    slides: qa.slides,
    theme: deckTheme(d.design, c.content),
    source: usedAi ? 'ai' : 'template',
    stages,
    quality: { score: qa.score, issues: qa.report },
    aiCalls,
    warnings,
  };
}

module.exports = { generatePresentation, cleanInput, deckTheme };
