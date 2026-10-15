import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, baseUrl, model, key } = body;

    const effectiveKey =
      (key && key.trim()) ||
      (provider === "gemini" && process.env.GEMINI_API_KEY) ||
      (provider === "openai" && process.env.OPENAI_API_KEY) ||
      (provider === "claude" && (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)) ||
      (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) ||
      "";

    if (!effectiveKey && !baseUrl?.includes("localhost") && !baseUrl?.includes("127.0.0.1")) {
      return NextResponse.json(
        { success: false, message: "Chưa nhập API Key" },
        { status: 400 }
      );
    }

    const effectiveModel = (model || "").trim();
    if (!effectiveModel) {
      return NextResponse.json(
        { success: false, message: "Chưa chọn Model ID" },
        { status: 400 }
      );
    }

    if (provider === "claude") {
      const base = (baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
      const res = await fetch(`${base}/v1/messages`, {
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

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { success: false, message: `Lỗi kết nối Claude (${res.status}): ${err.slice(0, 150)}` },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: `Kết nối thành công với ${effectiveModel}!` });
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

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (effectiveKey) headers["authorization"] = `Bearer ${effectiveKey}`;

    let res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (!res.ok && provider === "gemini" && (res.status === 503 || res.status === 404)) {
      // Automatic fallback if specific preview/version has temporary spike in demand or changed
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
        return NextResponse.json({
          success: true,
          message: `API Key hợp lệ! ${effectiveModel} sẵn sàng hoạt động (được hỗ trợ bởi Gemini Flash).`,
        });
      }
    }

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { success: false, message: `Lỗi kết nối ${provider.toUpperCase()} (${res.status}): ${err.slice(0, 150)}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: `Kết nối thành công với ${effectiveModel}!` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Lỗi kiểm tra kết nối" },
      { status: 500 }
    );
  }
}
