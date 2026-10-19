// Sinh deck cho Slide Studio bằng AI (endpoint kiểu OpenAI chat completions).
// Có nhiều nhà cung cấp: Gemini, Groq, Pollinations. Bên đang dùng báo hết lượt / sai key / lỗi thì tự chuyển
// sang bên kế tiếp và báo lại cho người dùng; tất cả đều hỏng mới dùng bộ mẫu dựng sẵn.

const LAYOUTS = ['title', 'pitch', 'lookbook', 'case-study', 'portfolio', 'quote', 'two-column', 'closing'];

const AI_TIMEOUT = () => Number(process.env.SLIDE_AI_TIMEOUT_MS) || 60000;
// Model có suy luận tiêu nhiều token trước khi trả lời: để rộng kẻo JSON bị cắt
const AI_MAX_TOKENS = () => Number(process.env.SLIDE_AI_MAX_TOKENS) || 3000;

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: () => process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    serverKey: () => process.env.GEMINI_API_KEY || '',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  groq: {
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    serverKey: () => process.env.GROQ_API_KEY || '',
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
  },
  pollinations: {
    label: 'Pollinations',
    url: 'https://text.pollinations.ai/openai',
    // Pollinations ẩn danh hiện chỉ mở model openai-fast
    model: () => process.env.POLLINATIONS_MODEL || 'openai-fast',
    serverKey: () => '',
    needsKey: false,
    keyUrl: '',
  },
};
const ORDER = ['gemini', 'groq', 'pollinations'];

// Cấu hình cũ SLIDE_AI_URL / SLIDE_AI_MODEL / SLIDE_AI_KEY vẫn dùng được: nhận ra nhà cung cấp theo URL
function legacyProvider() {
  const url = process.env.SLIDE_AI_URL || '';
  if (!url) return null;
  const id = url.includes('googleapis.com') ? 'gemini' : url.includes('groq.com') ? 'groq' : url.includes('pollinations.ai') ? 'pollinations' : 'custom';
  return { id, url, model: process.env.SLIDE_AI_MODEL || '', key: process.env.SLIDE_AI_KEY || '' };
}

// Cấu hình chạy được của một nhà cung cấp (key người dùng nhập ưu tiên hơn key của server)
function resolve(id, userKey = '') {
  const legacy = legacyProvider();
  if (legacy && legacy.id === id) {
    const base = PROVIDERS[id];
    return {
      id,
      label: base ? base.label : 'Custom',
      url: legacy.url,
      model: legacy.model || (base ? base.model() : ''),
      key: userKey || legacy.key,
      needsKey: base ? base.needsKey : false,
      ownKey: Boolean(userKey),
    };
  }
  const p = PROVIDERS[id];
  if (!p) return null;
  return { id, label: p.label, url: p.url, model: p.model(), key: userKey || p.serverKey(), needsKey: p.needsKey, ownKey: Boolean(userKey) };
}

function usable(cfg) {
  return Boolean(cfg && (!cfg.needsKey || cfg.key));
}

// Danh sách cho dropdown phía người dùng (không bao giờ trả key)
function listProviders() {
  const legacy = legacyProvider();
  const rows = ORDER.map((id) => {
    const cfg = resolve(id);
    return { id, label: cfg.label, model: cfg.model, needsKey: cfg.needsKey, hasServerKey: usable(cfg), keyUrl: PROVIDERS[id].keyUrl };
  });
  if (legacy && legacy.id === 'custom') rows.push({ id: 'custom', label: 'Custom', model: legacy.model, needsKey: false, hasServerKey: true, keyUrl: '' });
  return { primary: primaryId(), providers: rows };
}

function primaryId() {
  const legacy = legacyProvider();
  return legacy ? legacy.id : ORDER.find((id) => usable(resolve(id))) || 'pollinations';
}

// Thứ tự thử: bên người dùng chọn (hoặc bên chính của server) trước, rồi các bên còn lại chạy được
function chain(preferred, userKey) {
  const known = preferred && (PROVIDERS[preferred] || preferred === 'custom');
  const first = known ? preferred : primaryId();
  const ids = [first, ...ORDER.filter((id) => id !== first)];
  return ids
    .map((id) => resolve(id, id === first ? userKey : ''))
    .filter((cfg, i) => cfg && (i === 0 || usable(cfg)));
}

