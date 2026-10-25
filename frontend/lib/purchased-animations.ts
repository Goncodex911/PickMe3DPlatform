"use client";

import { UITemplate, translateTemplateSource, getCategoryLabel } from "./ui-marketplace-data";

const STORAGE_KEY = "pickme3d_purchased_templates";
const EVENT_KEY = "pickme3d_purchased_updated";

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

/** Purchase a template and notify listeners */
export function purchaseTemplate(template: UITemplate): boolean {
  if (typeof window === "undefined" || !template || !template.id) return false;
  try {
    const { html, js } = translateTemplateSource(template);
    const cat = getCategoryLabel(template.category);
    const cleanTitle = template.titleEn || template.title;
    const translatedTemplate = {
      ...template,
      category: cat,
      title: cleanTitle,
      titleEn: cleanTitle,
      html,
      js,
    };
    const current = getPurchasedTemplates();
    if (current.some((t) => t.id === template.id)) {
      return true; // already purchased
    }
    const updated = [translatedTemplate, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { template: translatedTemplate } }));
    return true;
  } catch (err) {
    console.error("Failed to save purchased template:", err);
    return false;
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
