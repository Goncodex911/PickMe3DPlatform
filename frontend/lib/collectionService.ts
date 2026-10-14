/**
 * Collection Service — API layer for collection/board features
 * Follows the same pattern as templateService.ts
 */

import type { TemplateItem } from "./templateService";

export interface CollectionItem {
  _id: string;
  name: string;
  description: string;
  user: string | { _id: string; name: string; picture: string; username?: string };
  templates: (string | TemplateItem)[];
  coverImage: string;
  isPublic: boolean;
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
 * Fetches all collections of the current user
 */
export async function fetchMyCollectionsApi(): Promise<CollectionItem[]> {
  try {
    const res = await fetch(`${API_BASE}/collections`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch collections:", err);
  }
  return [];
}

/**
 * Fetches a single collection by ID (with populated templates)
 */
export async function fetchCollectionByIdApi(id: string): Promise<CollectionItem | null> {
  try {
    const res = await fetch(`${API_BASE}/collections/${id}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch collection:", err);
  }
  return null;
}

/**
 * Fetches public collections of a specific user
 */
export async function fetchUserPublicCollectionsApi(userId: string): Promise<CollectionItem[]> {
  try {
    const res = await fetch(`${API_BASE}/collections/user/${userId}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) return json.data;
    }
  } catch (err) {
    console.warn("Failed to fetch user collections:", err);
  }
  return [];
}

/**
 * Creates a new collection
 */
export async function createCollectionApi(payload: {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
}): Promise<{ success: boolean; data?: CollectionItem; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token) return { success: false, message: "Vui lòng đăng nhập" };

  try {
    const res = await fetch(`${API_BASE}/collections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, message: json.message || "Failed to create collection" };
  } catch {
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
}

/**
 * Updates a collection
 */
export async function updateCollectionApi(
  id: string,
  updates: Partial<Pick<CollectionItem, "name" | "description" | "isPublic" | "coverImage">>
): Promise<{ success: boolean; data?: CollectionItem; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/collections/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.success) return { success: true, data: json.data };
    return { success: false, message: json.message };
  } catch {
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
}

/**
 * Deletes a collection
 */
export async function deleteCollectionApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/collections/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}

/**
 * Adds a template to a collection
 */
export async function addTemplateToCollectionApi(
  collectionId: string,
  templateId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/templates`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ templateId }),
    });
    const json = await res.json();
    return { success: res.ok && json.success, message: json.message };
  } catch {
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
}

/**
 * Removes a template from a collection
 */
export async function removeTemplateFromCollectionApi(
  collectionId: string,
  templateId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/collections/${collectionId}/templates/${templateId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return false;
  }
}
