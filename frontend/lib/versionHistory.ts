export interface VersionStats {
  frameCount: number;
  nodeCount: number;
  wireCount: number;
}

export interface DesignVersionItem {
  _id: string;
  templateId: string;
  versionName: string;
  versionNumber: number;
  description?: string;
  authorName?: string;
  thumbnailUrl?: string;
  stats: VersionStats;
  isSnapshot: boolean;
  isRollback?: boolean;
  rollbackFromVersion?: string;
  createdAt: string | number;
  docData?: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export function computeDocDataStats(docData: any): VersionStats {
  let frameCount = 0;
  let nodeCount = 0;
  let wireCount = 0;

  if (docData && typeof docData === "object") {
    if (Array.isArray(docData.frames)) {
      frameCount = docData.frames.length;
      docData.frames.forEach((f: any) => {
        if (f.action?.to) wireCount++;
        if (f.swipes) {
          Object.values(f.swipes).forEach((s: any) => {
            if (s?.to) wireCount++;
          });
        }
      });
    }
    if (Array.isArray(docData.groups)) {
      docData.groups.forEach((g: any) => {
        if (Array.isArray(g.items)) {
          nodeCount += g.items.length;
          g.items.forEach((it: any) => {
            if (it.action?.to) wireCount++;
          });
        }
      });
    }
  }

  return { frameCount, nodeCount, wireCount };
}

// ─── Local Storage Cache Helpers ───────────────────────────────────────────
function getLocalKey(templateId: string): string {
  return `pickme3d_versions_${templateId || "draft"}`;
}

export function getLocalVersions(templateId: string): DesignVersionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getLocalKey(templateId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to read versions from localStorage", err);
    return [];
  }
}

export function saveLocalVersion(
  templateId: string,
  docData: any,
  versionName: string,
  description = "",
  isSnapshot = false,
  isRollback = false
): DesignVersionItem {
  const versions = getLocalVersions(templateId);
  const nextNum = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber || 0)) + 1 : 1;
  const stats = computeDocDataStats(docData);

  const newVer: DesignVersionItem = {
    _id: `local_v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    templateId: templateId || "draft",
    versionName: versionName || (isSnapshot ? `Snapshot V${nextNum}` : `Auto-save #${nextNum}`),
    versionNumber: nextNum,
    description,
    authorName: "You",
    stats,
    isSnapshot,
    isRollback,
    createdAt: Date.now(),
    docData,
  };

  const updated = [newVer, ...versions].slice(0, 50); // Keep latest 50
  try {
    localStorage.setItem(getLocalKey(templateId), JSON.stringify(updated));
  } catch (err) {
    console.warn("localStorage quota exceeded for versions", err);
  }
  return newVer;
}

// ─── API Remote Sync Helpers ───────────────────────────────────────────────
export async function fetchRemoteVersions(
  templateId: string,
  token?: string | null
): Promise<DesignVersionItem[]> {
  if (!templateId || templateId === "draft") {
    return getLocalVersions(templateId);
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/templates/${templateId}/versions`, { headers });
    if (!res.ok) {
      // Fallback to local
      return getLocalVersions(templateId);
    }
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return getLocalVersions(templateId);
  } catch (err) {
    console.warn("Error fetching remote versions, falling back to local cache", err);
    return getLocalVersions(templateId);
  }
}

export async function fetchVersionDetail(
  templateId: string,
  versionId: string,
  token?: string | null
): Promise<DesignVersionItem | null> {
  // If local id
  if (versionId.startsWith("local_v_")) {
    const locals = getLocalVersions(templateId);
    return locals.find((v) => v._id === versionId) || null;
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/templates/${templateId}/versions/${versionId}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.warn("Error fetching version detail", err);
    return null;
  }
}

export async function createRemoteVersion(
  templateId: string,
  docData: any,
  versionName: string,
  description = "",
  isSnapshot = false,
  token?: string | null
): Promise<DesignVersionItem> {
  // Always create a local copy first for resilience
  const localVer = saveLocalVersion(templateId, docData, versionName, description, isSnapshot);

  if (!templateId || templateId === "draft") {
    return localVer;
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/templates/${templateId}/versions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        versionName,
        description,
        docData,
        isSnapshot,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (err) {
    console.warn("Failed to create version on server, saved locally", err);
  }

  return localVer;
}

export async function rollbackRemoteVersion(
  templateId: string,
  versionId: string,
  currentDocData: any,
  token?: string | null
): Promise<{ success: boolean; docData?: any; message?: string }> {
  // 1. Create a safety backup locally first
  saveLocalVersion(
    templateId,
    currentDocData,
    `Safety Backup before Rollback`,
    `Auto-created recovery checkpoint before restoring version ${versionId}`,
    true,
    true
  );

  // If local version ID or offline/draft
  if (versionId.startsWith("local_v_") || !templateId || templateId === "draft") {
    const locals = getLocalVersions(templateId);
    const target = locals.find((v) => v._id === versionId);
    if (!target || !target.docData) {
      return { success: false, message: "Target local version docData not found" };
    }
    return { success: true, docData: target.docData };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/templates/${templateId}/versions/${versionId}/rollback`, {
      method: "POST",
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return { success: true, docData: json.data.currentDocData };
      }
    }
  } catch (err) {
    console.warn("Server rollback failed, checking local cache", err);
  }

  // Fallback to local detail if remote call failed
  const detail = await fetchVersionDetail(templateId, versionId, token);
  if (detail?.docData) {
    return { success: true, docData: detail.docData };
  }

  return { success: false, message: "Could not restore version data" };
}

