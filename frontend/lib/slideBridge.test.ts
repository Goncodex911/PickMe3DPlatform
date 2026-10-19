import { describe, expect, it } from "vitest";
import { buildInitMessage, isPptistDeck, isTrustedOrigin, parseStudioMessage } from "./slideBridge";

describe("slide bridge", () => {
  it("accepts only the studio origin", () => {
    expect(isTrustedOrigin("http://localhost:5173", "http://localhost:5173")).toBe(true);
    expect(isTrustedOrigin("http://evil.test", "http://localhost:5173")).toBe(false);
  });

  it("drops messages that are not part of the bridge", () => {
    expect(parseStudioMessage({ type: "PM_SAVE", slides: [], theme: {} })?.type).toBe("PM_SAVE");
    expect(parseStudioMessage({ type: "PM_READY" })?.type).toBe("PM_READY");
    expect(parseStudioMessage({ type: "HACK" })).toBeNull();
    expect(parseStudioMessage(null)).toBeNull();
  });

  it("does not put a token inside PM_INIT", () => {
    const message = buildInitMessage({ deck: { title: "A" }, plan: "free", user: { name: "Designer" }, designs: [] });
    expect(message).not.toHaveProperty("token");
    expect(JSON.stringify(message)).not.toMatch(/eyJ/);
    expect(message.locale).toBe("en");
  });

  it("rejects a save without slides and accepts save status", () => {
    expect(parseStudioMessage({ type: "PM_SAVE", theme: {} })).toBeNull();
    expect(parseStudioMessage({ type: "PM_SAVE_STATUS", status: "saving" })?.type).toBe("PM_SAVE_STATUS");
  });

  it("tells PPTist decks from legacy decks", () => {
    expect(isPptistDeck([{ id: "a", elements: [] }])).toBe(true);
    expect(isPptistDeck([{ id: "a", title: "x", body: "y" }])).toBe(false);
    expect(isPptistDeck([])).toBe(false);
  });

  it("passes plan features to the studio", () => {
    const message = buildInitMessage({ deck: {}, plan: "pro", user: null, designs: [], features: { exportPptx: true } });
    expect(message.features).toEqual({ exportPptx: true });
  });
});
