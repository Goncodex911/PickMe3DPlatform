// Google Analytics 4 (GA4) Tracking - Đã tắt / Vô hiệu hóa
// Giữ lại các hàm no-op để tránh lỗi runtime tại các component gọi trackEvent

export const DEFAULT_GA_MEASUREMENT_ID = "";
export const DEFAULT_GA_PROPERTY_ID = "";
export const DEFAULT_LOOKER_STUDIO_URL = "";

export function getActiveMeasurementId(): string {
  return "";
}

export function getActiveLookerStudioUrl(): string {
  return "";
}

export function pageview(_url: string, _title?: string): void {
  // GA4 reporting disabled
}

export interface GTagEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export function event(_params: GTagEvent): void {
  // GA4 reporting disabled
}

export const trackEvent = {
  login: (_method: "google" | "admin" | "guest" | "email", _userEmail?: string) => {},
  register: (_method: "google" | "email") => {},
  viewItem: (_item: { id: string; name: string; category?: string; price?: number }) => {},
  beginCheckout: (_plan: { name: string; price: number }) => {},
  purchase: (_order: { id: string; revenue: number; planName?: string }) => {},
  createDesign: (_design: { id: string; name: string; templateSource?: string }) => {},
  exportDesign: (_format: "png" | "jpg" | "pdf" | "json") => {},
  search: (_searchTerm: string) => {},
  reportSubmitted: (_reportId: string, _category?: string) => {},
  adminAction: (_action: string, _target?: string) => {},
  adminPingTest: () => {},
};
