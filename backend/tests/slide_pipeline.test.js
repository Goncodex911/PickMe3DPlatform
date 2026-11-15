const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { validateContent, validateDesign, validateSlideComposition, LAYOUTS } = require('../src/services/slidePipeline/schema');
const { PRESETS, harmonize, presetFor } = require('../src/services/slidePipeline/artDirection');
const { renderSlide } = require('../src/services/slidePipeline/render');
const { ruleContent } = require('../src/services/slidePipeline/content');
const { ruleComposition } = require('../src/services/slidePipeline/composition');
const { refine, inspect } = require('../src/services/slidePipeline/qa');
const { callJson } = require('../src/services/slidePipeline/llm');
const { generatePresentation } = require('../src/services/slidePipeline');
const { contrast } = require('../src/services/slidePipeline/color');
const presentation = require('../src/controllers/presentationController');
const jobQueue = require('../src/services/blueprintJobQueue');
const billing = require('../src/services/billingStore');

const ENV_KEYS = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'SLIDE_AI_DISABLED', 'SLIDE_CONTENT_MODEL', 'SLIDE_CONTENT_FALLBACK_MODELS', 'SLIDE_DESIGN_MODEL', 'GEMINI_FALLBACK_MODELS'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const realFetch = global.fetch;
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  global.fetch = realFetch;
});

function noAi() {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
}

function chatResponse(obj, status = 200) {
  const body = status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }) : 'busy';
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
}

// Nội dung mẫu đủ dữ liệu cho mọi layout
const SAMPLE_ITEMS = {
  hero: [],
  statement: [],
  agenda: ['Market context', 'Our solution', 'Business model', 'Roadmap', 'The ask'].map((heading) => ({ heading, detail: '', value: '', group: '' })),
  infographic: [1, 2, 3, 4].map((i) => ({ heading: `Driver ${i}`, detail: 'Customers expect faster answers across every channel they use.', value: '', group: '' })),
  timeline: ['2021', '2022', '2023', '2024', '2025'].map((value, i) => ({ heading: `Milestone ${i + 1}`, detail: 'Launched in two new markets with local partners.', value, group: '' })),
  comparison: [
    { heading: 'Today', detail: 'Manual reporting every Friday', value: '', group: 'A' },
    { heading: 'Errors', detail: 'Found late by customers', value: '', group: 'A' },
    { heading: 'With PickMe', detail: 'Live dashboards for every team', value: '', group: 'B' },
    { heading: 'Quality', detail: 'Issues caught before release', value: '', group: 'B' },
  ],
  dashboard: [{ heading: 'Revenue', value: '$2.4M' }, { heading: 'Growth', value: '38%' }, { heading: 'NPS', value: '62' }].map((x) => ({ ...x, detail: '', group: '' })),
  'process-flow': ['Discover', 'Design', 'Build', 'Launch'].map((heading) => ({ heading, detail: 'Short description of the step and its outcome.', value: '', group: '' })),
  'big-number': [{ heading: 'Hours saved per week', detail: 'Across 40 pilot teams', value: '12,000', group: '' }],
  'case-study': [
    { heading: 'Challenge', detail: 'Store traffic fell 20% while online orders were slow to ship.', value: '', group: '' },
    { heading: 'Approach', detail: 'Unified inventory and same-day pickup in 30 stores.', value: '', group: '' },
    { heading: 'Result', detail: 'Faster delivery and higher basket size within one quarter.', value: '+27%', group: '' },
  ],
  roadmap: ['Pilot', 'Expand', 'Optimise', 'Scale'].map((heading, i) => ({ heading, detail: 'Roll out to the next group of teams.', value: `Q${i + 1}`, group: '' })),
  pyramid: ['Vision', 'Strategy', 'Programs', 'Daily work'].map((heading) => ({ heading, detail: 'What this level decides and owns.', value: '', group: '' })),
  funnel: ['Visitors', 'Leads', 'Trials', 'Customers'].map((heading, i) => ({ heading, detail: 'Conversion driven by onboarding emails.', value: `${100 / 2 ** i}k`, group: '' })),
  swot: ['S', 'W', 'O', 'T'].map((group) => ({ heading: { S: 'Strengths', W: 'Weaknesses', O: 'Opportunities', T: 'Threats' }[group], detail: 'Two or three concise observations for this quadrant.', value: '', group })),
  architecture: ['Experience layer', 'Services', 'Data platform', 'Infrastructure'].map((heading) => ({ heading, detail: 'Components and responsibilities of this layer.', value: '', group: '' })),
  'cards-grid': [1, 2, 3, 4, 5, 6].map((i) => ({ heading: `Feature ${i}`, detail: 'One sentence that explains the benefit to the customer.', value: '', group: '' })),
  closing: [{ heading: 'Book a demo' }, { heading: 'Start a pilot' }].map((x) => ({ ...x, detail: '', value: '', group: '' })),
};

