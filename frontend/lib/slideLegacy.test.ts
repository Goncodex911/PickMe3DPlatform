import { describe, expect, it } from "vitest";
import { editedLabel, quotaText } from "./deckFormat";
import { legacyToRender, slideHeadline, toRenderSlides } from "./slideLegacy";
import { gradientCss, safeSrc, safeStyle } from "./slideRender";

describe("legacy slides", () => {
  it("turns title, body and image into positioned elements", () => {
    const slide = legacyToRender({ id: "a", layout: "quote", title: "A <b>", body: "l1\nl2", bg: "#111111", image: "https://x/y.png" }, 0);
    expect(slide.background).toEqual({ type: "solid", color: "#111111" });
    const [title, body, image] = slide.elements;
    expect(title.content).toContain("A &lt;b&gt;");
    expect(title.content).toContain("text-align: center");
    expect(String(body.content).match(/<p/g)).toHaveLength(2);
    expect(image.type).toBe("image");
  });

  it("keeps boxes inside the slide and swaps Instrument Serif for a font with Vietnamese marks", () => {
    const [title] = legacyToRender({ title: "Bước tiếp theo", titleX: 20, titleW: 84, titleFont: "Instrument Serif" }, 0).elements;
    expect(title.left + title.width).toBeLessThanOrEqual(1000);
    expect(title.defaultFontName).toBe("Playfair Display");
  });

  it("passes PPTist slides through untouched", () => {
    const pptist = { id: "p", elements: [{ type: "text", id: "t", left: 0, top: 0, width: 10, height: 10, content: "<p>Xin chào</p>" }] };
    const [out] = toRenderSlides([pptist]);
    expect(out).toBe(pptist);
    expect(slideHeadline(out)).toBe("Xin chào");
  });
});

describe("render helpers", () => {
  it("drops unsafe styles and sources", () => {
    expect(safeStyle("color: red; background: url(javascript:alert(1))")).toBe("");
    expect(safeStyle("font-size: 22px")).toBe("font-size: 22px");
    expect(safeSrc("javascript:alert(1)")).toBe("");
    expect(safeSrc("data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
  });

  it("builds gradients", () => {
    expect(gradientCss({ type: "linear", rotate: 90, colors: [{ pos: 0, color: "#000" }, { pos: 100, color: "#fff" }] })).toBe("linear-gradient(90deg, #000 0%, #fff 100%)");
  });
});

describe("deck labels", () => {
  const now = new Date(2026, 9, 17, 12, 0).getTime();
  it("shows relative edit times", () => {
    expect(editedLabel(new Date(now - 18 * 60 * 1000).toISOString(), new Date(2026, 0, 1).toISOString(), now)).toBe("Edited 18 min ago");
    expect(editedLabel(new Date(2026, 9, 16, 9).toISOString(), new Date(2026, 0, 1).toISOString(), now)).toBe("Edited yesterday");
    expect(editedLabel(new Date(2026, 9, 6).toISOString(), new Date(2026, 0, 1).toISOString(), now)).toBe("Edited Oct 6");
    const created = new Date(2026, 8, 27).toISOString();
    expect(editedLabel(created, created, now)).toBe("Created Sep 27");
  });
  it("formats quotas", () => {
    expect(quotaText(7, 50)).toBe("7 / 50");
    expect(quotaText(8, null)).toBe("8 / ∞");
  });
});
