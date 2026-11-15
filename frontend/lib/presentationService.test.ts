import { afterEach, describe, expect, it, vi } from "vitest";
import { copiedFrom, copyDeckToWorkspace } from "./presentationService";

afterEach(() => vi.unstubAllGlobals());

describe("copiedFrom", () => {
  it("reads the source of a deck copied from the community", () => {
    expect(copiedFrom({ theme: { copiedFrom: { deckId: "d1", title: "Launch plan", authorName: "Tien", copiedAt: "x" } } }))
      .toEqual({ deckId: "d1", title: "Launch plan", authorName: "Tien" });
  });

  it("returns null for decks that were not copied or have malformed data", () => {
    expect(copiedFrom({ theme: {} })).toBeNull();
    expect(copiedFrom({ theme: { copiedFrom: { title: "no id" } } })).toBeNull();
    expect(copiedFrom(null)).toBeNull();
  });
});

describe("copyDeckToWorkspace", () => {
  it("posts to the use endpoint and returns the new deck", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { id: "copy-1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const deck = await copyDeckToWorkspace("deck 1");
    expect(deck.id).toBe("copy-1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/presentations\/deck%201\/use$/);
    expect(init.method).toBe("POST");
  });

  it("surfaces the upgrade code for Free users", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, code: "UPGRADE_REQUIRED", message: "Upgrade" }), { status: 403 })));
    await expect(copyDeckToWorkspace("d1")).rejects.toMatchObject({ code: "UPGRADE_REQUIRED" });
  });
});
