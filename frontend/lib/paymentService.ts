import { paymentCopy } from "./i18n.payment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export type PlanId = "free" | "pro" | "studio";

export interface PlanInfo {
  id: PlanId;
  name: string;
  price: number;
  quotas: { designs: number | null; slides: number | null; ai: number | null };
  /** AI slide generation (Pro) */
  aiSlides?: boolean;
  /** 3D blueprint studio (Pro) */
  blueprint3d?: boolean;
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
  role?: "user" | "admin";
  features: { aiSlides?: boolean; blueprint3d?: boolean; exportPptx: boolean; privateDeck: boolean; brandKit: boolean; watermark: boolean };
}

export function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("en-US").format(amount)} VND`;
}

export function planAllows(plan: PlanId, feature: "export-pptx" | "private" | "brand" | "ai-slide") {
  if (feature === "brand") return plan === "studio";
  if (feature === "export-pptx" || feature === "private" || feature === "ai-slide") return plan === "pro" || plan === "studio";
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

export async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error = new Error(res.status === 401 ? "Your session has expired. Please sign in again from the home page." : (data.message || data.error || paymentCopy.quota)) as Error & { code?: string; feature?: string };
    error.code = data.code;
    error.feature = data.feature;
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

export async function checkout(planId: "pro", months = 1, promoCode = "") {
  const res = await apiFetch(`${API_BASE}/payments/checkout`, {
    method: "POST",
    body: JSON.stringify({ planId, months, promoCode }),
  });
  return readJson(res) as Promise<{ checkoutUrl: string; orderCode: number; amount: number; mock: boolean }>;
}

export async function fetchOrderStatus(orderCode: string) {
  const res = await apiFetch(`${API_BASE}/payments/status/${orderCode}`);
  const data = await readJson(res);
  return data.data as OrderStatus;
}

export type OrderType = "SUBSCRIPTION" | "TEMPLATE_PURCHASE" | "UI_PURCHASE";
export type PaymentStatus = "PENDING" | "VERIFYING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED" | "REFUNDED" | "VOIDED";
/** What the customer sees: PAID is split into "delivering" / "done" / "refund in progress". */
export type DisplayStatus =
  | "AWAITING_PAYMENT" | "VERIFYING" | "PROCESSING" | "COMPLETED" | "REFUND_IN_PROGRESS"
  | "CANCELLED" | "EXPIRED" | "FAILED" | "REFUNDED" | "VOIDED" | "UNKNOWN";
export type RefundStatus = "NONE" | "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";

export interface OrderHistoryEntry { from: string; to: string; at: string; source: string; note: string }
/** Money collected by mistake and sent back (duplicate order, overpayment, partial payment). Not a refund. */
export interface OrderExcessReturn {
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  type: "DUPLICATE_ORDER" | "OVERPAID" | "PARTIAL_PAYMENT";
  amount: number; reason: string; keepOrderCode: number | null; reference: string;
  createdAt: string | null; completedAt: string | null;
}
export const EXCESS_TYPE_LABEL: Record<OrderExcessReturn["type"], string> = {
  DUPLICATE_ORDER: "thanh toán trùng",
  OVERPAID: "chuyển thừa",
  PARTIAL_PAYMENT: "chuyển chưa đủ",
};

export interface OrderRefund {
  status: RefundStatus; reason: string; amount: number; requestedAt: string | null; reviewedAt: string | null;
  adminNote: string; reference: string; completedAt: string | null;
}

export interface OrderStatus {
  orderCode?: number;
  status: PaymentStatus;
  displayStatus?: DisplayStatus;
  orderType?: OrderType;
  planId: string | null;
  months?: number;
  amount: number;
  subtotal?: number;
  discount?: number;
  promoCode?: string;
  productId?: string;
  productTitle?: string;
  templateId?: string | null;
  expiresAt?: string | null;
  checkoutUrl?: string;
  paymentMode?: string;
  paidAt?: string | null;
  paidAmount?: number | null;
  gatewayReference?: string;
  fulfillmentStatus?: "NONE" | "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  cancelReason?: string;
  refund?: OrderRefund;
  excessReturn?: OrderExcessReturn | null;
  /** false for digital products (Template, UI Marketplace): never refundable */
  refundable?: boolean;
  refundEligible?: boolean;
  createdAt?: string | null;
  statusHistory?: OrderHistoryEntry[];
}

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  AWAITING_PAYMENT: "Chờ thanh toán",
  VERIFYING: "Đang xác minh giao dịch",
  PROCESSING: "Đã thanh toán – đang cấp quyền",
  COMPLETED: "Thanh toán thành công",
  REFUND_IN_PROGRESS: "Đang xử lý hoàn tiền",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn thanh toán",
  FAILED: "Không tạo được giao dịch",
  REFUNDED: "Đã hoàn tiền",
  VOIDED: "Đơn trùng – trả lại tiền",
  UNKNOWN: "Không xác định",
};

/** Display status of an order, falling back for servers that do not send it yet. */
export function displayStatusOf(order: Pick<OrderStatus, "status" | "displayStatus">): DisplayStatus {
  if (order.displayStatus) return order.displayStatus;
  if (order.status === "PAID") return "COMPLETED";
  if (order.status === "PENDING") return "AWAITING_PAYMENT";
  return (order.status as DisplayStatus) || "UNKNOWN";
}

const HISTORY_LABEL: Record<string, string> = {
  PENDING: "Tạo đơn / chờ thanh toán", VERIFYING: "Đang xác minh", PAID: "Đã thanh toán", CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn", FAILED: "Thất bại", REFUNDED: "Đã hoàn tiền", FULFILLED: "Đã cấp quyền sử dụng",
  FULFILLMENT_FAILED: "Cấp quyền lỗi (tự thử lại)", REFUND_REQUESTED: "Gửi yêu cầu hoàn tiền",
  REFUND_APPROVED: "Hoàn tiền được duyệt", REFUND_REJECTED: "Hoàn tiền bị từ chối", REVIEW_RESOLVED: "Admin đã kiểm tra",
  VOIDED: "Xác định là đơn trùng", EXCESS_RETURN_OPENED: "Mở trả lại tiền thu trùng/thừa",
  EXCESS_RETURNED: "Đã trả lại tiền thu trùng/thừa", EXCESS_RETURN_CANCELLED: "Hủy trả lại tiền",
};
export function historyLabel(to: string) { return HISTORY_LABEL[to] || to; }

/** Human label of what an order bought (plan, template or UI product). */
export function orderItemLabel(order: Pick<OrderStatus, "orderType" | "planId" | "months" | "productTitle" | "productId">): string {
  if (order.orderType === "UI_PURCHASE") return `UI Market · ${order.productTitle || order.productId || "Sản phẩm"}`;
  if (order.orderType === "TEMPLATE_PURCHASE") return order.productTitle ? `Template · ${order.productTitle}` : "Template Marketplace";
  const plan = (order.planId || "").toUpperCase() || "—";
  return order.months ? `${plan} · ${order.months} tháng` : plan;
}

/** Local test checkout only: the server refuses it unless mock mode is on and you own the order. */
export async function confirmMockPayment(orderCode: string) {
  const res = await apiFetch(`${API_BASE}/payments/mock/confirm/${encodeURIComponent(orderCode)}`, { method: "POST" });
  return readJson(res);
}

export async function cancelOrder(orderCode: string | number, reason = ""): Promise<{ message: string; data: OrderStatus }> {
  const res = await apiFetch(`${API_BASE}/payments/orders/${encodeURIComponent(String(orderCode))}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return readJson(res);
}

