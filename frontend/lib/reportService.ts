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
  targetType: "template" | "review" | "creator" | "user" | "comment" | "system" | "presentation";
  targetId?: string;
  targetTitle?: string;
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
  targetType?: "template" | "review" | "creator" | "user" | "comment" | "system" | "presentation";
  targetId?: string;
  targetTitle?: string;
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
      return { success: false, message: json.message || "Gửi báo cáo / khiếu nại thất bại" };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối khi gửi báo cáo" };
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
      return { success: false, message: json.message || "Không thể tải danh sách báo cáo" };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi kết nối khi tải danh sách báo cáo" };
  }
}

