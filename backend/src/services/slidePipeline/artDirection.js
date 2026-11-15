// Tầng 2 – Art Direction (Gemini). Từ nội dung đã có, dựng một Design System thống nhất cho cả deck:
// bảng màu, gradient, typography, bo góc/đổ bóng, hoạ tiết nền và triết lý animation.
// Không có Gemini → chọn một preset đã tinh chỉnh theo chủ đề. Mọi bảng màu đều qua bước cân chỉnh tương phản.

const { callJson, isAvailable } = require('./llm');
const { validateDesign, FONTS, ENTRANCES, TRANSITIONS, SCHEMA_VERSIONS } = require('./schema');
const { readable, contrast, isDark, mix, bestText } = require('./color');

const PRESETS = [
  {
    name: 'Midnight Aurora', mood: 'Confident, futuristic, premium tech',
    palette: { background: '#0b1020', surface: '#141b33', primary: '#7c5cff', secondary: '#22d3ee', accent: '#f472b6', text: '#f5f7ff', muted: '#a3acc9', onPrimary: '#ffffff' },
    gradients: { hero: { type: 'linear', angle: 135, colors: ['#0b1020', '#2a1b6b', '#0e7490'] }, accent: { type: 'linear', angle: 120, colors: ['#7c5cff', '#22d3ee'] } },
    typography: { heading: 'Montserrat', body: 'Inter', headingWeight: 'bold', headingCase: 'none', scale: 'dramatic' },
    shape: { radius: 18, shadow: true }, decoration: 'orbs', backgroundStyle: 'mixed',
    animation: { philosophy: 'dynamic', entrance: 'fadeInUp', transition: 'fade', maxPerSlide: 5 },
  },
  {
    name: 'Editorial Paper', mood: 'Calm, editorial, trustworthy',
    palette: { background: '#f6f1e8', surface: '#ffffff', primary: '#1f2a44', secondary: '#c2410c', accent: '#b45309', text: '#1b140f', muted: '#6d645c', onPrimary: '#ffffff' },
    gradients: { hero: { type: 'linear', angle: 160, colors: ['#f6f1e8', '#efe4d2'] }, accent: { type: 'linear', angle: 90, colors: ['#1f2a44', '#3b4a6b'] } },
    typography: { heading: 'Playfair Display', body: 'Lato', headingWeight: 'bold', headingCase: 'none', scale: 'balanced' },
    shape: { radius: 4, shadow: false }, decoration: 'lines', backgroundStyle: 'solid',
    animation: { philosophy: 'calm', entrance: 'fadeIn', transition: 'fade', maxPerSlide: 4 },
  },
  {
    name: 'Ocean Clarity', mood: 'Clean, analytical, optimistic',
    palette: { background: '#f4f8fb', surface: '#ffffff', primary: '#0b5ed7', secondary: '#14b8a6', accent: '#f59e0b', text: '#0f172a', muted: '#55657e', onPrimary: '#ffffff' },
    gradients: { hero: { type: 'linear', angle: 135, colors: ['#0b5ed7', '#14b8a6'] }, accent: { type: 'linear', angle: 135, colors: ['#0b5ed7', '#3b82f6'] } },
    typography: { heading: 'Plus Jakarta Sans', body: 'Inter', headingWeight: 'bold', headingCase: 'none', scale: 'balanced' },
    shape: { radius: 14, shadow: true }, decoration: 'grid', backgroundStyle: 'mixed',
    animation: { philosophy: 'calm', entrance: 'fadeInUp', transition: 'slideX', maxPerSlide: 4 },
  },
  {
    name: 'Sunset Bold', mood: 'Energetic, bold, creative',
    palette: { background: '#1a0f14', surface: '#2a1720', primary: '#ff5a36', secondary: '#ffb020', accent: '#ff3d81', text: '#fff5ef', muted: '#d5b6a8', onPrimary: '#ffffff' },
    gradients: { hero: { type: 'linear', angle: 140, colors: ['#ff3d81', '#ff5a36', '#ffb020'] }, accent: { type: 'linear', angle: 90, colors: ['#ff5a36', '#ffb020'] } },
    typography: { heading: 'Montserrat', body: 'Lato', headingWeight: 'bold', headingCase: 'upper', scale: 'dramatic' },
    shape: { radius: 24, shadow: true }, decoration: 'corner', backgroundStyle: 'mixed',
    animation: { philosophy: 'dynamic', entrance: 'zoomIn', transition: 'scale', maxPerSlide: 5 },
  },
  {
    name: 'Forest Calm', mood: 'Grounded, sustainable, human',
    palette: { background: '#f3f5ef', surface: '#ffffff', primary: '#1f5f4a', secondary: '#8fb339', accent: '#d97706', text: '#16231d', muted: '#5b6b62', onPrimary: '#ffffff' },
    gradients: { hero: { type: 'linear', angle: 150, colors: ['#1f5f4a', '#3f8f5f'] }, accent: { type: 'linear', angle: 90, colors: ['#1f5f4a', '#8fb339'] } },
    typography: { heading: 'Merriweather', body: 'OpenSans', headingWeight: 'bold', headingCase: 'none', scale: 'balanced' },
    shape: { radius: 10, shadow: false }, decoration: 'orbs', backgroundStyle: 'solid',
    animation: { philosophy: 'calm', entrance: 'fadeInUp', transition: 'fade', maxPerSlide: 4 },
  },
  {
    name: 'Mono Luxe', mood: 'Minimal, luxurious, fashion',
    palette: { background: '#131313', surface: '#1e1e1e', primary: '#e8d5b5', secondary: '#9a8f80', accent: '#c9a96e', text: '#f4f1ec', muted: '#a8a29a', onPrimary: '#131313' },
    gradients: { hero: { type: 'radial', angle: 0, colors: ['#2a2622', '#131313'] }, accent: { type: 'linear', angle: 90, colors: ['#c9a96e', '#e8d5b5'] } },
    typography: { heading: 'Playfair Display', body: 'Montserrat', headingWeight: 'normal', headingCase: 'none', scale: 'dramatic' },
    shape: { radius: 0, shadow: false }, decoration: 'lines', backgroundStyle: 'mixed',
    animation: { philosophy: 'minimal', entrance: 'fadeIn', transition: 'fade', maxPerSlide: 3 },
  },
];

