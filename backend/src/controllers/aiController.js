/**
 * AI Controller - Proxies AI generation requests and tests connection
 */

const GEMINI_RETRYABLE = new Set([404, 429, 500, 503, 504]);
const AI_CALL_TIMEOUT_MS = Number(process.env.AI_CALL_TIMEOUT_MS) || 75_000;
// Model dự phòng khi model được yêu cầu quá tải/không có. Cấu hình bằng GEMINI_FALLBACK_MODELS (phân tách dấu phẩy).
// (gemini-2.5-flash đã ngừng với tài khoản mới; gemini-flash-latest hay quá tải nên để cuối)
const DEFAULT_GEMINI_FALLBACKS = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function geminiFallbackChain(requestedModel) {
  const configured = (process.env.GEMINI_FALLBACK_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list = configured.length > 0 ? configured : DEFAULT_GEMINI_FALLBACKS;
  return [...new Set(list)].filter((m) => m !== requestedModel);
}
exports.geminiFallbackChain = geminiFallbackChain;

exports.complete = async (req, res, next) => {
  try {
    const { provider, baseUrl, model, key, system, user, messages, maxTokens = 4096, responseFormat } = req.body;
    // Chỉ chấp nhận chế độ JSON chuẩn của API tương thích OpenAI (Gemini/OpenAI/DeepSeek)
    const responseFormatParam =
      responseFormat && responseFormat.type === "json_object" ? { response_format: { type: "json_object" } } : {};

    const effectiveKey =
      (key && key.trim()) ||
      (provider === "gemini" && process.env.GEMINI_API_KEY) ||
      (provider === "openai" && process.env.OPENAI_API_KEY) ||
      (provider === "claude" && (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)) ||
      (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!effectiveKey && !baseUrl?.includes("localhost") && !baseUrl?.includes("127.0.0.1")) {
      return res.status(400).json({
        success: false,
        error: { message: "Chưa cấu hình API Key. Vui lòng nhập API Key trong phần Cài đặt AI." },
      });
    }

    const effectiveModel = (model || "").trim();
    if (!effectiveModel) {
      return res.status(400).json({
        success: false,
        error: { message: "Vui lòng chọn hoặc nhập Model ID." },
      });
    }

    // Claude Anthropic
    if (provider === "claude") {
      const base = (baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
      const promptMessages = messages || [{ role: "user", content: user }];

      const response = await fetch(`${base}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": effectiveKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: effectiveModel,
          max_tokens: Math.min(maxTokens, 8192),
          system: system || undefined,
          messages: promptMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: { message: `Claude API error (${response.status}): ${errText.slice(0, 300)}` },
        });
      }

      const j = await response.json();
      const content = (j.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      return res.json({
        success: true,
        content,
        stop_reason: j.stop_reason,
      });
    }

    // OpenAI / Gemini / DeepSeek
    let base = (baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
    if (provider === "gemini") {
      if (!baseUrl || base.includes("generativelanguage.googleapis.com")) {
        base = "https://generativelanguage.googleapis.com/v1beta/openai";
      }
    } else if (provider === "openai" && !baseUrl) {
      base = "https://api.openai.com/v1";
    } else if (provider === "deepseek" && !baseUrl) {
      base = "https://api.deepseek.com/v1";
    }

    const headers = { "content-type": "application/json" };
    if (effectiveKey) headers["authorization"] = `Bearer ${effectiveKey}`;

    const formattedMessages = messages || [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ];

    const callModel = async (modelId) => {
      try {
        return await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers,
          // Một model treo không được chặn cả request: hết giờ => 504 để chuyển sang model dự phòng.
          signal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
          body: JSON.stringify({
            model: modelId,
            ...(provider === "openai" && modelId.includes("gpt-4o") ? {} : { max_tokens: Math.min(maxTokens, 8192) }),
            ...responseFormatParam,
            messages: formattedMessages,
          }),
        });
      } catch (err) {
        if (err && (err.name === "TimeoutError" || err.name === "AbortError")) {
          return new Response(`Model ${modelId} không phản hồi sau ${AI_CALL_TIMEOUT_MS / 1000}s`, { status: 504 });
        }
        throw err;
      }
    };

    let response = await callModel(effectiveModel);

    // Gemini hay trả 503 (quá tải) / 429 (giới hạn) theo từng model: thử lần lượt các model dự phòng.
    if (!response.ok && provider === "gemini" && GEMINI_RETRYABLE.has(response.status)) {
      const chain = geminiFallbackChain(effectiveModel);
      for (let i = 0; i < chain.length && !response.ok && GEMINI_RETRYABLE.has(response.status); i++) {
        await sleep(400 * (i + 1));
        response = await callModel(chain[i]);
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: { message: `API error (${response.status}): ${errText.slice(0, 300)}` },
      });
    }

    const j = await response.json();
    const msg = j.choices?.[0]?.message?.content;
    let text = "";
    if (typeof msg === "string") text = msg;
    else if (Array.isArray(msg)) text = msg.map((x) => x.text || "").join("");

    return res.json({
      success: true,
      content: text,
      finish_reason: j.choices?.[0]?.finish_reason,
    });
  } catch (error) {
    next(error);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const { provider, baseUrl, model, key } = req.body;
    const effectiveKey =
      (key && key.trim()) ||
      (provider === "gemini" && process.env.GEMINI_API_KEY) ||
      (provider === "openai" && process.env.OPENAI_API_KEY) ||
      (provider === "claude" && (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)) ||
      (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) ||
      "";

    if (!effectiveKey && !baseUrl?.includes("localhost") && !baseUrl?.includes("127.0.0.1")) {
      return res.status(400).json({ success: false, message: "Chưa nhập API Key" });
    }

    const effectiveModel = (model || "").trim();
    if (!effectiveModel) {
      return res.status(400).json({ success: false, message: "Chưa chọn Model ID" });
    }

    if (provider === "claude") {
      const base = (baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
      const response = await fetch(`${base}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": effectiveKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: effectiveModel,
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(400).json({ success: false, message: `Lỗi kết nối Claude: ${err.slice(0, 150)}` });
      }
      return res.json({ success: true, message: `Kết nối thành công với ${effectiveModel}!` });
    }

    let base = (baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
    if (provider === "gemini") {
      if (!baseUrl || base.includes("generativelanguage.googleapis.com")) {
        base = "https://generativelanguage.googleapis.com/v1beta/openai";
      }
    } else if (provider === "openai" && !baseUrl) base = "https://api.openai.com/v1";
    else if (provider === "deepseek" && !baseUrl) base = "https://api.deepseek.com/v1";

    const headers = { "content-type": "application/json" };
    if (effectiveKey) headers["authorization"] = `Bearer ${effectiveKey}`;

    let response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (!response.ok && provider === "gemini" && (response.status === 503 || response.status === 404)) {
      const fallback = "gemini-flash-latest";
      const fallbackRes = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: fallback,
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (fallbackRes.ok) {
        return res.json({
          success: true,
          message: `API Key hợp lệ! ${effectiveModel} sẵn sàng hoạt động (được hỗ trợ bởi Gemini Flash).`,
        });
      }
    }

    if (!response.ok) {
      const err = await response.text();
      return res.status(400).json({ success: false, message: `Lỗi kết nối ${provider.toUpperCase()}: ${err.slice(0, 150)}` });
    }

    return res.json({ success: true, message: `Kết nối thành công với ${effectiveModel}!` });
  } catch (error) {
    next(error);
  }
};
