/**
 * User Service — API layer for user profile features
 * Follows the same pattern as templateService.ts
 */

export interface PublicUserProfile {
  user: {
    _id: string;
    name: string;
    picture: string;
    bio: string;
    jobRole: string;
    username: string;
    createdAt: string;
  };
  stats: {
    totalDesigns: number;
    totalLikes: number;
    totalForks: number;
    totalViews: number;
  };
  templates?: Array<{
    _id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnailUrl: string;
    likesCount: number;
    viewsCount: number;
    forksCount: number;
    avgRating: number;
    createdAt: string;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Fetches the signed-in user's latest saved profile, including their Google photo. */
export async function fetchMyProfileApi(): Promise<Record<string, any> | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    return res.ok && json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/** Merge the server profile into the cached login object without dropping its auth identity. */
export function mergeCurrentUserProfile(
  cachedUser: Record<string, any>,
  profile: Record<string, any>,
): Record<string, any> {
  const googlePicture = profile.googlePicture || cachedUser.googlePicture || "";
  return {
    ...cachedUser,
    ...profile,
    id: profile._id || cachedUser.id,
    picture: profile.picture || cachedUser.picture || googlePicture,
    googlePicture,
  };
}

/**
 * Fetches a public profile by username
 */
export async function fetchPublicProfileByUsernameApi(
  username: string
): Promise<PublicUserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/users/username/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch public profile:", err);
  }
  return null;
}

/**
 * Fetches a public profile by user ID
 */
export async function fetchPublicProfileByIdApi(
  userId: string
): Promise<PublicUserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/public`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch public profile:", err);
  }
  return null;
}

/**
 * Updates the current user's profile
 */
export async function updateMyProfileApi(
  updates: Partial<{ name: string; bio: string; username: string; jobRole: string; picture: string }>
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false, message: "Vui lòng đăng nhập" };

  try {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, message: json.message || "Failed to update profile" };
  } catch {
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
}
