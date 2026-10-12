export interface TemplateReview {
  user: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface TemplateItem {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  galleryImages?: string[];
  author?: any;
  authorName: string;
  authorAvatar?: string;
  likesCount: number;
  viewsCount: number;
  forksCount?: number;
  isFeatured?: boolean;
  isPublic?: boolean;
  ratingsCount?: number;
  avgRating?: number;
  reviews?: TemplateReview[];
  likedBy?: string[];
  docData: any;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetches only real public templates from MongoDB Atlas + any local public designs
 */
export async function fetchTemplatesApi(params?: {
  category?: string;
  search?: string;
  sort?: string;
}): Promise<{ templates: TemplateItem[]; isOffline?: boolean }> {
  let serverList: TemplateItem[] = [];

  try {
    const url = new URL(`${API_BASE}/templates`);
    if (params?.category && params.category !== "All" && params.category !== "Tất cả") {
      url.searchParams.set("category", params.category);
    }
    if (params?.search) {
      url.searchParams.set("search", params.search);
    }
    if (params?.sort) {
      url.searchParams.set("sort", params.sort);
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        serverList = json.data;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch public templates from API:", err);
  }

  // Include locally created designs marked public
  let localPublic: TemplateItem[] = [];
  if (typeof window !== "undefined") {
    try {
      const myDesigns: TemplateItem[] = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
      localPublic = myDesigns.filter((d) => d.isPublic === true);
    } catch {}
  }

  const map = new Map<string, TemplateItem>();
  for (const item of serverList) {
    const key = (item._id || item.id)!;
    map.set(key, item);
  }
  for (const item of localPublic) {
    const key = (item._id || item.id)!;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  let list = Array.from(map.values());

  // Filter in-memory for search & category
  if (params?.category && params.category !== "All" && params.category !== "Tất cả") {
    list = list.filter((t) => t.category?.toLowerCase() === params.category!.toLowerCase());
  }
  if (params?.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (params?.sort === "likes") {
    list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else if (params?.sort === "rating") {
    list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0) || (b.ratingsCount || 0) - (a.ratingsCount || 0));
  } else if (params?.sort === "newest") {
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } else {
    // Trending
    list.sort((a, b) => (b.viewsCount || 0) + (b.likesCount || 0) * 2 - ((a.viewsCount || 0) + (a.likesCount || 0) * 2));
  }

  return { templates: list, isOffline: false };
}

/**
 * Fetches a single template by ID from local backup or API
 */
export async function fetchTemplateByIdApi(id: string): Promise<TemplateItem | null> {
  if (!id) return null;

  // 1. Check local user designs
  if (typeof window !== "undefined") {
    try {
      const myDesigns: TemplateItem[] = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
      const found = myDesigns.find((d) => (d._id && d._id === id) || (d.id && d.id === id));
      if (found) return found;
    } catch {}
  }

  // 2. Query MongoDB backend API
  try {
    const res = await fetch(`${API_BASE}/templates/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch template ${id} from API:`, err);
  }

  return null;
}

/**
 * Checks whether an author is followed by current user
 */
export function isAuthorFollowed(authorKey: string): boolean {
  if (typeof window === "undefined" || !authorKey) return false;
  try {
    const list: string[] = JSON.parse(localStorage.getItem("pickme3d_followed_authors") || "[]");
    return list.includes(authorKey);
  } catch {
    return false;
  }
}

/**
 * Toggles follow state for an author
 */
export function toggleFollowAuthor(authorKey: string): boolean {
  if (typeof window === "undefined" || !authorKey) return false;
  try {
    const list: string[] = JSON.parse(localStorage.getItem("pickme3d_followed_authors") || "[]");
    const exists = list.includes(authorKey);
    const updated = exists ? list.filter((k) => k !== authorKey) : [...list, authorKey];
    localStorage.setItem("pickme3d_followed_authors", JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

/**
 * Prepares the Canvas Editor localStorage session before navigation
 */
export function prepareEditorSession(template: TemplateItem, isEditMode: boolean = false) {
  if (typeof window === "undefined" || !template) return;
  const targetDoc = isEditMode
    ? template.docData
    : {
        ...template.docData,
        title: `${template.title} (Cover)`,
      };
  try {
    if (targetDoc) {
      localStorage.setItem("m3e:doc", JSON.stringify(targetDoc));
    }
    const id = template._id || template.id;
    if (isEditMode && id) {
      localStorage.setItem("pickme3d_edit_id", id);
      localStorage.setItem("pickme3d_edit_item", JSON.stringify(template));
    } else {
      localStorage.removeItem("pickme3d_edit_id");
      localStorage.removeItem("pickme3d_edit_item");
    }
  } catch {}
}

/**
 * Creates a URL for opening this template in the Canvas Editor
 */
export function getEditorLinkForTemplate(template: TemplateItem, isEditMode: boolean = false): string {
  const id = template._id || template.id || "current";
  return isEditMode ? `/editor?editId=${id}` : `/editor?coverId=${id}`;
}

/**
 * Creates a URL for covering/remixing this template in the Canvas Editor
 */
export function getCoverEditorLink(template: TemplateItem): string {
  const id = template._id || template.id || "current";
  return `/editor?coverId=${id}`;
}

/**
 * Saves/Publishes a design to MongoDB Atlas with local storage fallback
 */
export async function saveDesignApi(payload: {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  isPublic?: boolean;
  docData: any;
}): Promise<{ success: boolean; data?: TemplateItem; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const userStr = typeof window !== "undefined" ? localStorage.getItem("pickme3d_user") : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;

  try {
    if (token) {
      const res = await fetch(`${API_BASE}/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        saveToLocalBackup(json.data);
        return { success: true, data: json.data };
      }
    }
  } catch (err) {
    console.warn("Failed to save to backend API, using local backup:", err);
  }

  // Fallback to local storage
  const localItem: TemplateItem = {
    _id: "local_" + Date.now(),
    id: "local_" + Date.now(),
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "Outfit",
    tags: payload.tags || [],
    thumbnailUrl: payload.thumbnailUrl || "/hero/card-couture.png",
    authorName: currentUser?.name || "Bạn",
    authorAvatar: currentUser?.picture || "",
    likesCount: 0,
    viewsCount: 1,
    forksCount: 0,
    avgRating: 0,
    ratingsCount: 0,
    reviews: [],
    isPublic: payload.isPublic ?? true,
    docData: payload.docData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveToLocalBackup(localItem);
  return { success: true, data: localItem };
}

function saveToLocalBackup(item: TemplateItem) {
  if (typeof window === "undefined") return;
  try {
    const list: TemplateItem[] = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
    const existingIndex = list.findIndex((x) => (x._id && x._id === item._id) || (x.id && x.id === item.id));
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...item, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(item);
    }
    localStorage.setItem("pickme3d_my_designs", JSON.stringify(list));
  } catch {}
}

/**
 * Fetches all designs created by the current user
 */
export async function fetchMyDesignsApi(): Promise<TemplateItem[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  let serverList: TemplateItem[] = [];

  if (token) {
    try {
      const res = await fetch(`${API_BASE}/templates/my-templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        serverList = json.data;
      }
    } catch (err) {
      console.warn("Failed to fetch user designs from API:", err);
    }
  }

  // Merge with local designs
  let localList: TemplateItem[] = [];
  if (typeof window !== "undefined") {
    try {
      localList = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
    } catch {}
  }

  const map = new Map<string, TemplateItem>();
  for (const item of serverList) {
    const key = (item._id || item.id)!;
    map.set(key, item);
  }
  for (const item of localList) {
    const key = (item._id || item.id)!;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
}

/**
 * Updates a design's privacy (public/private), tags, or content
 */
export async function updateDesignApi(
  id: string,
  updates: Partial<TemplateItem>
): Promise<{ success: boolean; data?: TemplateItem }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;

  if (token && !id.startsWith("local_")) {
    try {
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        saveToLocalBackup(json.data);
        return { success: true, data: json.data };
      }
    } catch (err) {
      console.warn("Failed to update design on API:", err);
    }
  }

  // Update in local
  if (typeof window !== "undefined") {
    try {
      const list: TemplateItem[] = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
      const idx = list.findIndex((x) => x._id === id || x.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem("pickme3d_my_designs", JSON.stringify(list));
        return { success: true, data: list[idx] };
      }
    } catch {}
  }

  return { success: false };
}

/**
 * Deletes a design
 */
export async function deleteDesignApi(id: string): Promise<boolean> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;

  if (token && !id.startsWith("local_")) {
    try {
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        removeFromLocal(id);
        return true;
      }
    } catch (err) {
      console.warn("Failed to delete design from API:", err);
    }
  }

  removeFromLocal(id);
  return true;
}

function removeFromLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    const list: TemplateItem[] = JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]");
    const filtered = list.filter((x) => x._id !== id && x.id !== id);
    localStorage.setItem("pickme3d_my_designs", JSON.stringify(filtered));
  } catch {}
}

/**
 * Records a cover action on a template
 */
export async function trackCoverTemplateApi(id: string): Promise<void> {
  if (!id || id.startsWith("local_")) return;
  try {
    await fetch(`${API_BASE}/templates/${id}/cover`, {
      method: "POST",
    });
  } catch {}
}

/**
 * Likes or unlikes a template
 */
export async function toggleLikeTemplateApi(
  id: string
): Promise<{ success: boolean; liked?: boolean; likesCount?: number }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  if (!token || !id || id.startsWith("local_")) return { success: false };

  try {
    const res = await fetch(`${API_BASE}/templates/${id}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, liked: json.liked, likesCount: json.likesCount };
    }
  } catch {}
  return { success: false };
}

/**
 * Submits a rating (1-5 stars) and review comment for a template
 */
export async function addTemplateReviewApi(
  id: string,
  rating: number,
  comment?: string
): Promise<{
  success: boolean;
  data?: { avgRating: number; ratingsCount: number; reviews: TemplateReview[] };
  message?: string;
}> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const userStr = typeof window !== "undefined" ? localStorage.getItem("pickme3d_user") : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return { success: false, message: "Vui lòng đăng nhập để đánh giá mẫu thiết kế" };
  }

  if (id && !id.startsWith("local_")) {
    try {
      const res = await fetch(`${API_BASE}/templates/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data, message: json.message };
      }
      return { success: false, message: json.message || "Không thể lưu đánh giá" };
    } catch (err: any) {
      console.warn("Failed to add review on API:", err);
      return { success: false, message: "Lỗi kết nối máy chủ" };
    }
  }

  // Local fallback
  return {
    success: true,
    data: {
      avgRating: rating,
      ratingsCount: 1,
      reviews: [
        {
          user: currentUser?.id || "local",
          userName: currentUser?.name || "Bạn",
          userAvatar: currentUser?.picture || "",
          rating,
          comment: comment || "",
          createdAt: new Date().toISOString(),
        },
      ],
    },
    message: "Đã lưu đánh giá mẫu thiết kế",
  };
}
