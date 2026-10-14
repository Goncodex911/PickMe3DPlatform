/**
 * Notification Service — API layer for notification features
 * Follows the same pattern as templateService.ts
 */

export interface NotificationItem {
  _id: string;
  recipient: string;
  actor: {
    _id: string;
    name: string;
    picture: string;
  };
  type: 'like' | 'fork' | 'review' | 'comment' | 'reply';
  template?: {
    _id: string;
    title: string;
    thumbnailUrl: string;
  };
  message: string;
  isRead: boolean;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

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

    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

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
    const res = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

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
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
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
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}
