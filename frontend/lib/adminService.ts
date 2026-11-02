/**
 * Admin Service — API Layer for PickMe3D Platform Administration
 * Follows the established API conventions and handles JWT authentication
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "banned";
  plan?: "free" | "pro" | "studio";
  planExpiresAt?: string | null;
  aiUsed?: number;
  aiPeriod?: string;
  jobRole?: string;
  bio?: string;
  username?: string;
  picture?: string;
  bannedAt?: string | null;
  bannedReason?: string;
  templatesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  _id: string;
  orderCode: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPicture?: string | null;
  planId: "pro" | "studio";
  months: number;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminPresentation {
  _id: string;
  title: string;
  authorName: string;
  userId: string;
  thumbnail?: string;
  slidesCount: number;
  isPublic: boolean;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTemplate {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  isPublic: boolean;
  isFeatured: boolean;
  isSystem: boolean;
  likesCount: number;
  viewsCount: number;
  forksCount: number;
  avgRating: number;
  author?: { _id: string; name: string; email: string; picture?: string } | null;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReport {
  _id: string;
  reporter?: { _id: string; name: string; email: string; picture?: string };
  reporterName: string;
  targetType: "template" | "user" | "comment" | "system";
  targetId: string;
  targetTitle?: string;
  reason: string;
  description: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high" | "critical";
  resolutionNotes?: string;
  resolvedByName?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  _id: string;
  actor: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: "user" | "template" | "report" | "system";
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  status: "success" | "failure";
  createdAt: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    banned: number;
    admins: number;
  };
  templates: {
    total: number;
    system: number;
    user: number;
  };
  community: {
    comments: number;
    collections: number;
  };
  reports: {
    total: number;
    pending: number;
    resolved: number;
    priorityBreakdown: Array<{ _id: string; count: number }>;
  };
  categories: Array<{ _id: string; count: number }>;
  presentations?: {
    total: number;
    public: number;
  };
  billing?: {
    totalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
  };
  plans?: {
    free: number;
    pro: number;
    studio: number;
  };
  recentAuditLogs: AuditLogItem[];
  recentUsers: Array<{
    _id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    status: "active" | "banned";
    picture?: string;
    createdAt: string;
  }>;
}

export interface AnalyticsData {
  trends: {
    userRegistrations: Array<{ _id: string; count: number }>;
    templatesCreated: Array<{ _id: string; count: number }>;
    reportsSubmitted: Array<{ _id: string; count: number }>;
  };
  monetization: {
    status: string;
    message: string;
  };
}

// ==========================================
// A. DASHBOARD STATS
// ==========================================

export async function fetchAdminStatsApi(): Promise<{
  success: boolean;
  data?: AdminDashboardStats;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

// ==========================================
// B. USER MANAGEMENT
// ==========================================

export async function fetchAdminUsersApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  plan?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{
  success: boolean;
  data?: AdminUser[];
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.role && params.role !== "all") query.set("role", params.role);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortOrder) query.set("sortOrder", params.sortOrder);

    const res = await fetch(`${API_BASE}/admin/users?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function createAdminUserApi(user: {
  name: string;
  email: string;
  role?: "user" | "admin";
  jobRole?: string;
  bio?: string;
  username?: string;
}): Promise<{ success: boolean; data?: AdminUser; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateUserStatusApi(
  id: string,
  status: "active" | "banned",
  reason?: string
): Promise<{ success: boolean; data?: AdminUser; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateUserRoleApi(
  id: string,
  role: "user" | "admin"
): Promise<{ success: boolean; data?: AdminUser; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function importUsersApi(
  users: Array<{ name: string; email: string; jobRole?: string; bio?: string }>
): Promise<{
  success: boolean;
  message?: string;
  summary?: {
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; email?: string; error: string }>;
  };
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/import`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ users }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

// ==========================================
// C. TEMPLATES & 3D ASSETS
// ==========================================

export async function fetchAdminTemplatesApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isSystem?: string;
  isPublic?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{
  success: boolean;
  data?: AdminTemplate[];
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.category && params.category !== "all") query.set("category", params.category);
    if (params?.isSystem !== undefined && params.isSystem !== "all") query.set("isSystem", params.isSystem);
    if (params?.isPublic !== undefined && params.isPublic !== "all") query.set("isPublic", params.isPublic);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortOrder) query.set("sortOrder", params.sortOrder);

    const res = await fetch(`${API_BASE}/admin/templates?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function createSystemTemplateApi(template: {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  docData: any;
  isFeatured?: boolean;
  isPublic?: boolean;
}): Promise<{ success: boolean; data?: AdminTemplate; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/templates`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(template),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateAdminTemplateApi(
  id: string,
  updates: Partial<AdminTemplate>
): Promise<{ success: boolean; data?: AdminTemplate; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/templates/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function deleteAdminTemplateApi(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/templates/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

// ==========================================
// D. INCIDENT REPORTS
// ==========================================

export async function fetchAdminReportsApi(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  targetType?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: IncidentReport[];
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.priority && params.priority !== "all") query.set("priority", params.priority);
    if (params?.targetType && params.targetType !== "all") query.set("targetType", params.targetType);
    if (params?.search) query.set("search", params.search);

    const res = await fetch(`${API_BASE}/admin/reports?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function updateReportStatusApi(
  id: string,
  payload: {
    status?: "pending" | "investigating" | "resolved" | "dismissed";
    resolutionNotes?: string;
    priority?: "low" | "medium" | "high" | "critical";
  }
): Promise<{ success: boolean; data?: IncidentReport; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

// ==========================================
// E. AUDIT LOGS
// ==========================================

export async function fetchAuditLogsApi(params?: {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: AuditLogItem[];
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.action && params.action !== "all") query.set("action", params.action);
    if (params?.targetType && params.targetType !== "all") query.set("targetType", params.targetType);
    if (params?.search) query.set("search", params.search);

    const res = await fetch(`${API_BASE}/admin/audit-logs?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function downloadAuditLogsCsv(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const res = await fetch(`${API_BASE}/admin/audit-logs/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Không thể tải file CSV nhật ký");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pickme3d_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ==========================================
// F. ANALYTICS & REPORTS
// ==========================================

export async function fetchAdminAnalyticsApi(): Promise<{
  success: boolean;
  data?: AnalyticsData;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export async function downloadReportsCsv(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const res = await fetch(`${API_BASE}/admin/reports/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Không thể tải file CSV báo cáo");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pickme3d_reports_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


// ==========================================
// G. USER PLAN & BILLING ORDERS APIS
// ==========================================

export async function updateUserPlanApi(
  userId: string,
  data: { plan: "free" | "pro" | "studio"; months?: number }
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/plan`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi cập nhật gói cước" };
  }
}

export async function fetchAdminOrdersApi(params?: {
  page?: number;
  limit?: number;
  status?: string;
  planId?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: AdminOrder[];
  summary?: {
    totalRevenue: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
  };
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.status && params.status !== "all") query.append("status", params.status);
    if (params?.planId && params.planId !== "all") query.append("planId", params.planId);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`${API_BASE}/admin/orders?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi tải đơn hàng thanh toán" };
  }
}

export async function downloadOrdersCsv(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const res = await fetch(`${API_BASE}/admin/orders/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Không thể tải file CSV đơn hàng");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pickme3d_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ==========================================
// H. SLIDE PRESENTATION MODERATION APIS
// ==========================================

export async function fetchAdminPresentationsApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isPublic?: string;
}): Promise<{
  success: boolean;
  data?: AdminPresentation[];
  pagination?: PaginationMeta;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.isPublic && params.isPublic !== "all") query.append("isPublic", params.isPublic);

    const res = await fetch(`${API_BASE}/admin/presentations?${query.toString()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi tải bản trình chiếu" };
  }
}

export async function togglePresentationVisibilityApi(
  id: string,
  isPublic: boolean
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await fetch(`${API_BASE}/admin/presentations/${id}/visibility`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPublic }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi cập nhật hiển thị bản trình chiếu" };
  }
}

export async function deleteAdminPresentationApi(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/presentations/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi xóa bản trình chiếu" };
  }
}
