import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UITemplate } from "./ui-marketplace-data";

const STORAGE_KEY = "pickme3d_purchased_templates";
const TOKEN_KEY = "pickme3d_token";

const template = (id: string, over: Partial<UITemplate> = {}): UITemplate => ({
  id,
  slug: `t-${id}`,
  title: `템플릿 ${id}`,
  titleEn: `Template ${id}`,
  category: "버튼",
  summary: "",
  summaryEn: "",
  hint: "",
  hintEn: "",
  shape: "square",
  hue: "#000",
  hue2: "#111",
  tags: [],
  source: "",
  html: '<div class="ux">안녕</div>',
  js: "",
  demo: [],
  map: [["안녕", "Hello"]],
  ...over,
});

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

let storage: ReturnType<typeof memoryStorage>;
let target: EventTarget;
let fetchMock: ReturnType<typeof vi.fn>;

/* the module keeps a catalog cache, so every test loads a fresh copy */
const load = async () => {
  vi.resetModules();
  return import("./purchased-animations");
};

beforeEach(() => {
  storage = memoryStorage();
  target = new EventTarget();
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPurchasedTemplates", () => {
  it("is empty when nothing is stored, or what is stored is not a list", async () => {
    const m = await load();
    expect(m.getPurchasedTemplates()).toEqual([]);
    storage.setItem(STORAGE_KEY, "{not json");
    expect(m.getPurchasedTemplates()).toEqual([]);
    storage.setItem(STORAGE_KEY, JSON.stringify({ id: "001" }));
    expect(m.getPurchasedTemplates()).toEqual([]);
  });

  it("returns stored templates translated, and writes the translation back once", async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify([template("001")]));
    const m = await load();
    const [t] = m.getPurchasedTemplates();
    expect(t.html).toBe('<div class="ux">Hello</div>');
    expect(t.category).toBe("Buttons");
    expect(t.title).toBe("Template 001");
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)[0].html).toBe('<div class="ux">Hello</div>');
  });
});

describe("purchaseTemplate", () => {
  it("stores a template once and tells listeners", async () => {
    const m = await load();
    const seen = vi.fn();
    const stop = m.subscribePurchasedTemplates(seen);
    expect(m.purchaseTemplate(template("001"))).toBe(true);
    expect(m.purchaseTemplate(template("001"))).toBe(true);
    expect(m.getPurchasedTemplateIds()).toEqual(["001"]);
    expect(m.isTemplatePurchased("001")).toBe(true);
    expect(m.isTemplatePurchased("002")).toBe(false);
    expect(m.isTemplatePurchased("")).toBe(false);
    expect(seen).toHaveBeenCalledTimes(1);
    stop();
    m.purchaseTemplate(template("002"));
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("refuses a template without an id", async () => {
    const m = await load();
    expect(m.purchaseTemplate({ ...template("x"), id: "" })).toBe(false);
    expect(m.getPurchasedTemplates()).toEqual([]);
  });

  it("stays local when signed out, and syncs to the server when signed in", async () => {
    const m = await load();
    m.purchaseTemplate(template("001"));
    expect(fetchMock).not.toHaveBeenCalled();

    storage.setItem(TOKEN_KEY, "tok");
    m.purchaseTemplate(template("002"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/marketplace\/purchase$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toMatchObject({ templateId: "002", templateTitle: "Template 002", category: "Buttons", price: 0 });
  });
});

describe("purchaseTemplateApi", () => {
  it("reports the local save when signed out", async () => {
    const m = await load();
    await expect(m.purchaseTemplateApi(template("001"))).resolves.toMatchObject({ success: true });
  });

  it("reports a failed server call without losing the local copy", async () => {
    storage.setItem(TOKEN_KEY, "tok");
    fetchMock.mockImplementation(async () => {
      throw new Error("offline");
    });
    const m = await load();
    await expect(m.purchaseTemplateApi(template("001"))).resolves.toEqual({ success: true, message: "offline" });
    expect(m.isTemplatePurchased("001")).toBe(true);
  });
});

describe("syncPurchasedTemplatesWithServer", () => {
  it("returns the local list when signed out, without calling the server", async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify([template("001")]));
    const m = await load();
    const list = await m.syncPurchasedTemplatesWithServer();
    expect(list.map((t) => t.id)).toEqual(["001"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds templates bought elsewhere, rebuilt from the catalog", async () => {
    storage.setItem(TOKEN_KEY, "tok");
    storage.setItem(STORAGE_KEY, JSON.stringify([template("001")]));
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/marketplace/sync")) return new Response("{}", { status: 200 });
      if (url.endsWith("/marketplace/my-purchases")) return new Response(JSON.stringify({ templateIds: ["001", "002", "999"] }), { status: 200 });
      if (url === "/ux-full-catalog.json") return new Response(JSON.stringify([template("001"), template("002")]), { status: 200 });
      return new Response("not found", { status: 404 });
    });
    const m = await load();
    const list = await m.syncPurchasedTemplatesWithServer();
    /* 999 is not in the catalog, so it cannot be rebuilt and is left out */
    expect(list.map((t) => t.id)).toEqual(["001", "002"]);
    expect(list[1].html).toBe('<div class="ux">Hello</div>');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).map((t: UITemplate) => t.id)).toEqual(["001", "002"]);
  });

  it("keeps the local list when the server answers with an error", async () => {
    storage.setItem(TOKEN_KEY, "tok");
    storage.setItem(STORAGE_KEY, JSON.stringify([template("001")]));
    fetchMock.mockImplementation(async () => new Response("nope", { status: 500 }));
    const m = await load();
    const list = await m.syncPurchasedTemplatesWithServer();
    expect(list.map((t) => t.id)).toEqual(["001"]);
  });
});
