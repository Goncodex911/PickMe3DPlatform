// Đổi slide định dạng cũ (title/body/image theo %) sang cấu trúc phần tử của PPTist (px trên khung 1000 x 562.5),
// để một bộ hiển thị dùng chung cho cả hai. Bản gốc chạy trong studio: slide-editor/src/bridge/legacy.ts.

export const VIEWPORT = 1000;
export const RATIO = 0.5625;
const W = VIEWPORT;
const H = VIEWPORT * RATIO;

export interface LegacySlide {
  id?: string;
  layout?: string;
  title?: string;
  body?: string;
  image?: string;
  bg?: string;
  icons?: { name: string; x: number; y: number; size?: number; color?: string }[];
  [key: string]: unknown;
}

export interface RenderElement {
  type: string;
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  [key: string]: unknown;
}

export interface RenderSlide {
  id: string;
  elements: RenderElement[];
  background?: { type: string; color?: string; image?: { src: string; size?: string }; gradient?: { type: string; colors: { pos: number; color: string }[]; rotate: number } };
  remark?: string;
}

const DARK = { backgroundColor: "#151c2c", fontColor: "#f5f2ea", bodyColor: "#a8b0c0" };
const LIGHT = { backgroundColor: "#f6f1e8", fontColor: "#1b140f", bodyColor: "#6d645c" };

const BOXES: Record<string, { title: number[]; body: number[]; align?: string }> = {
  title: { title: [8, 30, 84], body: [8, 58, 70] },
  quote: { title: [12, 28, 76], body: [12, 66, 76], align: "center" },
  closing: { title: [10, 32, 80], body: [10, 58, 80], align: "center" },
  lookbook: { title: [8, 10, 50], body: [8, 30, 40] },
};
const DEFAULT_BOX = { title: [8, 16, 84], body: [8, 42, 76] };

function num(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function fit(left: number, width: number) {
  return Math.max(80, Math.min(width, W - left));
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function richText(text: string, size: number, opts: { bold?: boolean; italic?: boolean; align?: string }) {
  return String(text || "").split(/\n/).map((line) => {
    let inner = `<span style="font-size: ${size}px;">${escapeHtml(line) || "<br>"}</span>`;
    if (opts.italic) inner = `<em>${inner}</em>`;
    if (opts.bold) inner = `<strong>${inner}</strong>`;
    return `<p${opts.align ? ` style="text-align: ${opts.align};"` : ""}>${inner}</p>`;
  }).join("");
}

// Instrument Serif không có dấu tiếng Việt
function titleFont(value: unknown) {
  return typeof value === "string" && value && value !== "Instrument Serif" ? value : "Playfair Display";
}

export function isPptistSlide(slide: unknown): boolean {
  return Boolean(slide) && Array.isArray((slide as { elements?: unknown }).elements);
}

export function legacyToRender(slide: LegacySlide, index: number, mode: "dark" | "light" = "dark"): RenderSlide {
  const palette = mode === "light" ? LIGHT : DARK;
  const boxes = BOXES[slide.layout || ""] || DEFAULT_BOX;
  const elements: RenderElement[] = [];
  const titleSize = num(slide.titleSize, slide.layout === "quote" ? 44 : 48);
  const titleLeft = (num(slide.titleX, boxes.title[0]) / 100) * W;
  elements.push({
    type: "text",
    id: `t${index}`,
    left: titleLeft,
    top: (num(slide.titleY, boxes.title[1]) / 100) * H,
    width: fit(titleLeft, (num(slide.titleW, boxes.title[2]) / 100) * W),
    height: titleSize * 1.4 + 20,
    lineHeight: 1.1,
    content: richText(String(slide.title || ""), titleSize, {
      bold: Boolean(slide.titleBold),
      italic: slide.titleItalic != null ? Boolean(slide.titleItalic) : true,
      align: boxes.align,
    }),
    defaultFontName: titleFont(slide.titleFont),
    defaultColor: String(slide.titleColor || palette.fontColor),
  });
  if (slide.body) {
    const bodySize = num(slide.bodySize, 22);
    const bodyLeft = (num(slide.bodyX, boxes.body[0]) / 100) * W;
    elements.push({
      type: "text",
      id: `b${index}`,
      left: bodyLeft,
      top: (num(slide.bodyY, boxes.body[1]) / 100) * H,
      width: fit(bodyLeft, (num(slide.bodyW, boxes.body[2]) / 100) * W),
      height: bodySize * 1.5 * Math.max(1, String(slide.body).split(/\n/).length) + 20,
      lineHeight: 1.35,
      content: richText(String(slide.body), bodySize, { bold: Boolean(slide.bodyBold), italic: Boolean(slide.bodyItalic), align: boxes.align }),
      defaultFontName: String(slide.bodyFont || "Plus Jakarta Sans"),
      defaultColor: String(slide.bodyColor || palette.bodyColor),
    });
  }
  if (slide.image) {
    const imageLeft = (num(slide.imageX, 8) / 100) * W;
    elements.push({
      type: "image",
      id: `i${index}`,
      src: slide.image,
      left: imageLeft,
      top: (num(slide.imageY, 58) / 100) * H,
      width: fit(imageLeft, (num(slide.imageW, 52) / 100) * W),
      height: H * 0.34,
      radius: 12,
    });
  }
  for (const [n, icon] of (slide.icons || []).entries()) {
    const size = num(icon.size, 48);
    elements.push({
      type: "text",
      id: `c${index}-${n}`,
      left: (num(icon.x, 60) / 100) * W,
      top: (num(icon.y, 16) / 100) * H,
      width: size * 1.6,
      height: size * 1.4,
      content: `<p><span style="font-size: ${size}px;">${escapeHtml(String(icon.name))}</span></p>`,
      defaultFontName: "Material Symbols Rounded",
      defaultColor: icon.color || palette.fontColor,
    });
  }
  return {
    id: String(slide.id || `s${index}`),
    elements,
    background: { type: "solid", color: slide.bg || palette.backgroundColor },
    remark: typeof slide.notes === "string" ? slide.notes : undefined,
  };
}

// Mọi slide trong deck đều thành RenderSlide, bất kể định dạng nào
export function toRenderSlides(slides: unknown[], theme?: Record<string, unknown>): RenderSlide[] {
  const mode = theme?.mode === "light" ? "light" : "dark";
  return (slides || []).map((slide, index) => (isPptistSlide(slide) ? (slide as RenderSlide) : legacyToRender(slide as LegacySlide, index, mode)));
}

// Chữ thuần của slide (để làm tiêu đề trong dải slide và ghi chú)
export function slideHeadline(slide: RenderSlide) {
  const text = slide.elements.find((el) => el.type === "text" && typeof el.content === "string");
  return text ? String(text.content).replace(/<\/p>/g, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim() : "";
}
