import { KIND_ORDER, VARIANTS, groupBounds, normalizeTheme, type Doc, type Frame, type Group, type Item } from "./tokens";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Older community documents may omit fields that today's Canvas adds by default. */
export function previewDocument(value: unknown): Doc | null {
  if (!isRecord(value) || !Array.isArray(value.groups)) return null;
  const groups: Group[] = value.groups.flatMap((raw, groupIndex) => {
    if (!isRecord(raw) || !Array.isArray(raw.items)) return [];
    const items = raw.items.flatMap((item, index) => {
      if (!isRecord(item) || !KIND_ORDER.includes(item.kind as Item["kind"])) return [];
      return [{
        ...item,
        id: typeof item.id === "string" ? item.id : `preview-item-${groupIndex}-${index}`,
        label: typeof item.label === "string" ? item.label : "",
        icon: typeof item.icon === "string" ? item.icon : null,
        variant: VARIANTS.some((variant) => variant.key === item.variant) ? item.variant : "filled",
        size: finite(item.size) && item.size > 0 ? item.size : undefined,
        size2: finite(item.size2) && item.size2 > 0 ? item.size2 : undefined,
      } as Item];
    });
    if (!items.length) return [];
    return [{ ...raw, id: typeof raw.id === "string" ? raw.id : `preview-group-${groupIndex}`, x: finite(raw.x) ? raw.x : 0, y: finite(raw.y) ? raw.y : 0, axis: raw.axis === "y" ? "y" : "x", items } as Group];
  });
  if (!groups.length) return null;

  const frames: Frame[] = Array.isArray(value.frames) ? value.frames.flatMap((frame, index) => {
    if (!isRecord(frame) || !finite(frame.x) || !finite(frame.y)) return [];
    return [{ ...frame, id: typeof frame.id === "string" ? frame.id : `preview-frame-${index}`, name: typeof frame.name === "string" ? frame.name : "Canvas", w: finite(frame.w) && frame.w > 0 ? frame.w : undefined, h: finite(frame.h) && frame.h > 0 ? frame.h : undefined } as Frame];
  }) : [];

  if (!frames.length) {
    const bounds = groups.map((group) => groupBounds(group, {}));
    const x = Math.min(...bounds.map((box) => box.l)) - 20;
    const y = Math.min(...bounds.map((box) => box.t)) - 20;
    frames.push({ id: "preview-frame", name: "Canvas", x, y, w: Math.max(100, Math.max(...bounds.map((box) => box.r)) - x + 20), h: Math.max(100, Math.max(...bounds.map((box) => box.b)) - y + 20) });
  }

  return { ...value, groups, frames, title: typeof value.title === "string" ? value.title : "", brief: typeof value.brief === "string" ? value.brief : "", paletteKey: typeof value.paletteKey === "string" ? value.paletteKey : "purple", frame: value.frame === "blank" ? "blank" : "phone", theme: normalizeTheme(isRecord(value.theme) ? value.theme : undefined) } as Doc;
}

export function isDesignCover(source?: string) {
  return Boolean(source?.trim()) && !/\/hero\/card-couture\.png(?:[?#].*)?$/.test(source || "");
}
