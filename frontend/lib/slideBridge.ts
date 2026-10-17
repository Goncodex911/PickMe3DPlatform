// Studio là PPTist (thư mục slide-editor), build vào public/slide-studio nên chạy cùng origin với app.
// NEXT_PUBLIC_SLIDE_STUDIO_URL chỉ dùng khi muốn trỏ sang `npm run dev` của studio (http://localhost:5174/).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const STUDIO_URL = process.env.NEXT_PUBLIC_SLIDE_STUDIO_URL || `${BASE_PATH}/slide-studio/index.html`;

export function studioOrigin() {
  if (typeof window === "undefined") return "";
  return new URL(STUDIO_URL, window.location.href).origin;
}

const STUDIO_TYPES = new Set(["PM_READY", "PM_SAVE", "PM_REQUEST_FEATURE", "PM_SAVE_STATUS"]);

export interface StudioSave {
  type: "PM_SAVE";
  slides: unknown[];
  theme: Record<string, unknown>;
  thumbnail?: string;
  title?: string;
  requestId?: string;
}

export interface StudioFeatureRequest {
  type: "PM_REQUEST_FEATURE";
  feature: "export-pptx" | "ai-slide" | "private" | "brand" | string;
  topic?: string;
}

export interface StudioSaveStatus {
  type: "PM_SAVE_STATUS";
  status: "saving" | "skipped";
  requestId?: string;
}

export type StudioMessage = { type: "PM_READY" } | StudioSave | StudioFeatureRequest | StudioSaveStatus;

export function isTrustedOrigin(origin: string, allowed = studioOrigin()) {
  return origin === allowed;
}

export function parseStudioMessage(data: unknown): StudioMessage | null {
  if (!data || typeof data !== "object") return null;
  const type = (data as { type?: unknown }).type;
  if (typeof type !== "string" || !STUDIO_TYPES.has(type)) return null;
  if (type === "PM_SAVE" && !Array.isArray((data as { slides?: unknown }).slides)) return null;
  return data as StudioMessage;
}

export function isPptistDeck(slides: unknown) {
  return Array.isArray(slides) && slides.length > 0 && slides.every((slide) => Array.isArray((slide as { elements?: unknown })?.elements));
}

export function buildInitMessage(input: {
  deck: unknown;
  plan: string;
  user: { name?: string } | null;
  designs: unknown[];
  brandTheme?: unknown;
  features?: { exportPptx?: boolean; watermark?: boolean };
}) {
  return {
    type: "PM_INIT" as const,
    deck: input.deck,
    plan: input.plan,
    user: input.user ? { name: input.user.name || "" } : null,
    brandTheme: input.brandTheme || null,
    locale: "vi",
    designs: input.designs,
    features: input.features || null,
  };
}
