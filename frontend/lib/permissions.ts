/**
 * Client-side permission helpers. UI gating only; the backend decides (see "Role & Permission Matrix").
 * The permission list comes from the backend (login responses and GET /auth/me), never computed here.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export type AccountType = "REGULAR" | "CREATOR";
export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "SUSPENDED";

export interface AccessUser {
  role?: string;
  accountType?: AccountType | null;
  creatorStatus?: CreatorStatus;
  permissions?: string[];
  [key: string]: unknown;
}

export function getStoredUser(): AccessUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("pickme3d_user") ?? "null");
  } catch {
    return null;
  }
}

export function can(user: AccessUser | null | undefined, permission: string): boolean {
  return Boolean(user && Array.isArray(user.permissions) && user.permissions.includes(permission));
}

export function isAdminUser(user: AccessUser | null | undefined): boolean {
  return user?.role === "admin";
}

/** Short Vietnamese label for the account badge. */
export function accountLabel(user: AccessUser | null | undefined): string {
  if (!user) return "";
  if (user.role === "admin") return "Quản trị viên";
  if (user.accountType === "CREATOR") {
    if (user.creatorStatus === "SUSPENDED") return "Creator (tạm khóa)";
    return "Nhà sáng tạo";
  }
  if (user.creatorStatus === "PENDING") return "Người dùng · chờ duyệt Creator";
  return "Người dùng";
}

/**
 * Refreshes role / accountType / creatorStatus / permissions from GET /auth/me and merges them into the stored
 * user. Call after login, payment, or a Creator status change. Returns the updated user, or null when offline.
 */
export async function refreshAccess(): Promise<AccessUser | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("pickme3d_token");
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json.user) return null;
    const merged = { ...(getStoredUser() || {}), ...json.user };
    localStorage.setItem("pickme3d_user", JSON.stringify(merged));
    window.dispatchEvent(new Event("storage"));
    return merged;
  } catch {
    return null;
  }
}

export interface CreatorPolicy {
  version: string;
  creatorSharePercent: number;
  platformSharePercent: number;
  minPayoutVnd: number;
  reviewDays: number;
  specialties: string[];
  experienceLevels: string[];
  rejectionReasons: Record<string, string>;
  applicationFields: Record<string, string>;
  resubmitWaitDays: number[];
}

export interface CreatorRejection {
  reasons: Array<{ code: string; label: string }>;
  requiredFields: Array<{ field: string; label: string }>;
  message: string;
  resubmitAfter: string | null;
  at: string;
}

export interface CreatorApplicationPayload {
  acceptPolicy: boolean;
  acceptCopyright: boolean;
  policyVersion: string;
  displayName: string;
  phone: string;
  specialties: string[];
  experience: string;
  portfolioUrl: string;
  sampleLinks: string[];
  introduction: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankBranch: string;
}

export type ApplicationStage = "NOT_SUBMITTED" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type ApplicationEvent = "SUBMITTED" | "RESUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "REINSTATED";

export interface ApplicationHistoryItem {
  event: ApplicationEvent;
  at: string;
  note?: string;
  code?: string;
}

export interface MyCreatorApplication {
  role: string;
  accountType: AccountType | null;
  creatorStatus: CreatorStatus;
  stage: ApplicationStage;
  code: string;
  reviewNote: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewDeadline: string | null;
  history: ApplicationHistoryItem[];
  rejection: CreatorRejection | null;
  application: Partial<CreatorApplicationPayload> | null;
  bank: { bankName: string; accountNumber: string; accountHolder: string } | null;
}

function authToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
}

export async function fetchCreatorPolicy(): Promise<CreatorPolicy | null> {
  try {
    const res = await fetch(`${API_BASE}/users/creator-policy`, { cache: "no-store" });
    const json = await res.json();
    return json?.success ? json.data : null;
  } catch {
    return null;
  }
}

/** Current Creator status + last application, to pre-fill the form or show the pending state. */
export async function fetchMyCreatorApplication(): Promise<{ data?: MyCreatorApplication; status: number }> {
  const token = authToken();
  if (!token) return { status: 401 };
  try {
    const res = await fetch(`${API_BASE}/users/creator-application`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await res.json();
    return { status: res.status, data: json?.success ? json.data : undefined };
  } catch {
    return { status: 0 };
  }
}

/** Sends the "become a Creator" application. Field errors come back keyed by field name. */
export async function applyForCreator(
  payload: CreatorApplicationPayload
): Promise<{ success: boolean; message?: string; errors?: Record<string, string> }> {
  const token = authToken();
  if (!token) return { success: false, message: "Vui lòng đăng nhập" };
  try {
    const res = await fetch(`${API_BASE}/users/creator-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json?.success) await refreshAccess();
    return { success: Boolean(json?.success), message: json?.message, errors: json?.errors };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối máy chủ" };
  }
}
