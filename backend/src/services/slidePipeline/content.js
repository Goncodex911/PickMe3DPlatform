// Tầng 1 – Content Intelligence (Groq). Phân tích chủ đề, audience, mục tiêu; dựng storyline và nội dung từng slide.
// Groq lỗi → Gemini viết thay; cả hai không có → khung nội dung dựng theo luật để deck vẫn ra được.

const { callJson, isAvailable } = require('./llm');
const { validateContent, INTENTS, SCHEMA_VERSIONS } = require('./schema');

const SYSTEM = `You are a senior presentation strategist. You plan the CONTENT of a deck, not its visual design.
Return one JSON object only:
{
 "title": string (<= 70 chars), "subtitle": string (<= 140 chars),
 "audience": string, "goal": string, "tone": string, "language": ISO code of the language you write in,
 "storyline": string (2-3 sentences: the narrative arc),
 "slides": [{
   "intent": one of ${INTENTS.join(' | ')},
   "title": string (<= 60 chars, a claim or a sharp label, not a generic word),
   "kicker": string (<= 24 chars, small eyebrow label, optional),
   "keyMessage": string (<= 160 chars, the one thing the audience must remember),
   "points": [{"heading": string (<= 40 chars), "detail": string (<= 140 chars), "value": string (<= 14 chars, a number/date/percent when the point is quantitative, else ""), "group": string}],
   "speakerNotes": string (<= 400 chars)
 }]
}
Rules:
- Write in the language of the user's topic (English if unclear). Never mix languages.
- First slide intent "cover", last slide intent "closing". Use "agenda" only for decks of 8+ slides.
- Vary intents: never the same intent on two consecutive slides; use quantitative intents (metrics, timeline, funnel) only when you can give plausible numbers or dates.
- points: 3-5 for most slides; swot needs exactly 4 points with group S, W, O, T; comparison needs points with group "A" or "B" (2-4 each) and heading of the first A/B point names the side; timeline/roadmap points use "value" for the date or phase; case needs 3 points (challenge, approach, result).
- Be concrete and specific to the topic; no filler like "Introduction" or "Lorem".`;

function userPrompt({ topic, audience, goal, slideCount, language }) {
  return [
    `Topic: ${topic}`,
    audience ? `Audience: ${audience}` : '',
    goal ? `Goal of the presentation: ${goal}` : '',
    `Number of slides: ${slideCount}`,
    language ? `Write in: ${language}` : '',
  ].filter(Boolean).join('\n');
}

