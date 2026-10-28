// Google Analytics 4 (GA4) Tracking Library for PickMe3D Platform

export const DEFAULT_GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-PICKME3D01";

export const DEFAULT_GA_PROPERTY_ID =
  process.env.NEXT_PUBLIC_GA_PROPERTY_ID || "";

export const DEFAULT_LOOKER_STUDIO_URL =
  process.env.NEXT_PUBLIC_GA_LOOKER_STUDIO_URL ||
  "https://lookerstudio.google.com/embed/reporting/1Wj5Gq9k-V0m8jWwGkXyZ7_demo/page/1M";

/**
 * Get active GA Measurement ID (support runtime override by admin)
 */
export function getActiveMeasurementId(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pickme3d_ga_measurement_id");
    if (saved && saved.trim().startsWith("G-")) {
      return saved.trim();
    }
  }
  return DEFAULT_GA_MEASUREMENT_ID;
}

/**
 * Get active Looker Studio embed URL
 */
export function getActiveLookerStudioUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pickme3d_looker_studio_url");
    if (saved && saved.trim().startsWith("https://")) {
      return saved.trim();
    }
  }
  return DEFAULT_LOOKER_STUDIO_URL;
}

/**
 * Track Page Views
 */
export function pageview(url: string, title?: string): void {
  if (typeof window === "undefined" || !(window as any).gtag) return;
  const measurementId = getActiveMeasurementId();

  (window as any).gtag("config", measurementId, {
    page_path: url,
    page_title: title || document.title,
  });
}

/**
 * Track Custom Events
 */
export interface GTagEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export function event({ action, category, label, value, ...params }: GTagEvent): void {
  if (typeof window === "undefined" || !(window as any).gtag) return;

  (window as any).gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
    ...params,
  });
}

/**
 * Specialized tracking helpers for PickMe3D Platform
 */
export const trackEvent = {
  login: (method: "google" | "admin" | "guest", userEmail?: string) => {
    event({
      action: "login",
      category: "Authentication",
      label: method,
      user_method: method,
      has_email: Boolean(userEmail),
    });
  },

  viewTemplate: (templateId: string, title?: string, category?: string) => {
    event({
      action: "view_item",
      category: "3D Templates",
      label: title || templateId,
      item_id: templateId,
      item_name: title,
      item_category: category,
    });
  },

  createTemplate: (title: string, category: string, isSystem = false) => {
    event({
      action: "create_template",
      category: "3D Templates",
      label: title,
      template_category: category,
      is_system: isSystem,
    });
  },

  export3D: (format: string, modelName?: string) => {
    event({
      action: "export_3d_model",
      category: "3D Canvas",
      label: format,
      file_format: format,
      model_name: modelName,
    });
  },

  checkoutPlan: (plan: "pro" | "studio", months: number, amount: number) => {
    event({
      action: "begin_checkout",
      category: "PayOS Billing",
      label: plan,
      plan_name: plan,
      months,
      value: amount,
      currency: "VND",
    });
  },

  adminAction: (actionType: string, targetType: string, targetId?: string) => {
    event({
      action: "admin_action",
      category: "Admin Operations",
      label: actionType,
      target_type: targetType,
      target_id: targetId,
    });
  },

  adminPingTest: () => {
    event({
      action: "admin_ping_test",
      category: "Health Check",
      label: "GA4 Live Connectivity Ping",
      timestamp: new Date().toISOString(),
    });
  },
};