// Giao diện đơn sắc theo trang chủ: slide mực xen slide giấy cho nhịp lookbook
const INK = { bg: '#131313', titleColor: '#ffffff', bodyColor: '#adadad' };
const PAPER = { bg: '#f4f1ec', titleColor: '#131313', bodyColor: '#626262' };
const PAPER_LAYOUTS = new Set(['lookbook', 'quote', 'two-column']);

function styled(layout, title, body, index) {
  const tone = PAPER_LAYOUTS.has(layout) ? PAPER : INK;
  return {
    id: `s-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    layout,
    title,
    body,
    ...tone,
    titleFont: 'Roboto',
    bodyFont: 'Roboto',
    titleBold: true,
    titleItalic: layout === 'quote',
    titleSize: layout === 'title' ? 54 : layout === 'quote' ? 42 : 40,
    bodySize: 20,
  };
}

function cleanTopic(topic) {
  return String(topic || 'New collection').trim().slice(0, 80) || 'New collection';
}

// Bộ mẫu dựng sẵn khi AI không trả lời được
function templateDeck(topic) {
  const name = cleanTopic(topic);
  const items = [
    ['title', name, 'A pitch deck made with PickMe3D'],
    ['pitch', 'Why customers choose it', `Three touchpoints of ${name}: fabric, cut and brand story.`],
    ['lookbook', 'Lookbook', 'The key image of the collection, with a short caption.'],
    ['case-study', 'Case study', 'Before this design, the product page lacked rhythm. After rebuilding it on the canvas, shoppers stayed longer.'],
    ['quote', 'From the designer', `“${name} is where craft meets light.”`],
    ['closing', 'Next steps', 'Book a sample viewing or open the 3D storefront to pick styles online.'],
  ];
  return {
    title: name,
    theme: { mode: 'dark', accent: '#131313' },
    slides: items.map(([layout, title, body], i) => styled(layout, title, body, i)),
    source: 'template',
  };
}

const SYSTEM_PROMPT = `You are an editor of lookbooks and pitch decks for fashion brands.
Return a single JSON object only, no explanation, no markdown.
Format: {"title": string, "slides": [{"layout": string, "title": string, "body": string}]}
- 6 to 8 slides, written in the same language as the topic (English if unclear).
- layout must be one of: ${LAYOUTS.join(', ')}.
  title: cover; pitch: one key idea; lookbook: one look with fabric and silhouette; case-study: figures or results;
  portfolio: several products; quote: one short quote; two-column: compare two ideas; closing: wrap-up and next steps.
- The first slide is title, the last slide is closing.
- title at most 60 characters; body at most 220 characters, line breaks allowed with \\n.`;

// Lấy đối tượng JSON đầu tiên trong câu trả lời (AI hay bọc trong \`\`\`json ... \`\`\`)
function extractJson(text) {
  const raw = String(text || '');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0) throw new Error('AI did not return JSON');
  try {
    return JSON.parse(body.slice(start, end + 1).replace(/\r?\n/g, ' '));
  } catch {
    return salvage(body.slice(start));
  }
}

// JSON bị cắt giữa chừng: giữ lại tiêu đề và các slide đã viết trọn
function salvage(text) {
  const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
  const title = text.match(new RegExp(String.raw`"title"\s*:\s*` + STR));
  const slides = [];
  const re = new RegExp(String.raw`\{\s*"layout"\s*:\s*` + STR + String.raw`\s*,\s*"title"\s*:\s*` + STR + String.raw`\s*,\s*"body"\s*:\s*` + STR + String.raw`\s*\}`, 'g');
  let m;
  while ((m = re.exec(text))) {
    // AI hay để xuống dòng thật trong chuỗi (JSON không cho phép): đổi về \n trước khi giải mã
    const unescape = (v) => {
      try {
        return JSON.parse(`"${v.replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, ' ')}"`);
      } catch {
        return v;
      }
    };
    slides.push({ layout: unescape(m[1]), title: unescape(m[2]), body: unescape(m[3]) });
  }
  if (!slides.length) throw new Error('AI did not return JSON');
  return { title: title ? title[1].replace(/\\"/g, '"') : '', slides };
}

function normalize(data, topic) {
  const name = cleanTopic(topic);
  const list = Array.isArray(data?.slides) ? data.slides : [];
  const slides = list
    .filter((item) => item && (item.title || item.body))
    .slice(0, 12)
    .map((item, i) => {
      const layout = LAYOUTS.includes(item.layout) ? item.layout : i === 0 ? 'title' : 'pitch';
      return styled(layout, String(item.title || '').slice(0, 90), String(item.body || '').slice(0, 400), i);
    });
  if (slides.length < 3) throw new Error('AI returned too few slides');
  // AI hay quên slide bìa: tự thêm bìa từ tên deck
  if (slides[0].layout !== 'title') slides.unshift(styled('title', String(data.title || name).slice(0, 90), name, -1));
  return {
    title: String(data.title || name).slice(0, 120),
    theme: { mode: 'dark', accent: '#131313' },
    slides,
    source: 'ai',
  };
}

// Gemini báo sai key bằng mã 400, hết lượt bằng 429 RESOURCE_EXHAUSTED: xét cả nội dung lỗi
function classify(status, text = '') {
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(text)) return 'quota';
  if (status === 401 || status === 403 || /API[_ ]?key/i.test(text)) return 'auth';
  return 'error';
}

async function askAi(topic, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT());
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.key) headers.Authorization = `Bearer ${cfg.key}`;
    const body = {
      model: cfg.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Deck topic: ${cleanTopic(topic)}` },
      ],
      temperature: 0.8,
      max_tokens: AI_MAX_TOKENS(),
    };
    // Pollinations lưu đệm theo nội dung yêu cầu (lần trả lỗi cũng bị lưu): seed ngẫu nhiên để luôn sinh mới.
    // Model có suy luận (Pollinations, Gemini): giảm suy luận để không tiêu hết token trước khi viết JSON
    if (cfg.id === 'pollinations') body.seed = Math.floor(Math.random() * 1e9);
    if (cfg.id === 'pollinations' || cfg.id === 'gemini') body.reasoning_effort = 'low';
    let res;
    try {
      res = await fetch(cfg.url, { method: 'POST', headers, signal: controller.signal, body: JSON.stringify(body) });
    } catch (err) {
      const e = new Error(err.name === 'AbortError' ? 'Timed out' : err.message);
      e.kind = err.name === 'AbortError' ? 'timeout' : 'error';
      throw e;
    }
    if (!res.ok) {
      const text = await res.text();
      const e = new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
      e.kind = classify(res.status, text);
      throw e;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    try {
      return normalize(extractJson(content), topic);
    } catch (err) {
      const e = new Error(`${err.message} (AI returned: ${String(content ?? JSON.stringify(data)).slice(0, 160).replace(/\s+/g, ' ')})`);
      e.kind = 'format';
      throw e;
    }
  } finally {
    clearTimeout(timer);
  }
}

