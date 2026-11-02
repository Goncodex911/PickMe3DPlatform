import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAiKeys, loadAiSettings, loadProviderSettings, saveAiSettings, providerSpec } from "./ai";
const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
function login(id: string) { localStorage.setItem("pickme3d_user", JSON.stringify({ id })); }
function config(provider: "openai" | "claude", key: string) {
  const spec = providerSpec(provider);
  return { provider, key, model: spec.model, baseUrl: spec.baseUrl };
}
describe("AI settings", () => {
  it("keeps provider keys separately and uses the selected provider in Canvas", () => {
    login("alice");
    expect(saveAiSettings(config("openai", "openai-secret"))).toBe(true);
    saveAiSettings(config("claude", "claude-secret"));
    expect(loadAiSettings().provider).toBe("claude");
    expect(loadProviderSettings("openai").key).toBe("openai-secret");
    expect(loadProviderSettings("claude").key).toBe("claude-secret");
  });
  it("isolates accounts and deletes only the current user's saved keys", () => {
    login("alice"); saveAiSettings(config("openai", "alice-secret"));
    login("bob"); expect(loadProviderSettings("openai").key).toBe("");
    saveAiSettings(config("openai", "bob-secret")); clearAiKeys();
    expect(loadProviderSettings("openai").key).toBe("");
    login("alice"); expect(loadProviderSettings("openai").key).toBe("alice-secret");
  });
  it("does not fill a blank OpenAI key with the Gemini default", () => {
    login("alice"); saveAiSettings(config("openai", ""));
    expect(loadAiSettings().key).toBe("");
  });
  it("reports browser storage failures instead of claiming settings were saved", () => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("quota"); } });
    expect(saveAiSettings(config("openai", "secret"))).toBe(false);
  });
});
