/** Template price editing and price history (owner only: the Creator, or the Admin for system templates). */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export interface PriceVersion {
  version: number;
  price: number;
  previousPrice: number | null;
  at: string | null;
  by: string;
  note: string;
  inferred: boolean;
  current: boolean;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function fetchPriceHistory(templateId: string): Promise<{ success: boolean; price?: number; ownerType?: "ADMIN" | "CREATOR"; history?: PriceVersion[]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/templates/${templateId}/price-history`, { headers: authHeaders(), cache: "no-store" });
    const json = await res.json();
    if (!json?.success) return { success: false, message: json?.message };
    return { success: true, ...json.data };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateTemplatePrice(templateId: string, price: number, note: string): Promise<{ success: boolean; price?: number; history?: PriceVersion[]; code?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/templates/${templateId}/price`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ price, note }),
    });
    const json = await res.json();
    if (!json?.success) return { success: false, code: json?.code, message: json?.message };
    return { success: true, price: json.data?.price, history: json.data?.history, message: json.message };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}
