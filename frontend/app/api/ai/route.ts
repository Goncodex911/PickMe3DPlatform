import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, baseUrl, model, key, system, user, messages, maxTokens = 4096 } = body;

    // Check key from request or server environment
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
      return NextResponse.json(
        { error: { message: "Chưa cấu hình API Key. Vui lòng nhập API Key trong phần Cài đặt AI." } },
        { status: 400 }
      );
    }

    const effectiveModel = (model || "").trim();
    if (!effectiveModel) {
      return NextResponse.json(
        { error: { message: "Vui lòng chọn hoặc nhập Model ID." } },
        { status: 400 }
      );
    }

    // 1. Anthropic Claude provider
    if (provider === "claude") {
      const base = (baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
      const promptMessages = messages || [{ role: "user", content: user }];

      const res = await fetch(`${base}/v1/messages`, {
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

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: { message: `Anthropic API error (${res.status}): ${errorText.slice(0, 300)}` } },
          { status: res.status }
        );
      }

      const j = await res.json();
      const content = (j.content ?? [])
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("");

      return NextResponse.json({
        content,
        stop_reason: j.stop_reason,
      });
    }

    // 2. OpenAI / Gemini / DeepSeek / Custom OpenAI-compatible endpoints
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

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (effectiveKey) {
      headers["authorization"] = `Bearer ${effectiveKey}`;
    }

    const formattedMessages = messages || [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ];

    let res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        ...(provider === "openai" && effectiveModel.includes("gpt-4o") ? {} : { max_tokens: Math.min(maxTokens, 8192) }),
        messages: formattedMessages,
      }),
    });

    if (!res.ok && provider === "gemini" && (res.status === 503 || res.status === 404)) {
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
        res = fallbackRes;
      }
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: { message: `API error (${res.status}): ${errorText.slice(0, 300)}` } },
        { status: res.status }
      );
    }

    const j = await res.json();
    const messageContent = j.choices?.[0]?.message?.content;
    let text = "";
    if (typeof messageContent === "string") {
      text = messageContent;
    } else if (Array.isArray(messageContent)) {
      text = messageContent.map((x: { text?: string }) => x.text ?? "").join("");
    }

    return NextResponse.json({
      content: text,
      finish_reason: j.choices?.[0]?.finish_reason,
    });
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Lỗi kết nối máy chủ AI" } },
      { status: 500 }
    );
  }
}
