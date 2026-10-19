import { apiFetch, authHeaders } from "./paymentService";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export interface DeckComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// Deck mới lưu nguyên slide PPTist (có elements); deck cũ chỉ có layout/title/body/image.
export interface DeckSlide {
  id: string;
  layout?: string;
  title?: string;
  body?: string;
  image?: string;
  elements?: unknown[];
}

export interface Deck {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  slides: DeckSlide[];
  theme: Record<string, unknown>;
  thumbnail: string;
  isPublic: boolean;
  likesCount: number;
  likedBy?: string[];
  viewsCount?: number;
  // Do backend tính theo người đang xem
  liked?: boolean;
  isOwner?: boolean;
  slideCount?: number;
  comments: DeckComment[];
  readOnly?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function read(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error = new Error(res.status === 401 ? "Your session has expired. Please sign in again from the home page." : (data.message || "Could not save")) as Error & { code?: string };
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function listDecks(): Promise<Deck[]> {
  const res = await apiFetch(`${API_BASE}/presentations`);
  const data = await read(res);
  return data.data;
}

export async function createDeck(title: string) {
  const res = await apiFetch(`${API_BASE}/presentations`, {
    method: "POST",
    body: JSON.stringify({
      title,
      slides: [{ id: "s1", layout: "title", title, body: "Start your presentation" }],
    }),
  });
  const data = await read(res);
  return data.data as Deck;
}

export type AiProviderId = "auto" | "gemini" | "groq" | "pollinations" | "custom";

export type AiProvider = {
  id: Exclude<AiProviderId, "auto">;
  label: string;
  model: string;
  needsKey: boolean;
  hasServerKey: boolean;
  keyUrl: string;
};

export type AiFallback = { provider: string; label: string; reason: "quota" | "auth" | "nokey" | "timeout" | "format" | "error"; message: string };

export type AiRun = {
  source: "ai" | "template";
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  fallbacks: AiFallback[];
};

// Lựa chọn model và key riêng của người dùng: chỉ lưu trên trình duyệt này, gửi kèm từng lần tạo deck
export type AiPrefs = { provider: AiProviderId; keys: Partial<Record<string, string>> };

const AI_PREFS_KEY = "pickme3d_ai_prefs";

export function loadAiPrefs(): AiPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_PREFS_KEY) || "null");
    if (raw && typeof raw.provider === "string") return { provider: raw.provider, keys: raw.keys || {} };
  } catch {}
  return { provider: "auto", keys: {} };
}

export function saveAiPrefs(prefs: AiPrefs) {
  try { localStorage.setItem(AI_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export async function listAiProviders(): Promise<{ primary: string; providers: AiProvider[] }> {
  const res = await apiFetch(`${API_BASE}/presentations/ai-providers`);
  const data = await read(res);
  return data.data;
}

export async function generateDeckWithAi(topic: string, prefs: AiPrefs = loadAiPrefs()) {
  const provider = prefs.provider || "auto";
  const res = await apiFetch(`${API_BASE}/presentations/generate`, {
    method: "POST",
    body: JSON.stringify({ topic, aiProvider: provider, aiKey: provider === "auto" ? "" : prefs.keys[provider] || "" }),
  });
  const data = await read(res);
  return { deck: data.data as Deck, ai: (data.ai || { source: data.source, provider: null, providerLabel: null, model: null, fallbacks: [] }) as AiRun };
}

export async function generateDeck(topic: string) {
  return (await generateDeckWithAi(topic)).deck;
}

// Câu báo khi AI phải đổi model hoặc rơi về bộ mẫu; trả rỗng khi model chọn chạy được ngay
export function describeAiRun(ai: AiRun) {
  if (!ai.fallbacks.length) return "";
  const why = ai.fallbacks.map((f) => f.message).join(", ");
  if (ai.source !== "ai") return `${why}. Every AI model failed, so the deck uses the built-in template. Pick another model or enter a new API key.`;
  return `${why}, so PickMe3D switched to ${ai.providerLabel}${ai.model ? ` (${ai.model})` : ""}. Pick another model or enter a new API key for next time.`;
}

const AI_NOTICE_KEY = "pickme3d_ai_notice";

// Chuyển câu báo sang trang studio sau khi điều hướng
export function stashAiNotice(text: string) {
  try { if (text) sessionStorage.setItem(AI_NOTICE_KEY, text); } catch {}
}

export function takeAiNotice() {
  try {
    const text = sessionStorage.getItem(AI_NOTICE_KEY) || "";
    sessionStorage.removeItem(AI_NOTICE_KEY);
    return text;
  } catch { return ""; }
}

export async function getDeck(id: string) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}`);
  const data = await read(res);
  return data.data as Deck;
}

// Deck công khai của các tài khoản khác (chỉ kèm slide đầu để làm ảnh bìa)
export async function listCommunityDecks(): Promise<Deck[]> {
  const res = await apiFetch(`${API_BASE}/presentations/community`);
  const data = await read(res);
  return data.data;
}

// Ghi một lượt xem; gửi kèm token nếu có để backend không tính lượt của chủ deck
export async function recordDeckView(id: string) {
  const res = await fetch(`${API_BASE}/presentations/${id}/view`, { method: "POST", headers: authHeaders(), cache: "no-store" });
  const data = await read(res);
  return data.data as { viewsCount: number; counted: boolean };
}

function viewerKey() {
  try {
    const user = JSON.parse(localStorage.getItem("pickme3d_user") || "null");
    return String(user?.id || user?.email || "anon");
  } catch {
    return "anon";
  }
}

// Gọi một lần mỗi phiên cho mỗi cặp deck + người xem, tránh tải lại trang là cộng thêm.
// Khoá gồm cả người xem: đổi nick trong cùng tab vẫn ghi lượt xem mới. Chỉ đánh dấu khi backend đã trả lời.
export async function recordDeckViewOnce(id: string) {
  const key = `pickme3d_viewed_${id}_${viewerKey()}`;
  try {
    if (sessionStorage.getItem(key)) return null;
  } catch { /* trình duyệt chặn sessionStorage thì vẫn ghi */ }
  const result = await recordDeckView(id).catch(() => null);
  if (result) {
    try { sessionStorage.setItem(key, "1"); } catch { /* bỏ qua */ }
  }
  return result;
}

export async function getPublicDeck(id: string) {
  const res = await fetch(`${API_BASE}/presentations/public/${id}`, { headers: authHeaders(), cache: "no-store" });
  const data = await read(res);
  return data.data as Deck;
}

export async function saveDeck(id: string, patch: Partial<Pick<Deck, "title" | "slides" | "theme" | "thumbnail" | "isPublic">>) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  const data = await read(res);
  return data.data as Deck;
}

export async function deleteDeck(id: string) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}`, { method: "DELETE" });
  await read(res);
}

export async function likeDeck(id: string) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}/like`, { method: "POST" });
  const data = await read(res);
  return data.data as { likesCount: number; liked: boolean };
}

export async function commentDeck(id: string, content: string) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  const data = await read(res);
  return data.data as DeckComment[];
}

export async function exportPptx(id: string) {
  const res = await apiFetch(`${API_BASE}/presentations/${id}/export.pptx`);
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "Upgrade required") as Error & { code?: string };
    error.code = data.code || "UPGRADE_REQUIRED";
    throw error;
  }
  if (!res.ok) throw new Error("Could not export the PPTX");
  return res.blob();
}