export async function requestRefund(orderCode: string | number, reason: string): Promise<{ message: string; data: OrderStatus }> {
  const res = await apiFetch(`${API_BASE}/payments/orders/${encodeURIComponent(String(orderCode))}/refund-request`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return readJson(res);
}

export interface OrderInfo extends OrderStatus {
  orderCode: number; months: number; subtotal: number; discount: number; promoCode: string;
  paidAt: string | null; createdAt: string | null;
}
export interface Receipt extends OrderInfo {
  receiptNumber: string; customer: { name: string; email: string }; currency: string; documentType?: string;
}
export interface PaymentQuote { subtotal: number; discount: number; amount: number; promoCode: string }
export async function quotePayment(planId: string, promoCode: string): Promise<PaymentQuote> {
  const response = await apiFetch(`${API_BASE}/payments/quote`, { method: "POST", body: JSON.stringify({ planId, months: 1, promoCode }) });
  return (await readJson(response)).data;
}
export async function fetchOrders(): Promise<OrderInfo[]> {
  return (await readJson(await apiFetch(`${API_BASE}/payments/orders`))).data;
}
export async function fetchReceipt(orderCode: string): Promise<Receipt> {
  return (await readJson(await apiFetch(`${API_BASE}/payments/orders/${encodeURIComponent(orderCode)}/receipt`))).data;
}

/** Refund policy: only subscription plans are refundable; Template / UI Marketplace purchases are final sale. */
export const DIGITAL_NO_REFUND_NOTICE =
  "Sản phẩm số (Template, UI Marketplace) được cấp quyền ngay sau khi thanh toán và KHÔNG áp dụng hoàn tiền. Chỉ gói đăng ký mới được hoàn tiền.";

/** Asks the buyer to accept the no-refund policy before opening the payment page of a digital product. */
export function confirmDigitalPurchase(itemLabel?: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(`${itemLabel ? `Mua ${itemLabel}.\n\n` : ""}${DIGITAL_NO_REFUND_NOTICE}\n\nTiếp tục thanh toán?`);
}