function sampleComp(layout, background = 'base') {
  return validateSlideComposition({
    layout,
    background,
    kicker: 'Section',
    title: 'A clear and specific slide title',
    subtitle: 'The one message the audience should remember from this slide.',
    items: SAMPLE_ITEMS[layout],
    chart: layout === 'dashboard' ? { type: 'line', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [1.2, 1.6, 2.1, 2.4], unit: '$M', legend: 'Revenue' } : null,
    emphasis: 1,
    animation: 'build',
  }, { title: 'x', keyMessage: '', kicker: '', points: [], speakerNotes: 'Notes' }).value;
}

test('content validator cleans AI output and forces cover/closing intents', () => {
  const raw = {
    title: '  Deck  ',
    slides: [
      { intent: 'problem', title: 'Start', points: ['a', { heading: 'b', detail: 'x'.repeat(500) }, null] },
      { intent: 'nope', title: 'Middle' },
      { title: '' },
      { intent: 'metrics', title: 'End' },
    ],
  };
  const { value, errors } = validateContent(raw, { minSlides: 3 });
  assert.equal(value.title, 'Deck');
  assert.deepEqual(value.slides.map((s) => s.intent), ['cover', 'statement', 'closing']);
  assert.equal(value.slides[0].points.length, 2);
  assert.equal(value.slides[0].points[1].detail.length, 220);
  assert.match(errors.join(), /title missing/);
});

test('design validator rejects bad colors/fonts and falls back per field', () => {
  const fallback = presetFor('tech');
  const { value, ok, errors } = validateDesign({
    palette: { ...fallback.palette, primary: 'red', text: '#FFF' },
    typography: { heading: 'Comic Sans', body: 'Inter' },
    animation: { entrance: 'explode', maxPerSlide: 99 },
  }, fallback);
  assert.equal(ok, false);
  assert.match(errors.join(), /palette.primary/);
  assert.equal(value.palette.primary, fallback.palette.primary);
  assert.equal(value.palette.text, '#ffffff');
  assert.equal(value.typography.heading, fallback.typography.heading);
  assert.equal(value.animation.entrance, fallback.animation.entrance);
  assert.equal(value.animation.maxPerSlide, 6);
});

test('harmonize keeps text readable on every palette and gradient stop', () => {
  for (const preset of PRESETS) {
    const d = harmonize(presetFor(preset.name));
    const ugly = harmonize({ ...d, palette: { ...d.palette, text: d.palette.background, onPrimary: d.palette.primary } });
    for (const design of [d, ugly]) {
      assert.ok(contrast(design.palette.text, design.palette.background) >= 4.5, `${preset.name} text`);
      assert.ok(contrast(design.palette.onPrimary, design.palette.primary) >= 4.5, `${preset.name} onPrimary`);
      for (const stop of design.gradients.accent.colors) assert.ok(contrast(design.palette.onPrimary, stop) >= 4.5, `${preset.name} accent stop`);
    }
  }
});

