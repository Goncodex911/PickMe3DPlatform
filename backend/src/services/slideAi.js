// Sinh deck cho Slide Studio bằng AI (endpoint kiểu OpenAI chat completions).
// Mặc định dùng Pollinations (miễn phí, không cần key) để có kết quả trước; đổi sang Gemini / Groq / OpenRouter
// qua biến môi trường mà không phải sửa code. Gọi AI lỗi thì dùng bộ mẫu dựng sẵn để người dùng vẫn có deck.

const LAYOUTS = ['title', 'pitch', 'lookbook', 'case-study', 'portfolio', 'quote', 'two-column', 'closing'];

const AI_URL = () => process.env.SLIDE_AI_URL || 'https://text.pollinations.ai/openai';
// Pollinations ẩn danh hiện chỉ mở model openai-fast
const AI_MODEL = () => process.env.SLIDE_AI_MODEL || 'openai-fast';
const AI_KEY = () => process.env.SLIDE_AI_KEY || '';
const AI_TIMEOUT = () => Number(process.env.SLIDE_AI_TIMEOUT_MS) || 60000;
// Model có suy luận tiêu nhiều token trước khi trả lời: để rộng kẻo JSON bị cắt
const AI_MAX_TOKENS = () => Number(process.env.SLIDE_AI_MAX_TOKENS) || 3000;

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
  return String(topic || 'Bộ sưu tập mới').trim().slice(0, 80) || 'Bộ sưu tập mới';
}

// Bộ mẫu dựng sẵn khi AI không trả lời được
function templateDeck(topic) {
  const name = cleanTopic(topic);
  const items = [
    ['title', name, 'Bài pitch được tạo cho PickMe3D'],
    ['pitch', 'Vì sao khách chọn', `Ba điểm chạm của ${name}: chất liệu, dáng cắt, và câu chuyện thương hiệu.`],
    ['lookbook', 'Lookbook', 'Ảnh chủ đạo của bộ sưu tập, kèm chú thích ngắn.'],
    ['case-study', 'Case study', 'Trước khi có thiết kế này, trang sản phẩm thiếu nhịp. Sau khi dựng trên canvas, khách dừng lại lâu hơn.'],
    ['quote', 'Một câu của nhà thiết kế', `“${name} là cuộc gặp giữa tay nghề và ánh sáng.”`],
    ['closing', 'Bước tiếp theo', 'Đặt lịch xem mẫu hoặc mở storefront 3D để chọn mẫu trực tuyến.'],
  ];
  return {
    title: name,
    theme: { mode: 'dark', accent: '#131313' },
    slides: items.map(([layout, title, body], i) => styled(layout, title, body, i)),
    source: 'template',
  };
}

const SYSTEM_PROMPT = `Bạn là biên tập viên lookbook và pitch cho thương hiệu thời trang.
Chỉ trả về một đối tượng JSON, không giải thích, không markdown.
Định dạng: {"title": string, "slides": [{"layout": string, "title": string, "body": string}]}
- 6 đến 8 slide, viết tiếng Việt.
- layout chỉ được là một trong: ${LAYOUTS.join(', ')}.
  title: trang bìa; pitch: một ý chính; lookbook: một mẫu/look kèm chất liệu, dáng; case-study: số liệu hoặc kết quả;
  portfolio: nhiều sản phẩm; quote: một câu trích dẫn ngắn; two-column: so sánh hai ý; closing: lời kết, bước tiếp theo.
- Slide đầu là title, slide cuối là closing.
- title tối đa 60 ký tự; body tối đa 220 ký tự, có thể xuống dòng bằng \\n.`;

// Lấy đối tượng JSON đầu tiên trong câu trả lời (AI hay bọc trong \`\`\`json ... \`\`\`)
function extractJson(text) {
  const raw = String(text || '');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0) throw new Error('AI không trả về JSON');
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
  if (!slides.length) throw new Error('AI không trả về JSON');
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
  if (slides.length < 3) throw new Error('AI trả về quá ít slide');
  // AI hay quên slide bìa: tự thêm bìa từ tên deck
  if (slides[0].layout !== 'title') slides.unshift(styled('title', String(data.title || name).slice(0, 90), name, -1));
  return {
    title: String(data.title || name).slice(0, 120),
    theme: { mode: 'dark', accent: '#131313' },
    slides,
    source: 'ai',
  };
}

async function askAi(topic) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT());
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AI_KEY()) headers.Authorization = `Bearer ${AI_KEY()}`;
    const body = {
      model: AI_MODEL(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Chủ đề deck: ${cleanTopic(topic)}` },
      ],
      temperature: 0.8,
      max_tokens: AI_MAX_TOKENS(),
    };
    // Pollinations lưu đệm theo nội dung yêu cầu (lần trả lỗi cũng bị lưu): seed ngẫu nhiên để luôn sinh mới,
    // và giảm suy luận để model không tiêu hết token trước khi viết JSON
    if (AI_URL().includes('pollinations.ai')) {
      body.seed = Math.floor(Math.random() * 1e9);
      body.reasoning_effort = 'low';
    }
    const res = await fetch(AI_URL(), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`AI trả lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    try {
      return normalize(extractJson(content), topic);
    } catch (err) {
      throw new Error(`${err.message} (AI trả: ${String(content ?? JSON.stringify(data)).slice(0, 160).replace(/\s+/g, ' ')})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function generateDeck(topic) {
  if (process.env.SLIDE_AI_DISABLED === 'true') return templateDeck(topic);
  // Dịch vụ miễn phí hay trả lời hụt: thử lại một lần trước khi dùng bộ mẫu
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await askAi(topic);
    } catch (err) {
      console.warn(`[slideAi] Lần ${attempt} không sinh được bằng AI: ${err.message}`);
    }
  }
  console.warn('[slideAi] Dùng bộ mẫu dựng sẵn');
  return templateDeck(topic);
}

module.exports = { generateDeck, templateDeck, extractJson, salvage, normalize, LAYOUTS };
