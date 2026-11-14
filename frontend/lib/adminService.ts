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

export type AccountType = "REGULAR" | "CREATOR";
export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "SUSPENDED";
export type TemplateReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "TAKEN_DOWN";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  accountType?: AccountType;
  creatorStatus?: CreatorStatus;
  creatorAppliedAt?: string | null;
  creatorReviewNote?: string;
  creatorApplication?: {
    displayName?: string;
    phone?: string;
    specialties?: string[];
    experience?: string;
    portfolioUrl?: string;
    sampleLinks?: string[];
    introduction?: string;
    bankBranch?: string;
    policyVersion?: string;
    policyAcceptedAt?: string | null;
    submittedAt?: string | null;
  };
  savedBankInfo?: { bankName?: string; accountNumber?: string; accountHolder?: string };
  creatorApplicationHistory?: Array<{ event: string; at: string; note?: string; code?: string }>;
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
  orderType?: "SUBSCRIPTION" | "TEMPLATE_PURCHASE" | "UI_PURCHASE";
  productId?: string;
  productTitle?: string;
  planId?: "pro" | "studio" | null;
  months?: number;
  templateId?: string | null;
  templateTitle?: string | null;
  templateThumbnail?: string | null;
  sellerId?: string | null;
  sellerName?: string;
  sellerEmail?: string;
  sellerType?: "ADMIN" | "CREATOR";
  transactionSource?: "TEMPLATE_SECTION" | "ADMIN_MARKETPLACE" | "SUBSCRIPTION";
  amount: number;
  grossAmount?: number;
  creatorEarnings?: number;
  adminRevenue?: number;
  discount?: number;
  promoCode?: string;
  status: AdminOrderStatus;
  displayStatus?: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string | null;
  paymentMode?: string;
  paidAmount?: number | null;
  gatewayReference?: string;
  gatewayStatus?: string;
  fulfillmentStatus?: "NONE" | "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  fulfillmentAttempts?: number;
  fulfillmentError?: string;
  needsReview?: boolean;
  reviewReason?: string;
  cancelReason?: string;
  customer?: { name?: string; email?: string };
  refund?: {
    status: "NONE" | "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
    reason?: string; amount?: number; requestedAt?: string | null; reviewedAt?: string | null;
    adminNote?: string; reference?: string; proof?: string; completedAt?: string | null;
  };
  excessReturn?: {
    status: "NONE" | "PENDING" | "COMPLETED" | "CANCELLED";
    type?: ExcessReturnType | "";
    amount?: number; receivedTotal?: number; keepOrderCode?: number | null; reason?: string;
    createdAt?: string | null; reference?: string; proof?: string; note?: string; completedAt?: string | null;
  };
  extraTransactions?: { reference: string; amount: number; at: string; source: string }[];
  statusHistory?: { from: string; to: string; at: string; source: string; note: string; actor?: { name?: string; email?: string } | null }[];
}

export type ExcessReturnType = "DUPLICATE_ORDER" | "OVERPAID" | "PARTIAL_PAYMENT";
export interface ExcessReturnOption { type: ExcessReturnType; amount: number; reason: string; keepOrderCode?: number }
export interface ExcessInfo {
  received: { total: number; local: number; gateway: number | null; source: string; gatewayError?: string } | null;
  options: ExcessReturnOption[];
  error?: string;
}

export type AdminOrderStatus = "PENDING" | "VERIFYING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED" | "REFUNDED" | "VOIDED";

export interface PaymentEventItem {
  _id: string;
  orderCode: number | null;
  type: string;
  source: string;
  result: string;
  message?: string;
  signatureValid?: boolean | null;
  amount?: number | null;
  gatewayStatus?: string;
  reference?: string;
  actor?: { name?: string; email?: string } | null;
  createdAt: string;
  payload?: any;
}

export interface ReconcileIssue {
  orderCode: number;
  code: string;
  message: string;
  status?: string;
  amount?: number;
  userId?: string;
  orders?: number[];
}