test('every layout renders inside the canvas without overflow or low contrast on every preset', () => {
  for (const preset of PRESETS) {
    const design = harmonize(JSON.parse(JSON.stringify(preset)));
    for (const layout of LAYOUTS) {
      for (const background of ['base', 'gradient']) {
        const comp = sampleComp(layout, background);
        const out = renderSlide(comp, { index: 3, total: 10, design });
        const label = `${preset.name}/${layout}/${background}`;
        const problems = inspect([out], [comp]).filter((p) => p.type !== 'text-shrunk');
        assert.deepEqual(problems, [], label);
        assert.ok(out.slide.elements.length >= 2, `${label} has elements`);
        for (const el of out.slide.elements) {
          if (el.lock) continue; // hoạ tiết được phép tràn mép
          assert.ok(el.left >= -1 && el.left + el.width <= 1001, `${label} ${el.type} x ${el.left}+${el.width}`);
          if (el.type !== 'line') assert.ok(el.top >= -1 && el.top + el.height <= 563, `${label} ${el.type} y ${el.top}+${el.height}`);
          if (el.type === 'text') assert.doesNotMatch(el.content, /<script|on\w+=/i);
        }
        const ids = new Set(out.slide.elements.map((e) => e.id));
        for (const a of out.slide.animations) assert.ok(ids.has(a.elId), `${label} animation target`);
        assert.ok(out.slide.animations.length <= out.slide.elements.length);
        assert.equal(out.slide.pickme.layout, layout);
      }
    }
  }
});

test('text from AI is escaped, never injected as HTML', () => {
  const design = harmonize(presetFor('tech'));
  const comp = sampleComp('statement');
  comp.title = '<img src=x onerror=alert(1)> & "quotes"';
  const out = renderSlide(comp, { index: 1, total: 3, design });
  const title = out.slide.elements.find((e) => e.textType === 'title');
  assert.match(title.content, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quotes&quot;/);
});

test('QA fixes misfit and duplicate layouts and keeps animation in check', async () => {
  noAi();
  const content = ruleContent({ topic: 'QA check', slideCount: 8 });
  const design = harmonize(presetFor('tech'));
  const comps = ruleComposition(content, design);
  comps[2].layout = comps[1].layout; // lặp layout liền kề
  comps[3].layout = 'swot'; // không đủ 4 mục nhóm SWOT
  comps[3].items = comps[3].items.slice(0, 2);
  comps.forEach((c) => { c.animation = 'build'; });
  const res = await refine(content, design, comps, { allowAi: false });
  const layouts = res.slides.map((s) => s.pickme.layout);
  for (let i = 1; i < layouts.length; i += 1) assert.notEqual(layouts[i], layouts[i - 1], `slide ${i}`);
  assert.notEqual(layouts[3], 'swot');
  assert.ok(res.report.some((r) => r.type === 'layout-duplicate'));
  assert.ok(res.report.some((r) => r.type === 'layout-misfit'));
  assert.ok(res.comps.filter((c) => c.animation === 'build').length <= Math.ceil(comps.length / 2));
});

test('rules-only pipeline still produces a varied, valid deck and is not charged as AI', async () => {
  noAi();
  const deck = await generatePresentation({ topic: 'Kế hoạch marketing quý 3', slideCount: 10 });
  assert.equal(deck.source, 'template');
  assert.deepEqual(deck.stages, { content: 'rules', design: 'rules', composition: 'rules' });
  assert.equal(deck.aiCalls, 0);
  assert.equal(deck.slides.length, 10);
  assert.equal(deck.slides[0].pickme.layout, 'hero');
  assert.equal(deck.slides.at(-1).pickme.layout, 'closing');
  assert.ok(new Set(deck.slides.map((s) => s.pickme.layout)).size >= 7);
  assert.equal(deck.theme.pickme.specVersion, 'deck@1');
  assert.ok(Array.isArray(deck.theme.themeColors));
  assert.ok(deck.quality.score >= 80, `score ${deck.quality.score}`);
});

