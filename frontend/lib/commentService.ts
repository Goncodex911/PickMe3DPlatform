/**
 * Comment Service — API layer for comment features
 * Follows the same pattern as templateService.ts
 */

export interface CommentItem {
  _id: string;
  template: string;
  user: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentComment: string | null;
  likesCount: number;
  likedBy: string[];
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Fetches top-level comments for a template (paginated)
 */
export async function fetchCommentsApi(
  templateId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  comments: CommentItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    const url = new URL(`${API_BASE}/templates/${templateId}/comments`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    const res = await fetch(url.toString(), { cache: "no-store" });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          comments: json.data,
          total: json.total,
          page: json.page,
          totalPages: json.totalPages,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch comments:", err);
  }

  return { comments: [], total: 0, page: 1, totalPages: 0 };
}

/**
 * Fetches replies for a specific comment
 */
export async function fetchRepliesApi(commentId: string): Promise<CommentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/comments/${commentId}/replies`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch replies:", err);
  }

  return [];
}

/**
 * Creates a comment (or reply if parentComment is provided)
 */
export async function createCommentApi(
  templateId: string,
  content: string,
  parentComment?: string
): Promise<{ success: boolean; data?: CommentItem; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false, message: "Vui lòng đăng nhập để bình luận" };

  try {
    const res = await fetch(`${API_BASE}/templates/${templateId}/comments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, parentComment: parentComment || undefined }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, message: json.message || "Failed to create comment" };
  } catch (err) {
    console.warn("Failed to create comment:", err);
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
}

/**
 * Likes or unlikes a comment
 */
export async function toggleLikeCommentApi(
  commentId: string
): Promise<{ success: boolean; liked?: boolean; likesCount?: number }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false };

  try {
    const res = await fetch(`${API_BASE}/comments/${commentId}/like`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, liked: json.liked, likesCount: json.likesCount };
    }
  } catch {
    // Silently fail
  }
  return { success: false };
}

/**
 * Deletes a comment
 */
export async function deleteCommentApi(commentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}
