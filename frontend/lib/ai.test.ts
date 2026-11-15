import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI, complete, hasKey, isSecureUrl, testAiConnection, usesServerKey, type AiSettings, type Provider } from "./ai";

const settings = (over: Partial<AiSettings> = {}): AiSettings =>
  ({ provider: "openai", baseUrl: "https://api.example.test", model: "test-model", key: "test-key", ...over });

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("complete on the claude path", () => {
  it("posts to the messages endpoint with the anthropic headers and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "hi" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const s = settings({ provider: "claude", baseUrl: "https://api.example.test/", key: "  test-key  " });
    await expect(complete(s, "sys prompt", "user prompt")).resolves.toBe("hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-api-key": "test-key",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "test-model", max_tokens: 4096, system: "sys prompt", messages: [{ role: "user", content: "user prompt" }] });
  });

  it("joins only the text blocks of the reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      content: [{ type: "text", text: "a" }, { type: "tool_use", id: "t" }, { type: "text", text: "b" }],
    })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).resolves.toBe("ab");
  });

  it("returns an empty string for an empty content array instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [] })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).resolves.toBe("");
  });

  it("throws long when the reply stops at max_tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("long");
  });

  it("throws refusal when the model refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [], stop_reason: "refusal" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("refusal");
  });

  it("throws the status and provider detail on an http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "overloaded" } }), { status: 529, statusText: "Overloaded" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("529 Overloaded: overloaded");
  });
});

describe("complete on the openai-compatible path", () => {
  it("sends bearer auth and omits max_tokens for the openai provider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings(), "sys prompt", "user prompt")).resolves.toBe("ok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json", authorization: "Bearer test-key" });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "test-model", messages: [{ role: "system", content: "sys prompt" }, { role: "user", content: "user prompt" }] });
    expect(body).not.toHaveProperty("max_tokens");
  });

  it.each(["gemini", "deepseek"] as Provider[])("sends a max_tokens budget to %s", async (provider) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings({ provider }), "s", "u")).resolves.toBe("ok");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(4096);
  });

  it("calls a local endpoint without a key and without an authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: "local" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const s = settings({ baseUrl: "http://localhost:11434/v1/", key: "" });
    await expect(complete(s, "s", "u")).resolves.toBe("local");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init.headers).toEqual({ "content-type": "application/json" });
  });

  it("joins array content parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: [{ text: "a" }, {}, { text: "b" }] } }] })));
    await expect(complete(settings(), "s", "u")).resolves.toBe("ab");
  });

  it("throws long when finish_reason is length", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "length", message: { content: "partial" } }] })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("long");
  });

  it("throws the status and provider detail on an http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401, statusText: "Unauthorized" })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("401 Unauthorized: bad key");
  });

  it("throws empty when the reply has no content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: {} }] })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("empty");
  });
});

