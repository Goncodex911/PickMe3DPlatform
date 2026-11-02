import { describe, expect, it } from "vitest";
import { isDesignCover, previewDocument } from "./designPreview";

describe("saved design previews", () => {
  it("normalizes legacy components without changing their saved position or content", () => {
    const source = { groups: [{ id: "g", x: 24, y: 80, axis: "y", items: [{ id: "text", kind: "text", label: "My design" }] }], frames: [{ id: "f", name: "Desktop", x: 0, y: 0, w: 1280, h: 800 }] };
    const doc = previewDocument(source)!;
    expect(doc.groups[0]).toMatchObject({ x: 24, y: 80, axis: "y" });
    expect(doc.groups[0].items[0]).toMatchObject({ label: "My design", icon: null, variant: "filled" });
    expect(doc.frames[0]).toMatchObject({ w: 1280, h: 800 });
    expect(source.groups[0].items[0]).not.toHaveProperty("variant");
  });

  it("creates a viewport for a frameless design, including negative coordinates", () => {
    const doc = previewDocument({ groups: [{ x: -300, y: -100, items: [{ kind: "button", label: "Save" }] }] })!;
    expect(doc.frames[0].x).toBeLessThan(-300);
    expect(doc.frames[0].y).toBeLessThan(-100);
    expect(doc.frames[0].w).toBeGreaterThan(0);
    expect(doc.groups[0].items[0].label).toBe("Save");
  });

  it("skips unsupported saved items and handles empty or corrupt documents", () => {
    expect(previewDocument(null)).toBeNull();
    expect(previewDocument({ groups: [null, { items: [{ kind: "unknown" }] }] })).toBeNull();
    const doc = previewDocument({ groups: [{ items: [null, { kind: "unknown" }, { kind: "card", size: -10, label: "Card" }] }] })!;
    expect(doc.groups[0].items).toHaveLength(1);
    expect(doc.groups[0].items[0].size).toBeUndefined();
  });

  it("rejects the old stock-photo fallback but keeps real covers", () => {
    expect(isDesignCover("/hero/card-couture.png")).toBe(false);
    expect(isDesignCover("https://example.com/app/hero/card-couture.png?v=2")).toBe(false);
    expect(isDesignCover("")).toBe(false);
    expect(isDesignCover("https://example.com/design-cover.png")).toBe(true);
  });
});
