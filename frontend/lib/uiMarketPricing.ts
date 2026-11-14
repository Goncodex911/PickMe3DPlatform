/**
 * UI Marketplace prices (set by Admin on the fixed catalogue) and checkout for priced products.
 * Products without a price are free and keep the instant "claim" flow.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export type UiPriceMap = Record<string, number>;

export async function fetchUiPrices(): Promise<UiPriceMap> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/ui-prices`, { cache: "no-store" });
    const json = await res.json();
    return json?.success && json.prices && typeof json.prices === "object" ? json.prices : {};
  } catch {
    return {};
  }
}

export function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}₫`;
}

/** Starts payment for a priced UI product; resolves with the payment page URL. */
export async function checkoutUiProduct(productId: string): Promise<{ success: boolean; checkoutUrl?: string; code?: string; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false, code: "LOGIN_REQUIRED", message: "Vui lòng đăng nhập để mua sản phẩm" };
  try {
    const res = await fetch(`${API_BASE}/payments/checkout-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    return { success: Boolean(json?.success), checkoutUrl: json?.checkoutUrl, code: json?.code, message: json?.message };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}

export interface AdminUiProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  defaultPrice: number;
  isCustom: boolean;
  updatedAt: string | null;
}

function adminHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function fetchAdminUiProducts(params: { search?: string; pricing?: string } = {}): Promise<{ success: boolean; data?: AdminUiProduct[]; message?: string }> {
  try {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.pricing && params.pricing !== "all") q.set("pricing", params.pricing);
    const res = await fetch(`${API_BASE}/admin/ui-products?${q.toString()}`, { headers: adminHeaders(), cache: "no-store" });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateUiProductPriceApi(productId: string, price: number): Promise<{ success: boolean; data?: AdminUiProduct; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/ui-products/${encodeURIComponent(productId)}/price`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ price }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}