describe("complete input guards", () => {
  it.each([
    ["insecure", { baseUrl: "http://api.example.test" }],
    ["model", { model: "  " }],
  ])("rejects %s without calling fetch", async (message, over) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings(over), "s", "u")).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("hasKey and isSecureUrl", () => {
  it("requires a key for hosted endpoints but not for this machine", () => {
    expect(hasKey(settings())).toBe(true);
    expect(hasKey(settings({ key: "  " }))).toBe(false);
    expect(hasKey(settings({ key: "", baseUrl: "http://localhost:11434/v1" }))).toBe(true);
  });

  it("only allows https or an endpoint on this machine", () => {
    expect(isSecureUrl("https://api.example.test/v1")).toBe(true);
    expect(isSecureUrl("http://localhost:8080/v1")).toBe(true);
    expect(isSecureUrl("http://127.0.0.1:8080/v1")).toBe(true);
    expect(isSecureUrl("http://[::1]:8080/v1")).toBe(true);
    expect(isSecureUrl("http://api.example.test/v1")).toBe(false);
  });
});

describe("the server's Gemini key", () => {
  const gemini = (over: Partial<AiSettings> = {}): AiSettings =>
    ({ provider: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-test", key: "", ...over });
  const signIn = (token: string | null) => {
    const values = new Map<string, string>();
    if (token) values.set("pickme3d_token", token);
    vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: () => {}, removeItem: () => {} });
  };

  it("is used for Gemini with a blank key, and only then", () => {
    expect(usesServerKey(gemini())).toBe(true);
    expect(usesServerKey(gemini({ key: "  " }))).toBe(true);
    expect(usesServerKey(gemini({ baseUrl: "" }))).toBe(true);
    expect(usesServerKey(gemini({ key: "own-key" }))).toBe(false);
    expect(usesServerKey(gemini({ baseUrl: "https://my-proxy.example.test/v1" }))).toBe(false);
    expect(usesServerKey(settings({ key: "" }))).toBe(false);
  });

  it("counts as having a key, so the editor's AI is not blocked", () => {
    expect(hasKey(gemini())).toBe(true);
    expect(hasKey(settings({ key: "" }))).toBe(false);
  });

  it("goes through the backend with the session token and never a key", async () => {
    signIn("session-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, content: "drafted", finish_reason: "stop" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(gemini(), "sys", "idea", undefined, 12000)).resolves.toBe("drafted");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/ai\/complete$/);
    expect(init.headers.authorization).toBe("Bearer session-token");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ provider: "gemini", model: "gemini-test", system: "sys", user: "idea", maxTokens: 12000 });
  });

  it("asks for a sign-in without a session, or when the session has expired", async () => {
    signIn(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("login");
    expect(fetchMock).not.toHaveBeenCalled();

    signIn("expired");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: false, message: "Not authorized" }, 401)));
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("login");
  });

  it("passes on the backend's own message, such as a server with no key set", async () => {
    signIn("t");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: false, error: { message: "Chưa cấu hình API Key." } }, 400)));
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("Chưa cấu hình API Key.");
  });

  it("reports an unreachable backend, a cut-off reply and an empty one", async () => {
    signIn("t");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("server");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true, content: "part", finish_reason: "length" })));
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("long");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true, content: "" })));
    await expect(complete(gemini(), "s", "u")).rejects.toThrow("empty");
  });

  it("lets a cancel through as a cancel", async () => {
    signIn("t");
    const ac = new AbortController();
    ac.abort();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    await expect(complete(gemini(), "s", "u", ac.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("sends the author's own Gemini key straight to Google, not to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: "direct" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(gemini({ key: "own-key" }), "s", "u")).resolves.toBe("direct");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(init.headers.authorization).toBe("Bearer own-key");
  });
});

describe("testAiConnection", () => {
  const gemini = (over: Partial<AiSettings> = {}): AiSettings =>
    ({ provider: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-test", key: "", ...over });
  const signIn = (token: string | null) => {
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k === "pickme3d_token" ? token : null), setItem: () => {}, removeItem: () => {} });
  };

  it("checks the server's key through the backend with the session", async () => {
    signIn("t");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(testAiConnection(gemini())).resolves.toEqual({ success: true, message: "gemini-test" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/ai\/test$/);
    expect(init.headers.authorization).toBe("Bearer t");
    expect(JSON.parse(init.body)).toEqual({ provider: "gemini", model: "gemini-test" });
  });

  it("explains a failure without throwing", async () => {
    signIn(null);
    await expect(testAiConnection(gemini())).resolves.toEqual({ success: false, message: "login" });
    signIn("t");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: false, message: "Lỗi kết nối GEMINI: bad" }, 400)));
    await expect(testAiConnection(gemini())).resolves.toEqual({ success: false, message: "Lỗi kết nối GEMINI: bad" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(testAiConnection(gemini())).resolves.toEqual({ success: false, message: "server" });
    await expect(testAiConnection(gemini({ model: " " }))).resolves.toEqual({ success: false, message: "model" });
  });

  it("checks the author's own key with a tiny request, and a short reply still passes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "length", message: { content: "O" } }] })));
    await expect(testAiConnection(settings())).resolves.toEqual({ success: true, message: "test-model" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401, statusText: "Unauthorized" })));
    await expect(testAiConnection(settings())).resolves.toEqual({ success: false, message: "401 Unauthorized: bad key" });
  });
});

describe("no key in the page", () => {
  it("starts with a blank Gemini key, which means the server's key", () => {
    expect(DEFAULT_AI.provider).toBe("gemini");
    expect(DEFAULT_AI.key).toBe("");
    expect(usesServerKey(DEFAULT_AI)).toBe(true);
  });
});