export interface ReconcileReport {
  summary: {
    from: string; to: string; checkedOrders: number; gatewayChecked: number; gatewayEnabled: boolean; truncated: boolean;
    totals: Record<string, number>; issueCount: number; issuesByCode: Record<string, number>;
  };
  issues: ReconcileIssue[];
  fixed: { orderCode: number; action: string; result: string }[];
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
  sellerType?: "ADMIN" | "CREATOR";
  price?: number;
  reviewStatus?: TemplateReviewStatus;
  reviewNote?: string;
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
  ticketType?: "REPORT" | "APPEAL";
  reporter?: { _id: string; name: string; email: string; picture?: string };
  reporterName: string;
  senderEmail?: string;
  targetType: "template" | "user" | "creator" | "review" | "comment" | "system" | "presentation" | string;
  targetId: string;
  targetTitle?: string;
  targetUrl?: string;
  reviewDetails?: {
    _id: string;
    templateId: string;
    templateTitle: string;
    templateThumbnail?: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    createdAt?: string;
  };
  appealCategory?: string;
  reason: string;
  description: string;
  attachments?: string[];
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
    totalGrossVolume?: number;
    totalAdminRevenue?: number;
    totalCreatorEarnings?: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    mrr?: number;
    breakdown?: any;
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


export interface PayoutItem {
  _id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  amount: number;
  creatorBalance: number;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  status: "PENDING" | "PAID" | "REJECTED";
  adminNote?: string;
  paymentProof?: string;
  processedAt?: string | null;
  processedBy?: { _id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthData {
  overall: "healthy" | "warning" | "error";
  timestamp: string;
  services: {
    database: {
      name: string;
      status: "operational" | "degraded" | "disconnected";
      latencyMs: number;
      readyState: number;
      host: string;
      error?: string | null;
    };
    storage: {
      name: string;
      status: "operational" | "degraded";
      cloudName: string;
      latency: number;
      details: string;
    };
    aiEngine: {
      name: string;
      status: "operational" | "degraded";
      provider: string;
      latency: number;
      details: string;
    };
    backend: {
      name: string;
      status: "operational";
      uptimeSeconds: number;
      nodeVersion: string;
      port: number | string;
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
      timestamp: string;
    };
  };
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
  creatorStatus?: string;
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
    if (params?.creatorStatus && params.creatorStatus !== "all") query.set("creatorStatus", params.creatorStatus);
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

/** Approve (APPROVED), suspend (SUSPENDED) or reject / revoke (NONE) Creator rights. Role stays 'user'. */
export interface CreatorRejectionInput {
  reasons: string[];
  requiredFields: string[];
  message: string;
  resubmitAfterDays: number;
}

export async function updateCreatorStatusApi(
  id: string,
  status: "APPROVED" | "SUSPENDED" | "NONE",
  note = "",
  rejection?: CreatorRejectionInput
): Promise<{ success: boolean; data?: Partial<AdminUser>; message?: string; errors?: Record<string, string> }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}/creator-status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, note, ...(rejection ? { rejection } : {}) }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

/** Marks a pending Creator application as "in review" (applicant sees it on their tracker). Idempotent. */
export async function startCreatorReviewApi(
  id: string
): Promise<{ success: boolean; stage?: string; history?: AdminUser["creatorApplicationHistory"]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}/creator-review`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

/** Marketplace moderation: approve / reject a Creator listing, or take any listing down. */
export async function reviewTemplateApi(
  id: string,
  decision: "APPROVED" | "REJECTED" | "TAKEN_DOWN",
  note = ""
): Promise<{ success: boolean; data?: AdminTemplate; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/templates/${id}/review`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ decision, note }),
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
  reviewStatus?: string;
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
    if (params?.reviewStatus && params.reviewStatus !== "all") query.set("reviewStatus", params.reviewStatus);
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
  ticketType?: string;
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
    if (params?.ticketType && params.ticketType !== "all") query.set("ticketType", params.ticketType);
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
  orderType?: string;
  sellerType?: string;
  transactionSource?: string;
  review?: boolean;
  refund?: string;
  excess?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: AdminOrder[];
  summary?: {
    totalRevenue: number;
    totalGrossVolume?: number;
    totalAdminRevenue?: number;
    totalCreatorEarnings?: number;
    totalRefunded?: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
    statusCounts?: Record<string, number>;
    needsReviewCount?: number;
    openRefundsCount?: number;
    excessReturned?: number;
    excessPendingAmount?: number;
    openExcessCount?: number;
    breakdown?: any;
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
    if (params?.orderType && params.orderType !== "all") query.append("orderType", params.orderType);
    if (params?.sellerType && params.sellerType !== "all") query.append("sellerType", params.sellerType);
    if (params?.transactionSource && params.transactionSource !== "all") query.append("transactionSource", params.transactionSource);
    if (params?.review) query.append("review", "true");
    if (params?.refund && params.refund !== "all") query.append("refund", params.refund);
    if (params?.excess && params.excess !== "all") query.append("excess", params.excess);
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
// PAYMENT OPERATIONS (verify, fulfillment retry, manual confirm, refunds, reconciliation)
// ==========================================

async function adminJson<T = any>(path: string, init: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers: getAuthHeaders(), cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && body.success !== false) return { success: false, message: body.message || body.error || `HTTP ${res.status}` };
    return { ...body, message: body.message || body.error };
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kết nối máy chủ" };
  }
}