const REASON = {
  quota: 'is out of quota',
  auth: 'rejected the API key',
  nokey: 'needs an API key',
  timeout: 'timed out',
  format: 'returned an unreadable answer',
  error: 'is not responding',
};

// options.provider: 'auto' | 'gemini' | 'groq' | 'pollinations'; options.key: key người dùng nhập cho bên đó (không lưu)
async function generateDeck(topic, options = {}) {
  if (process.env.SLIDE_AI_DISABLED === 'true') return { ...templateDeck(topic), fallbacks: [] };
  const fallbacks = [];
  for (const cfg of chain(options.provider, String(options.key || '').trim())) {
    if (!usable(cfg)) {
      fallbacks.push({ provider: cfg.id, label: cfg.label, reason: 'nokey', message: `${cfg.label} ${REASON.nokey}` });
      continue;
    }
    // Lỗi định dạng hay gặp ở bản miễn phí: thử lại một lần; hết lượt / sai key / lỗi mạng thì chuyển bên khác ngay
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const deck = await askAi(topic, cfg);
        return { ...deck, provider: cfg.id, providerLabel: cfg.label, model: cfg.model, ownKey: cfg.ownKey, fallbacks };
      } catch (err) {
        console.warn(`[slideAi] ${cfg.id} attempt ${attempt} failed: ${err.message}`);
        if (attempt === 2 || err.kind !== 'format') {
          fallbacks.push({ provider: cfg.id, label: cfg.label, reason: err.kind || 'error', message: `${cfg.label} ${REASON[err.kind] || REASON.error}` });
          break;
        }
      }
    }
  }
  console.warn('[slideAi] Every provider failed, using the built-in template');
  return { ...templateDeck(topic), fallbacks };
}

module.exports = { generateDeck, listProviders, templateDeck, extractJson, salvage, normalize, LAYOUTS };