test('callJson falls back to the next model on 429 and repairs invalid JSON', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  process.env.SLIDE_CONTENT_MODEL = 'model-a';
  process.env.SLIDE_CONTENT_FALLBACK_MODELS = 'model-b';
  const seen = [];
  global.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    seen.push({ model: body.model, turns: body.messages.length });
    if (body.model === 'model-a') return chatResponse(null, 429);
    if (body.messages.length === 2) return chatResponse({ answer: 'wrong' });
    return chatResponse({ answer: 42 });
  };
  const res = await callJson({
    provider: 'groq',
    system: 's',
    user: 'u',
    validate: (raw) => (typeof raw.answer === 'number' ? { ok: true, value: raw.answer } : { ok: false, errors: ['answer must be a number'] }),
  });
  assert.equal(res.value, 42);
  assert.equal(res.model, 'model-b');
  assert.deepEqual(seen.map((s) => s.model), ['model-a', 'model-b', 'model-b']);
  assert.equal(seen[2].turns, 4);
});

test('full pipeline uses Groq for content and Gemini for design and composition', async () => {
  process.env.GROQ_API_KEY = 'g';
  process.env.GEMINI_API_KEY = 'm';
  process.env.GEMINI_FALLBACK_MODELS = 'gemini-test';
  const calls = [];
  global.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const system = body.messages[0].content;
    if (String(url).includes('groq')) {
      calls.push('groq');
      return chatResponse({
        title: 'Launch plan', language: 'en', tone: 'confident',
        slides: [
          { intent: 'cover', title: 'Launch plan' },
          { intent: 'metrics', title: 'Traction', points: SAMPLE_ITEMS.dashboard },
          { intent: 'process', title: 'How we launch', points: SAMPLE_ITEMS['process-flow'] },
          { intent: 'swot', title: 'Position', points: SAMPLE_ITEMS.swot },
          { intent: 'closing', title: 'Next steps', points: SAMPLE_ITEMS.closing },
        ],
      });
    }
    if (system.includes('art director')) {
      calls.push('design');
      return chatResponse({ ...PRESETS[3], name: 'Custom Neon' });
    }
    calls.push('composition');
    return chatResponse({
      slides: [
        { index: 0, layout: 'hero', background: 'gradient' },
        { index: 1, layout: 'dashboard', chart: { type: 'column', labels: ['Jan', 'Feb', 'Mar'], values: [1, 2, 3] } },
        { index: 2, layout: 'process-flow' },
        { index: 3, layout: 'swot' },
        { index: 4, layout: 'closing', background: 'accent' },
      ],
    });
  };
  const deck = await generatePresentation({ topic: 'Launch plan', slideCount: 5 });
  assert.deepEqual(deck.stages, { content: 'groq', design: 'gemini', composition: 'gemini' });
  assert.equal(deck.source, 'ai');
  assert.deepEqual(calls, ['groq', 'design', 'composition']);
  assert.equal(deck.theme.pickme.design.name, 'Custom Neon');
  assert.deepEqual(deck.slides.map((s) => s.pickme.layout), ['hero', 'dashboard', 'process-flow', 'swot', 'closing']);
  assert.ok(deck.slides[1].elements.some((e) => e.type === 'chart'));
});

test('generate endpoint answers 202 and the owner can poll the finished job', async () => {
  noAi();
  const before = billing.memory.presentations.size;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await presentation.generate({ body: { topic: 'Quarterly review', slideCount: 6 }, user: { id: 'u-slide', name: 'Tester' } }, res);
  assert.equal(res.statusCode, 202);
  const { jobId } = res.body;
  await new Promise((resolve, reject) => {
    const job = jobQueue.getJob(jobId);
    if (job.status === 'completed') return resolve();
    jobQueue.once(`completed:${jobId}`, resolve);
    jobQueue.once(`failed:${jobId}`, (j) => reject(new Error(j.error)));
  });
  const poll = { ...res, statusCode: 200, body: null };
  presentation.job({ params: { jobId }, user: { id: 'u-slide' } }, poll);
  assert.equal(poll.body.data.status, 'completed');
  assert.equal(poll.body.data.result.source, 'template');
  assert.equal(billing.memory.presentations.size, before + 1);
  const deck = await billing.getDeck(poll.body.data.result.deckId);
  assert.equal(deck.slides.length, 6);

  const other = { ...res, statusCode: 200, body: null };
  presentation.job({ params: { jobId }, user: { id: 'someone-else' } }, other);
  assert.equal(other.statusCode, 404);
});