const KEYWORDS = [
  [/(\bai\b|tech|software|data|cloud|cyber|robot|crypto|blockchain|saas|công nghệ|dữ liệu|phần mềm)/i, 0],
  [/(report|research|education|history|policy|law|báo cáo|nghiên cứu|giáo dục|luận)/i, 1],
  [/(finance|bank|health|medical|analytics|market|tài chính|ngân hàng|y tế|sức khỏe|thị trường)/i, 2],
  [/(marketing|brand|creative|music|event|startup|pitch|sự kiện|thương hiệu|âm nhạc)/i, 3],
  [/(green|climate|food|agri|travel|eco|sustain|môi trường|nông|du lịch|thực phẩm)/i, 4],
  [/(fashion|luxury|beauty|art|interior|lookbook|thời trang|nội thất|nghệ thuật|làm đẹp)/i, 5],
];

function hash(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function presetFor(topic) {
  const hit = KEYWORDS.find(([re]) => re.test(topic));
  const base = PRESETS[hit ? hit[1] : hash(topic) % PRESETS.length];
  return { version: SCHEMA_VERSIONS.design, ...JSON.parse(JSON.stringify(base)) };
}

// Cân chỉnh bảng màu: chữ đọc được trên nền và surface, chữ trên nút primary đủ tương phản, muted không chìm
function harmonize(design) {
  const p = { ...design.palette };
  p.text = readable(p.text, p.background, 7);
  if (contrast(p.text, p.surface) < 4.5) p.surface = mix(p.surface, p.background, 0.6);
  p.text = readable(p.text, p.surface, 4.5);
  p.muted = readable(p.muted, p.background, 4.5);
  p.muted = readable(p.muted, p.surface, 4);
  p.onPrimary = readable(p.onPrimary, p.primary, 4.5);
  // Trắng/đen cũng không đủ tương phản (primary tầm trung): chỉnh chính màu primary
  if (contrast(p.onPrimary, p.primary) < 4.5) p.primary = fitGradient({ colors: [p.primary] }, p.onPrimary).colors[0];
  // Màu nhấn quá gần màu nền thì không thấy: kéo về phía primary
  if (contrast(p.accent, p.background) < 2) p.accent = p.primary;
  if (contrast(p.secondary, p.background) < 2) p.secondary = mix(p.secondary, isDark(p.background) ? '#ffffff' : '#000000', 0.35);
  const heroText = bestText(design.gradients.hero.colors, [p.onPrimary, p.text]);
  return { ...design, palette: p, gradients: { hero: fitGradient(design.gradients.hero, heroText), accent: fitGradient(design.gradients.accent, p.onPrimary) } };
}

// Chữ onPrimary đặt trên gradient: đẩy từng điểm màu về phía ngược với màu chữ cho tới khi đạt 4.5:1
function fitGradient(g, textColor) {
  const away = isDark(textColor) ? '#ffffff' : '#000000';
  const colors = g.colors.map((c) => {
    let out = c;
    for (let t = 0.1; contrast(textColor, out) < 4.5 && t <= 1.001; t += 0.1) out = mix(c, away, t);
    return out;
  });
  return { ...g, colors };
}

const SYSTEM = `You are an art director for premium keynote presentations. Design ONE coherent visual identity for the whole deck.
Return one JSON object only:
{
 "name": string, "mood": string (<= 120 chars),
 "palette": {"background": hex, "surface": hex, "primary": hex, "secondary": hex, "accent": hex, "text": hex, "muted": hex, "onPrimary": hex},
 "gradients": {"hero": {"type": "linear"|"radial", "angle": 0-360, "colors": [2-3 hex]}, "accent": {"type": "linear", "angle": 0-360, "colors": [2 hex]}},
 "typography": {"heading": one of ${FONTS.join(' | ')}, "body": one of ${FONTS.join(' | ')}, "headingWeight": "bold"|"normal", "headingCase": "none"|"upper", "scale": "compact"|"balanced"|"dramatic"},
 "shape": {"radius": 0-28, "shadow": boolean},
 "decoration": "none"|"orbs"|"grid"|"lines"|"corner",
 "backgroundStyle": "solid"|"gradient"|"mixed",
 "animation": {"philosophy": "minimal"|"calm"|"dynamic", "entrance": one of ${ENTRANCES.join(' | ')}, "transition": one of ${TRANSITIONS.join(' | ')}, "maxPerSlide": 0-6}
}
Rules:
- Colors are 6-digit hex. text must be clearly readable on background and surface (WCAG AA); onPrimary readable on primary.
- Palette must fit the topic, audience and tone; avoid generic blue-on-white unless it truly fits. At most 3 saturated hues.
- Heading and body fonts should pair well (contrast of serif/sans or weight); both support Vietnamese.
- Animation must serve clarity: business/serious tone → "calm" or "minimal"; launch/creative → "dynamic".`;

/**
 * @returns {Promise<{design: object, provider: 'gemini'|'rules', calls: number, warnings: string[]}>}
 */
async function buildDesign(content, input) {
  const fallback = presetFor(`${input.topic} ${content.tone || ''}`);
  const warnings = [];
  if (input.design) return { design: harmonize(validateDesign(input.design, fallback).value), provider: 'reuse', calls: 0, warnings };
  if (!isAvailable('gemini')) return { design: harmonize(fallback), provider: 'rules', calls: 0, warnings };
  const brief = {
    title: content.title,
    audience: content.audience || input.audience,
    goal: content.goal || input.goal,
    tone: content.tone,
    storyline: content.storyline,
    slideTitles: content.slides.map((s) => s.title),
    stylePreference: input.style || '',
  };
  try {
    const res = await callJson({
      provider: 'gemini',
      system: SYSTEM,
      user: `Presentation brief:\n${JSON.stringify(brief)}`,
      validate: (raw) => validateDesign(raw, fallback),
      maxTokens: 1500,
      temperature: 0.9,
    });
    return { design: harmonize(res.value), provider: 'gemini', model: res.model, calls: res.calls, warnings };
  } catch (err) {
    warnings.push(`design/gemini: ${err.message}`);
    return { design: harmonize(fallback), provider: 'rules', calls: err.calls || 1, warnings };
  }
}

module.exports = { buildDesign, presetFor, harmonize, PRESETS };