export function fetchPaymentDetailApi(orderCode: number) {
  return adminJson<{ order: AdminOrder; events: PaymentEventItem[]; customer: any; excess?: ExcessInfo }>(`/admin/payments/${orderCode}`);
}

/** Return money collected by mistake (duplicate order / overpaid / partial payment). Not a refund. */
export function excessReturnApi(
  orderCode: number,
  body: { action: "CREATE" | "COMPLETE" | "CANCEL"; type?: ExcessReturnType; amount?: number; note?: string; reference?: string; proof?: string }
) {
  return adminJson<AdminOrder>(`/admin/payments/${orderCode}/excess-return`, { method: "POST", body: JSON.stringify(body) });
}

export function paymentActionApi(
  orderCode: number,
  action: "verify" | "retry-fulfillment" | "mark-paid" | "cancel" | "resolve-review",
  body: Record<string, unknown> = {}
) {
  return adminJson<AdminOrder>(`/admin/payments/${orderCode}/${action}`, { method: "POST", body: JSON.stringify(body) });
}

export function processRefundApi(
  orderCode: number,
  body: { action: "APPROVE" | "REJECT" | "COMPLETE"; note?: string; reference?: string; proof?: string; revokeAccess?: boolean }
) {
  return adminJson<AdminOrder>(`/admin/refunds/${orderCode}`, { method: "PUT", body: JSON.stringify(body) });
}

export function reconcilePaymentsApi(body: { from?: string; to?: string; autoFix?: boolean }) {
  return adminJson<ReconcileReport>(`/admin/payments/reconcile`, { method: "POST", body: JSON.stringify(body) });
}

export function fetchPaymentEventsApi(params: { type?: string; result?: string; orderCode?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "all") q.append(k, String(v)); });
  return adminJson<PaymentEventItem[]>(`/admin/payments/events?${q.toString()}`);
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

// ==========================================
// H. PAYOUTS & CREATOR EARNINGS APIS
// ==========================================

export async function fetchAdminPayoutsApi(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: PayoutItem[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      pendingCount: number;
      paidCount: number;
      rejectedCount: number;
      totalPendingAmount: number;
    };
  };
  message?: string;
}> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "all") searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    const url = `${API_BASE}/admin/payouts${qs ? "?" + qs : ""}`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi tải danh sách yêu cầu rút tiền" };
  }
}

export async function updatePayoutStatusApi(
  id: string,
  payload: { status: "PAID" | "REJECTED"; adminNote?: string; paymentProof?: string }
): Promise<{ success: boolean; data?: PayoutItem; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/payouts/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi cập nhật trạng thái rút tiền" };
  }
}

// ==========================================
// I. SYSTEM HEALTH MONITORING API
// ==========================================

export async function fetchSystemHealthApi(): Promise<{
  success: boolean;
  data?: SystemHealthData;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/system-health`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi kiểm tra trạng thái hệ thống" };
  }
}

// ==========================================
// J. DIRECT REVIEW MODERATION API
// ==========================================

export async function deleteAdminReviewApi(
  reviewId: string,
  templateId?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const query = templateId ? `?templateId=${encodeURIComponent(templateId)}` : "";
    const res = await fetch(`${API_BASE}/admin/reviews/${encodeURIComponent(reviewId)}${query}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || "Lỗi xóa đánh giá vi phạm" };
  }
}