// Khung nội dung dự phòng: đủ đa dạng ý đồ để tầng bố cục vẫn ra deck có nhịp
function ruleContent({ topic, slideCount }) {
  const name = String(topic).slice(0, 70);
  const plan = [
    { intent: 'cover', title: name, keyMessage: 'A focused overview for decision makers' },
    { intent: 'problem', title: 'Why this matters now', kicker: 'Context', keyMessage: `The landscape around ${name} is shifting quickly.`,
      points: [{ heading: 'Rising expectations', detail: 'Audiences expect faster, clearer, more personal experiences.' },
        { heading: 'Fragmented tools', detail: 'Teams juggle disconnected workflows and duplicated effort.' },
        { heading: 'Missed signals', detail: 'Valuable insight stays buried in scattered data.' }] },
    { intent: 'solution', title: 'Our approach', kicker: 'Solution', keyMessage: 'One coherent system instead of patchwork fixes.',
      points: [{ heading: 'Unify', detail: 'Bring people, data and decisions into one place.' },
        { heading: 'Automate', detail: 'Remove repetitive steps so teams focus on judgement.' },
        { heading: 'Measure', detail: 'Track outcomes continuously and adjust early.' }] },
    { intent: 'process', title: 'How it works', kicker: 'Process', keyMessage: 'A simple path from first step to measurable result.',
      points: [{ heading: 'Discover', detail: 'Map goals and constraints.' }, { heading: 'Design', detail: 'Shape the solution with users.' },
        { heading: 'Deliver', detail: 'Ship in small, safe increments.' }, { heading: 'Scale', detail: 'Expand what works.' }] },
    { intent: 'metrics', title: 'Expected impact', kicker: 'Impact', keyMessage: 'Targets we will track from day one.',
      points: [{ heading: 'Faster delivery', value: '40%' }, { heading: 'Cost reduction', value: '25%' }, { heading: 'Satisfaction', value: '4.8/5' }] },
    { intent: 'roadmap', title: 'Roadmap', kicker: 'Next 12 months', keyMessage: 'Phased rollout keeps risk low.',
      points: [{ heading: 'Pilot', value: 'Q1', detail: 'Validate with one team.' }, { heading: 'Expand', value: 'Q2', detail: 'Roll out to core teams.' },
        { heading: 'Optimise', value: 'Q3', detail: 'Tune with real data.' }, { heading: 'Scale', value: 'Q4', detail: 'Organisation-wide adoption.' }] },
    { intent: 'comparison', title: 'Before and after', kicker: 'Comparison', keyMessage: 'What changes for the people doing the work.',
      points: [{ heading: 'Today', detail: 'Manual hand-offs and slow approvals', group: 'A' }, { heading: 'Rework', detail: 'Errors found late', group: 'A' },
        { heading: 'With us', detail: 'Automated flow with clear owners', group: 'B' }, { heading: 'Quality', detail: 'Issues caught early', group: 'B' }] },
    { intent: 'features', title: 'What you get', kicker: 'Highlights', keyMessage: 'Capabilities that compound over time.',
      points: [{ heading: 'Clarity', detail: 'Shared dashboards for every team.' }, { heading: 'Speed', detail: 'Templates for common work.' },
        { heading: 'Control', detail: 'Roles and audit trail built in.' }, { heading: 'Support', detail: 'Guided onboarding.' }] },
    { intent: 'quote', title: 'Simplicity is the ultimate sophistication.', kicker: 'Principle', keyMessage: 'We design every step around it.' },
    { intent: 'swot', title: 'Strategic position', kicker: 'SWOT', keyMessage: 'Strengths to lean on, risks to manage.',
      points: [{ heading: 'Strengths', detail: 'Strong team and clear focus', group: 'S' }, { heading: 'Weaknesses', detail: 'Limited brand awareness', group: 'W' },
        { heading: 'Opportunities', detail: 'Growing demand in the segment', group: 'O' }, { heading: 'Threats', detail: 'Fast-moving competitors', group: 'T' }] },
  ];
  const body = plan.slice(1, Math.max(2, slideCount - 1));
  const slides = [plan[0], ...body, { intent: 'closing', title: 'Let’s build it together', keyMessage: 'Next step: agree on the pilot scope this week.',
    points: [{ heading: 'Align on goals' }, { heading: 'Pick a pilot team' }, { heading: 'Start in two weeks' }] }];
  return validateContent({ title: name, subtitle: 'Generated outline', language: 'en', slides }, { topic, minSlides: 3 }).value;
}

/**
 * @returns {Promise<{content: object, provider: 'groq'|'gemini'|'rules', calls: number, warnings: string[]}>}
 */
async function buildContent(input) {
  const opts = { topic: input.topic, minSlides: Math.min(5, input.slideCount), maxSlides: 12 };
  const validate = (raw) => validateContent(raw, opts);
  const warnings = [];
  let calls = 0;
  for (const provider of ['groq', 'gemini']) {
    if (!isAvailable(provider)) continue;
    try {
      const res = await callJson({ provider, system: SYSTEM, user: userPrompt(input), validate, maxTokens: 5000, temperature: 0.7 });
      return { content: res.value, provider, model: res.model, calls: calls + res.calls, warnings };
    } catch (err) {
      calls += err.calls || 1;
      warnings.push(`content/${provider}: ${err.message}`);
    }
  }
  return { content: ruleContent(input), provider: 'rules', calls, warnings };
}

module.exports = { buildContent, ruleContent, CONTENT_VERSION: SCHEMA_VERSIONS.content };
