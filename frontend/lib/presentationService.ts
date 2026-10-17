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
    const error = new Error(res.status === 401 ? "Phiên đăng nhập đã hết hạn. Hãy vào lại từ trang chủ." : (data.message || "Không lưu được")) as Error & { code?: string };
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
      slides: [{ id: "s1", layout: "title", title, body: "Bắt đầu bài trình bày" }],
    }),
  });
  const data = await read(res);
  return data.data as Deck;
}

export async function generateDeck(topic: string) {
  const res = await apiFetch(`${API_BASE}/presentations/generate`, {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
  const data = await read(res);
  return data.data as Deck;
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

// Gọi một lần mỗi phiên trình duyệt cho mỗi deck, tránh tải lại trang là cộng thêm
export async function recordDeckViewOnce(id: string) {
  const key = `pickme3d_viewed_${id}`;
  try {
    if (sessionStorage.getItem(key)) return null;
    sessionStorage.setItem(key, "1");
  } catch { /* trình duyệt chặn sessionStorage thì vẫn ghi */ }
  return recordDeckView(id).catch(() => null);
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
    const error = new Error(data.message || "Cần nâng cấp") as Error & { code?: string };
    error.code = data.code || "UPGRADE_REQUIRED";
    throw error;
  }
  if (!res.ok) throw new Error("Không xuất được PPTX");
  return res.blob();
}
