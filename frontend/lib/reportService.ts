/**
 * Report & Appeal Service — API layer for Violation Reports and Direct Appeals
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface ReportItem {
  _id: string;
  ticketType: "REPORT" | "APPEAL";
  reporter: string;
  reporterName: string;
  senderEmail?: string;
  targetType:
    | "template"
    | "review"
    | "creator"
    | "CREATOR"
    | "user"
    | "comment"
    | "system"
    | "presentation"
    | string;
  targetId?: string;
  targetTitle?: string;
  targetUrl?: string;
  appealCategory?: string;
  reason: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  attachments: string[];
  status: "pending" | "investigating" | "resolved" | "dismissed";
  resolutionNotes?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  ticketType?: "REPORT" | "APPEAL";
  targetType?:
    | "template"
    | "review"
    | "creator"
    | "CREATOR"
    | "user"
    | "comment"
    | "system"
    | "presentation"
    | string;
  targetId?: string;
  targetTitle?: string;
  targetUrl?: string;
  appealCategory?: string;
  reason: string;
  description: string;
  priority?: "low" | "medium" | "high" | "critical";
  attachments?: string[];
}

/**
 * Submit a report or appeal ticket
 */
export async function createReportApi(payload: CreateReportPayload): Promise<{
  success: boolean;
  data?: ReportItem;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || "Could not submit the report or appeal." };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Could not connect while submitting the report." };
  }
}

/**
 * Fetch reports/appeals submitted by the current user
 */
export async function fetchMyReportsApi(ticketType?: "REPORT" | "APPEAL"): Promise<{
  success: boolean;
  data?: ReportItem[];
  count?: number;
  message?: string;
}> {
  try {
    const url = new URL(`${API_BASE}/reports/my-reports`);
    if (ticketType) {
      url.searchParams.set("ticketType", ticketType);
    }

    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || "Could not load reports." };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Could not connect while loading reports." };
  }
}

/**
 * Check if the currently logged-in user is an administrator
 */
export function isCurrentUserAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const user = JSON.parse(localStorage.getItem("pickme3d_user") || "null");
    return user?.role === "admin";
  } catch {
    return false;
  }
}

