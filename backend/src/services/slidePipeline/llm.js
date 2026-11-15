// Gọi Groq (nội dung) và Gemini (thiết kế) qua endpoint chuẩn OpenAI chat completions ở chế độ JSON.
// Mỗi lần gọi đi qua chuỗi model dự phòng; lỗi tạm thời (429/5xx/hết giờ) chuyển model, JSON sai schema thì
// gửi lại kèm danh sách lỗi để model tự sửa. Key chỉ đọc từ biến môi trường.

const { extractJson } = require('../slideAi');
const { geminiFallbackChain } = require('../../controllers/aiController');

const RETRYABLE = new Set([404, 408, 409, 429, 500, 502, 503, 504]);

const PROVIDERS = {
  groq: {
    url: () => process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    key: () => process.env.GROQ_API_KEY || '',
    models: () => {
      // Groq đã gỡ dòng llama-3.x; đổi model bằng SLIDE_CONTENT_MODEL / SLIDE_CONTENT_FALLBACK_MODELS khi danh sách thay đổi
      const primary = process.env.SLIDE_CONTENT_MODEL || 'openai/gpt-oss-120b';
      const extra = (process.env.SLIDE_CONTENT_FALLBACK_MODELS || 'qwen/qwen3.8-27b,openai/gpt-oss-20b')
        .split(',').map((s) => s.trim()).filter(Boolean);
      return [...new Set([primary, ...extra])];
    },
  },
  gemini: {
    url: () => 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: () => process.env.GEMINI_API_KEY || '',
    models: () => {
      const primary = process.env.SLIDE_DESIGN_MODEL || 'gemini-3.5-flash';
      return [primary, ...geminiFallbackChain(primary)];
    },
  },
};

const timeoutMs = () => Number(process.env.SLIDE_AI_TIMEOUT_MS) || 60000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isAvailable(provider) {
  if (process.env.SLIDE_AI_DISABLED === 'true') return false;
  return Boolean(PROVIDERS[provider]?.key());
}

class LlmError extends Error {
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
    this.retryable = retryable;
  }
}

async function requestOnce(provider, model, messages, { maxTokens, temperature }) {
  const cfg = PROVIDERS[provider];
  let res;
  try {
    res = await fetch(cfg.url(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key()}` },
      signal: AbortSignal.timeout(timeoutMs()),
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new LlmError(timedOut ? `${model} timed out` : `${model} network error: ${err.message}`, { retryable: true });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new LlmError(`${model} HTTP ${res.status}: ${text.slice(0, 200)}`, { status: res.status, retryable: RETRYABLE.has(res.status) });
  }
  const data = await res.json().catch(() => null);
  const msg = data?.choices?.[0]?.message?.content;
  const text = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((x) => x.text || '').join('') : '';
  if (!text) throw new LlmError(`${model} returned an empty answer`, { retryable: true });
  return text;
}

/**
 * Gọi model và trả về JSON đã qua validate.
 * @param {object} opts
 * @param {'groq'|'gemini'} opts.provider
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {(parsed: any) => {ok: boolean, errors?: string[], value?: any}} [opts.validate]
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.temperature]
 * @param {number} [opts.repairs] số lần gửi lại khi JSON sai schema
 * @returns {Promise<{value: any, model: string, provider: string, calls: number}>}
 */
async function callJson({ provider, system, user, validate, maxTokens = 4000, temperature = 0.7, repairs = 1 }) {
  if (!PROVIDERS[provider]) throw new LlmError(`Unknown provider ${provider}`);
  if (!isAvailable(provider)) throw new LlmError(`${provider} is not configured`);
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const models = PROVIDERS[provider].models();
  let calls = 0;
  let lastError = null;
  let repairsLeft = repairs;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    let text;
    try {
      calls += 1;
      text = await requestOnce(provider, model, messages, { maxTokens, temperature });
    } catch (err) {
      lastError = err;
      if (!err.retryable) break;
      await sleep(300 * (i + 1));
      continue;
    }
    let parsed;
    try {
      parsed = extractJson(text);
    } catch (err) {
      lastError = new LlmError(`${model}: ${err.message}`);
      continue;
    }
    const checked = validate ? validate(parsed) : { ok: true, value: parsed };
    if (checked.ok) return { value: checked.value, model, provider, calls };
    lastError = new LlmError(`${model}: invalid JSON (${(checked.errors || []).slice(0, 5).join('; ')})`);
    // Còn lượt sửa: gửi lại cho chính model đó kèm lỗi cụ thể
    if (repairsLeft > 0) {
      repairsLeft -= 1;
      messages.push({ role: 'assistant', content: text.slice(0, 6000) });
      messages.push({
        role: 'user',
        content: `Your JSON has these problems: ${(checked.errors || []).slice(0, 8).join('; ')}. Return the full corrected JSON object only.`,
      });
      i -= 1;
    }
  }
  const err = lastError || new LlmError(`${provider}: no model answered`);
  err.calls = calls;
  throw err;
}

module.exports = { callJson, isAvailable, LlmError, PROVIDERS };
