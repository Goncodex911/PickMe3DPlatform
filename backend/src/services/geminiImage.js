/**
 * Gemini image generation (image-to-image) cho tính năng "AI Render" phối cảnh 3D.
 * Gửi ảnh chụp WebGL + prompt kiến trúc, nhận lại ảnh phối cảnh chân thực do model sinh.
 * REST: POST /v1beta/models/{model}:generateContent với responseModalities IMAGE.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRYABLE = new Set([404, 429, 500, 503, 504]);
const DEFAULT_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];
const CALL_TIMEOUT_MS = Number(process.env.GEMINI_IMAGE_TIMEOUT_MS) || 90_000;

function imageModelChain() {
  const primary = (process.env.GEMINI_IMAGE_MODEL || '').trim();
  const configured = (process.env.GEMINI_IMAGE_FALLBACK_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([primary, ...(configured.length ? configured : DEFAULT_MODELS)].filter(Boolean))];
}

class GeminiImageError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GeminiImageError';
    this.status = status;
  }
}

/** Thông báo lỗi ngắn gọn, dễ hiểu cho người dùng (thông báo gốc của Google rất dài). */
function describeGeminiError(model, status, rawMessage = '') {
  const msg = String(rawMessage || '');
  if (status === 429 && /free_tier/i.test(msg) && /limit:\s*0\b/.test(msg)) {
    return `API key Gemini đang ở gói miễn phí nên không có hạn mức sinh ảnh cho ${model}. Bật billing cho project tại Google AI Studio để dùng AI Render.`;
  }
  if (status === 429) {
    const retry = /retry in ([^.\s]+)/i.exec(msg);
    return `Đã hết hạn mức gọi ${model}${retry ? `, thử lại sau ${retry[1]}` : ''}.`;
  }
  if (status === 503) return `Model ${model} đang quá tải, vui lòng thử lại sau ít phút.`;
  return `Gemini (${model}) lỗi ${status}: ${msg.split('\n')[0].slice(0, 200) || 'không rõ'}`;
}

async function callModel(model, { imageBase64, mimeType, prompt, apiKey }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new GeminiImageError(`Model ${model} không phản hồi sau ${CALL_TIMEOUT_MS / 1000}s`, 504);
    }
    throw err;
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GeminiImageError(describeGeminiError(model, res.status, body?.error?.message), res.status);
  }

  const candidate = body?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const imagePart = parts.find((p) => (p.inlineData || p.inline_data)?.data);
  if (!imagePart) {
    const reason = candidate?.finishReason || body?.promptFeedback?.blockReason || 'không có ảnh trong phản hồi';
    const text = parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 200);
    throw new GeminiImageError(`Gemini (${model}) không trả ảnh: ${reason}${text ? ` — ${text}` : ''}`, 422);
  }
  const inline = imagePart.inlineData || imagePart.inline_data;
  return {
    model,
    mimeType: inline.mimeType || inline.mime_type || 'image/png',
    buffer: Buffer.from(inline.data, 'base64'),
  };
}

/**
 * Sinh ảnh phối cảnh từ ảnh chụp WebGL.
 * @param {{ imageBase64: string, mimeType?: string, prompt: string, apiKey?: string, onAttempt?: (model: string) => void }} input
 * @returns {Promise<{ model: string, mimeType: string, buffer: Buffer }>}
 */
async function renderImage(input) {
  const apiKey = input.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiImageError('Server chưa cấu hình GEMINI_API_KEY nên không thể render AI.', 503);
  }

  let lastError;
  for (const model of imageModelChain()) {
    try {
      if (input.onAttempt) input.onAttempt(model);
      return await callModel(model, { ...input, mimeType: input.mimeType || 'image/png', apiKey });
    } catch (err) {
      lastError = err;
      if (!(err instanceof GeminiImageError) || !RETRYABLE.has(err.status)) throw err;
    }
  }
  throw lastError || new GeminiImageError('Không có model sinh ảnh nào khả dụng.', 503);
}

module.exports = { renderImage, imageModelChain, describeGeminiError, GeminiImageError };
