/**
 * User Service — API layer for user profile features
 * Follows the same pattern as templateService.ts
 */

import { apiFetch } from "./paymentService";

export interface CreatorReview {
  _id?: string;
  user: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface PublicUserProfile {
  user: {
    _id: string;
    name: string;
    picture: string;
    googlePicture?: string;
    bio: string;
    jobRole: string;
    username: string;
    createdAt: string;
    avgRating?: number;
    ratingsCount?: number;
    reviews?: CreatorReview[];
  };
  stats: {
    totalDesigns: number;
    totalLikes: number;
    totalForks: number;
    totalViews: number;
    avgRating?: number;
    ratingsCount?: number;
  };
  templates?: Array<{
    _id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnailUrl: string;
    galleryImages?: string[];
    author?: any;
    authorName?: string;
    authorAvatar?: string;
    docData?: unknown;
    likesCount: number;
    viewsCount: number;
    forksCount: number;
    avgRating: number;
    ratingsCount?: number;
    reviews?: any[];
    createdAt: string;
  }>;
}

/**
 * Builds the URL to a Creator's public profile page using username (preferred), user ID, or name fallback.
 */
export function getCreatorProfileHref(author?: any, fallbackNameOrId?: string): string | null {
  const username =
    typeof author === "object" && author && typeof author.username === "string"
      ? author.username.trim()
      : "";
  if (username) {
    return `/creator/?username=${encodeURIComponent(username)}`;
  }

  const rawId =
    typeof author === "string"
      ? author.trim()
      : typeof author === "object" && author
      ? String(author._id || author.id || "").trim()
      : "";

  if (rawId && !rawId.startsWith("local_")) {
    return `/creator/?id=${encodeURIComponent(rawId)}`;
  }

  const cleanFallback = (fallbackNameOrId || "").trim();
  if (
    cleanFallback &&
    !cleanFallback.startsWith("local_") &&
    cleanFallback.toLowerCase() !== "pickme3d community" &&
    cleanFallback !== "Bạn"
  ) {
    if (/^[0-9a-fA-F]{24}$/.test(cleanFallback)) {
      return `/creator/?id=${encodeURIComponent(cleanFallback)}`;
    }
    return `/creator/?username=${encodeURIComponent(cleanFallback)}`;
  }

  return null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/** Fetches the signed-in user's latest saved profile, including their Google photo. */
export async function fetchMyProfileApi(): Promise<Record<string, any> | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return null;

  try {
    const res = await apiFetch(`${API_BASE}/users/profile`);
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
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/public`, {
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
 * Submits or updates a rating (1-5 stars) and review comment for a Creator profile
 */
export async function addCreatorReviewApi(
  creatorId: string,
  rating: number,
  comment?: string
): Promise<{
  success: boolean;
  data?: { avgRating: number; ratingsCount: number; reviews: CreatorReview[] };
  message?: string;
}> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) {
    return { success: false, message: "Sign in to review this creator." };
  }

  try {
    const res = await apiFetch(`${API_BASE}/users/${encodeURIComponent(creatorId)}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data, message: json.message };
    }
    if (res.status === 401) {
      return { success: false, message: "Your session has expired. Please sign in again." };
    }
    return { success: false, message: json.message || "Could not submit the review right now." };
  } catch {
    return { success: false, message: "Could not connect to the server." };
  }
}

/**
 * Deletes a review from a Creator profile (Admin or review author)
 */
export async function deleteCreatorReviewApi(
  creatorId: string,
  reviewId: string
): Promise<{
  success: boolean;
  data?: { avgRating: number; ratingsCount: number; reviews: CreatorReview[] };
  message?: string;
}> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) {
    return { success: false, message: "Please sign in." };
  }

  try {
    const res = await apiFetch(
      `${API_BASE}/users/${encodeURIComponent(creatorId)}/review/${encodeURIComponent(reviewId)}`,
      {
        method: "DELETE",
      }
    );
    const json = await res.json();
    if (res.status === 401) {
      return { success: false, message: "Your session has expired. Please sign in again." };
    }
    return json;
  } catch (err: any) {
      return { success: false, message: err?.message || "Could not connect to the server." };
  }
}

/**
 * Updates the current user's profile
 */
export async function updateMyProfileApi(
  updates: Partial<{ name: string; bio: string; username: string; jobRole: string; picture: string }>
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false, message: "Please sign in." };

  try {
    const res = await apiFetch(`${API_BASE}/users/profile`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, message: json.message || "Failed to update profile" };
  } catch {
    return { success: false, message: "Could not connect to the server." };
  }
}
