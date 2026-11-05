"use client";

import { UITemplate, translateTemplateSource, getCategoryLabel } from "./ui-marketplace-data";

const STORAGE_KEY = "pickme3d_purchased_templates";
const EVENT_KEY = "pickme3d_purchased_updated";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

let catalogCache: UITemplate[] | null = null;

async function getFullCatalog(): Promise<UITemplate[]> {
  if (catalogCache && catalogCache.length > 0) return catalogCache;
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/ux-full-catalog.json");
    if (!res.ok) return [];
    catalogCache = await res.json();
    return catalogCache || [];
  } catch (err) {
    console.error("Failed to load ux-full-catalog for sync:", err);
    return [];
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("pickme3d_token");
  } catch {
    return null;
  }
}

/** Get all purchased templates from localStorage */
export function getPurchasedTemplates(): UITemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    let updatedNeeded = false;
    const translatedList = list.map((item: UITemplate) => {
      const { html, js } = translateTemplateSource(item);
      const cat = getCategoryLabel(item.category);
      const cleanTitle = item.titleEn || item.title;
      if (html !== item.html || js !== item.js || item.category !== cat || item.title !== cleanTitle) {
        updatedNeeded = true;
      }
      return {
        ...item,
        category: cat,
        title: cleanTitle,
        titleEn: cleanTitle,
        html,
        js,
      };
    });
    if (updatedNeeded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(translatedList));
      } catch {}
    }
    return translatedList;
  } catch (err) {
    console.error("Failed to read purchased templates:", err);
    return [];
  }
}

/** Get list of purchased template IDs */
export function getPurchasedTemplateIds(): string[] {
  return getPurchasedTemplates().map((t) => t.id);
}

/** Check if a template has been purchased */
export function isTemplatePurchased(id: string): boolean {
  if (!id) return false;
  return getPurchasedTemplateIds().includes(id);
}

/** Purchase a template and notify listeners (with auto-sync to MongoDB if logged in) */
export function purchaseTemplate(template: UITemplate): boolean {
  if (typeof window === "undefined" || !template || !template.id) return false;
  try {
    const { html, js } = translateTemplateSource(template);
    const cat = getCategoryLabel(template.category);
    const cleanTitle = template.titleEn || template.title;
    const translatedTemplate: UITemplate = {
      ...template,
      category: cat,
      title: cleanTitle,
      titleEn: cleanTitle,
      html,
      js,
    };

    const current = getPurchasedTemplates();
    const already = current.some((t) => t.id === template.id);
    if (!already) {
      const updated = [translatedTemplate, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { template: translatedTemplate } }));
    }

    // Background sync to MongoDB if authenticated
    const token = getAuthToken();
    if (token) {
      void fetch(`${API_BASE}/marketplace/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: template.id,
          templateTitle: cleanTitle,
          category: cat,
          price: 0,
        }),
      }).catch((err) => {
        console.warn("Background purchase sync failed, stored in localStorage:", err);
      });
    }

    return true;
  } catch (err) {
    console.error("Failed to save purchased template:", err);
    return false;
  }
}

/** Async purchase API directly returning server response */
export async function purchaseTemplateApi(template: UITemplate): Promise<{ success: boolean; message?: string }> {
  const localOk = purchaseTemplate(template);
  const token = getAuthToken();
  if (!token) {
    return { success: localOk, message: "Đã lưu bản quyền cục bộ" };
  }

  try {
    const cleanTitle = template.titleEn || template.title;
    const cat = getCategoryLabel(template.category);
    const res = await fetch(`${API_BASE}/marketplace/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        templateId: template.id,
        templateTitle: cleanTitle,
        category: cat,
        price: 0,
      }),
    });
    const data = await res.json();
    return { success: data.success ?? true, message: data.message };
  } catch (err: any) {
    return { success: localOk, message: err?.message || "Lỗi đồng bộ máy chủ" };
  }
}

/** Synchronize purchased templates bidirectionally between client cache and MongoDB */
export async function syncPurchasedTemplatesWithServer(): Promise<UITemplate[]> {
  if (typeof window === "undefined") return [];
  const token = getAuthToken();
  if (!token) return getPurchasedTemplates();

  try {
    const localTemplates = getPurchasedTemplates();

    // Push unsynced local purchases to server
    if (localTemplates.length > 0) {
      await fetch(`${API_BASE}/marketplace/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: localTemplates.map((t) => ({
            id: t.id,
            title: t.titleEn || t.title,
            category: t.category,
          })),
        }),
      }).catch(() => {});
    }

    // Fetch full purchased list from server
    const res = await fetch(`${API_BASE}/marketplace/my-purchases`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return localTemplates;
    const json = await res.json();
    const serverTemplateIds: string[] = Array.isArray(json.templateIds) ? json.templateIds : [];

    if (serverTemplateIds.length === 0) return localTemplates;

    // Load full catalog to reconstruct missing template objects
    const catalog = await getFullCatalog();
    const catalogMap = new Map<string, UITemplate>();
    for (const item of catalog) {
      catalogMap.set(item.id, item);
    }

    const mergedMap = new Map<string, UITemplate>();
    for (const t of localTemplates) {
      mergedMap.set(t.id, t);
    }

    for (const id of serverTemplateIds) {
      if (!mergedMap.has(id)) {
        const fromCat = catalogMap.get(id);
        if (fromCat) {
          const { html, js } = translateTemplateSource(fromCat);
          mergedMap.set(id, {
            ...fromCat,
            category: getCategoryLabel(fromCat.category),
            title: fromCat.titleEn || fromCat.title,
            titleEn: fromCat.titleEn || fromCat.title,
            html,
            js,
          });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { templates: mergedList } }));
    return mergedList;
  } catch (err) {
    console.error("Failed to sync purchased templates with server:", err);
    return getPurchasedTemplates();
  }
}

/** Subscribe to purchased templates changes */
export function subscribePurchasedTemplates(callback: (templates: UITemplate[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback(getPurchasedTemplates());
  };
  window.addEventListener(EVENT_KEY, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_KEY, handler);
    window.removeEventListener("storage", handler);
  };
}
