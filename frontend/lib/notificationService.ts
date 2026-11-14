/**
 * Notification Service — API layer for notification features
 * Follows the same pattern as templateService.ts
 */

import { apiFetch } from "./paymentService";

export interface NotificationItem {
  _id: string;
  recipient: string;
  actor?: {
    _id: string;
    name: string;
    picture?: string;
  } | null;
  type:
    | 'like'
    | 'fork'
    | 'review'
    | 'comment'
    | 'reply'
    | 'payout_request'
    | 'payout_paid'
    | 'payout_rejected'
    | 'report_submitted'
    | 'report_resolved'
    | 'appeal_submitted'
    | 'appeal_resolved'
    | 'system'
    | string;
  template?: {
    _id: string;
    title: string;
    thumbnailUrl: string;
  };
  link?: string;
  metadata?: Record<string, any>;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/**
 * Fetches paginated notifications for the current user
 */
export async function fetchNotificationsApi(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}> {
  try {
    const url = new URL(`${API_BASE}/notifications`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    const res = await apiFetch(url.toString());

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          notifications: json.data,
          total: json.total,
          unreadCount: json.unreadCount,
          page: json.page,
          totalPages: json.totalPages,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch notifications:", err);
  }

  return { notifications: [], total: 0, unreadCount: 0, page: 1, totalPages: 0 };
}

/**
 * Gets the count of unread notifications
 */
export async function fetchUnreadCountApi(): Promise<number> {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/unread-count`);

    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.unreadCount;
    }
  } catch (err) {
    console.warn("Failed to fetch unread count:", err);
  }
  return 0;
}

/**
 * Marks a single notification as read
 */
export async function markNotificationReadApi(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH" });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}

/**
 * Marks all notifications as read
 */
export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/read-all`, { method: "PATCH" });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}
