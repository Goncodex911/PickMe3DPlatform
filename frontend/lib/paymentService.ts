import { paymentCopy } from "./i18n.payment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export type PlanId = "free" | "pro" | "studio";

export interface PlanInfo {
  id: PlanId;
  name: string;
  price: number;
  quotas: { designs: number | null; slides: number | null; ai: number | null };
  exportPptx: boolean;
  privateDeck: boolean;
  brandKit: boolean;
  watermark: boolean;
}

export interface AccountPlan {
  id: string;
  name: string;
  plan: PlanId;
  planExpiresAt: string | null;
  aiUsed: number;
  aiLimit: number | null;
  quotas?: { designs: number | null; slides: number | null; ai: number | null };
  features: { exportPptx: boolean; privateDeck: boolean; brandKit: boolean; watermark: boolean };
}

export function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function planAllows(plan: PlanId, feature: "export-pptx" | "private" | "brand" | "ai-slide") {
  if (feature === "brand") return plan === "studio";
  if (feature === "export-pptx" || feature === "private") return plan === "pro" || plan === "studio";
  return true;
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window === "undefined") return headers;
  const token = localStorage.getItem("pickme3d_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function storedUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("pickme3d_user") || "null");
  } catch {
    return null;
  }
}

function canRenewGuest(user: { email?: string; id?: string } | null) {
  if (!user) return true;
  const email = String(user.email || "");
  const id = String(user.id || "");
  if (!email && !id) return true;
  return email.endsWith("@pickme3d.local") || id.startsWith("guest");
}

/** Re-issues the guest nick when the saved token was signed before the server secret existed. */
export async function ensureSession() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("pickme3d_token");
  if (token) {
    const probe = await fetch(`${API_BASE}/payments/me`, { headers: authHeaders(), cache: "no-store" });
    if (probe.ok) return true;
  }
  const user = storedUser();
  if (!canRenewGuest(user)) return false;
  const res = await fetch(`${API_BASE}/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: user?.name || "Designer" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.success || !data.token) return false;
  localStorage.setItem("pickme3d_token", data.token);
  localStorage.setItem("pickme3d_user", JSON.stringify(data.user));
  return true;
}

export async function apiFetch(url: string, init: RequestInit = {}) {
  const send = () => fetch(url, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await ensureSession())) res = await send();
  return res;
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error = new Error(res.status === 401 ? "Phiên đăng nhập đã hết hạn. Hãy vào lại từ trang chủ." : (data.message || paymentCopy.quota)) as Error & { code?: string };
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function fetchPlans(): Promise<{ plans: PlanInfo[]; mock: boolean }> {
  const res = await fetch(`${API_BASE}/payments/plans`, { cache: "no-store" });
  const data = await readJson(res);
  return { plans: data.data, mock: Boolean(data.mock) };
}

export async function fetchAccount(): Promise<AccountPlan | null> {
  const res = await apiFetch(`${API_BASE}/payments/me`);
  if (res.status === 401) return null;
  const data = await readJson(res);
  return data.data;
}

export async function checkout(planId: "pro" | "studio", months = 1) {
  const res = await apiFetch(`${API_BASE}/payments/checkout`, {
    method: "POST",
    body: JSON.stringify({ planId, months }),
  });
  return readJson(res) as Promise<{ checkoutUrl: string; orderCode: number; amount: number; mock: boolean }>;
}

export async function fetchOrderStatus(orderCode: string) {
  const res = await apiFetch(`${API_BASE}/payments/status/${orderCode}`);
  const data = await readJson(res);
  return data.data as { status: "PENDING" | "PAID" | "CANCELLED"; planId: string; amount: number };
}

export async function confirmMockPayment(orderCode: string, amount: number) {
  const res = await fetch(`${API_BASE}/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mock: true, data: { orderCode: Number(orderCode), amount, code: "00" } }),
  });
  return readJson(res);
}
