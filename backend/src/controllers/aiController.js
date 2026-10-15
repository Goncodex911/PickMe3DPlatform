/**
 * AI Controller - Proxies AI generation requests and tests connection
 */

exports.complete = async (req, res, next) => {
  try {
    const { provider, baseUrl, model, key, system, user, messages, maxTokens = 4096 } = req.body;

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

    let response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        ...(provider === "openai" && effectiveModel.includes("gpt-4o") ? {} : { max_tokens: Math.min(maxTokens, 8192) }),
        messages: formattedMessages,
      }),
    });

    if (!response.ok && provider === "gemini" && (response.status === 503 || response.status === 404)) {
      const fallback = "gemini-flash-latest";
      const fallbackRes = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: fallback,
          max_tokens: Math.min(maxTokens, 8192),
          messages: formattedMessages,
        }),
      });
      if (fallbackRes.ok) {
        response = fallbackRes;
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
