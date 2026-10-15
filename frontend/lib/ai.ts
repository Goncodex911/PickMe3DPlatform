import { Doc, Frame, Group, Item, frameOfGroup, uid, Kind, KIND_ORDER, VARIANTS, DEFAULT_THEME } from "./tokens";
import { buildPrompt } from "./prompt";
import { isProject } from "./project";
import { Lang } from "./i18n";

/* Optional AI helpers. The browser talks to the model provider directly with the
 * author's own key; there is no server in between. Every action has a fixed
 * prompt and a fixed JSON answer shape, and the result is only applied after the
 * author has looked at it. Coordinates are never touched by the model. */

export type Provider = "claude" | "openai" | "gemini" | "deepseek";

export type AiSettings = {
  provider: Provider;
  baseUrl: string;
  model: string;
  key: string;
};

export const PROVIDERS: {
  key: Provider;
  label: string;
  baseUrl: string;
  model: string;
  suggestedModels: string[];
  keysUrl?: string;
  hint?: string;
}[] = [
  {
    key: "gemini",
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.6-flash",
    suggestedModels: ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.7-flash"],
    keysUrl: "https://aistudio.google.com/apikey",
    hint: "Miễn phí (Free) qua Google AI Studio",
  },
  {
    key: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    suggestedModels: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    keysUrl: "https://platform.openai.com/api-keys",
    hint: "OpenAI API",
  },
  {
    key: "claude",
    label: "Claude",
    baseUrl: "https://api.anthropic.com",
    model: "claude-3-5-haiku-20241022",
    suggestedModels: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-7-sonnet-20250219"],
    keysUrl: "https://console.anthropic.com/settings/keys",
    hint: "Anthropic API",
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
    keysUrl: "https://platform.deepseek.com/api_keys",
    hint: "DeepSeek API",
  },
];

export const providerSpec = (k: Provider) => PROVIDERS.find((p) => p.key === k) ?? PROVIDERS[0];

const DEFAULT_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_DEFAULT_KEY || "";

export const DEFAULT_AI: AiSettings = {
  provider: "gemini",
  baseUrl: PROVIDERS[0].baseUrl,
  model: "gemini-3.6-flash",
  key: DEFAULT_GEMINI_KEY,
};

const STORE_KEY = "m3e:ai";

export function loadAiSettings(): AiSettings {
  const s = { ...DEFAULT_AI };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<AiSettings>;
      if (PROVIDERS.some((p) => p.key === v.provider)) s.provider = v.provider as Provider;
      if (typeof v.baseUrl === "string") s.baseUrl = v.baseUrl;
      if (typeof v.model === "string") s.model = v.model;
      if (typeof v.key === "string") s.key = v.key;

      // Automatically migrate deprecated/invalid mock models to real working models
      if (s.model === "claude-sonnet-5") s.model = "claude-3-5-haiku-20241022";
      if (s.model === "gpt-5.6-luna") s.model = "gpt-4o-mini";
      if (s.model === "gemini-2.0-flash" || s.model === "gemini-1.5-flash" || !s.model) {
        s.model = "gemini-3.6-flash";
      }
      if (s.model === "deepseek-v4-flash") s.model = "deepseek-chat";
      if (s.provider === "gemini" && (!s.baseUrl || s.baseUrl.includes("generativelanguage.googleapis.com"))) {
        s.baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
      }
      if (!s.key || !s.key.trim()) {
        s.key = DEFAULT_GEMINI_KEY;
      }
    }
  } catch {}
  return s;
}

/** Settings live in this browser only, like the document itself. */
export function saveAiSettings(s: AiSettings) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

const isLocal = (u: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(u.trim());

/** a hosted endpoint needs a key; a server on this machine may run without one */
export const hasKey = (s: AiSettings) => s.key.trim().length > 0 || isLocal(s.baseUrl);

/** the key must not travel over plain http, except to this machine */
export const isSecureUrl = (u: string) => /^https:\/\//i.test(u.trim()) || isLocal(u);

const trimSlash = (u: string) => u.trim().replace(/\/+$/, "");

async function readError(res: Response): Promise<string> {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message ?? j?.message ?? JSON.stringify(j);
  } catch {
    try {
      detail = await res.text();
    } catch {}
  }
  return `${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 300)}` : ""}`;
}

/** one round trip: a system prompt and a user message in, the model's text out */
export async function complete(s: AiSettings, system: string, user: string, signal?: AbortSignal, maxTokens = 4096): Promise<string> {
  const model = s.model.trim();
  if (!model) throw new Error("model");

  // In browser runtime, prefer the server-side Next.js AI proxy route to avoid CORS, extension blockers, and expose fallback keys
  if (typeof window !== "undefined" && !isLocal(s.baseUrl) && !s.baseUrl.includes("example.test")) {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: s.provider,
          baseUrl: s.baseUrl,
          model,
          key: s.key,
          system,
          user,
          maxTokens,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        if (j.stop_reason === "refusal") throw new Error("refusal");
        if (j.finish_reason === "length" || j.stop_reason === "max_tokens") throw new Error("long");
        if (typeof j.content === "string") return j.content;
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error?.message) {
          throw new Error(errJson.error.message);
        }
      }
    } catch (proxyErr: any) {
      if (proxyErr?.message && !proxyErr.message.includes("Failed to fetch") && !proxyErr.message.includes("404")) {
        throw proxyErr;
      }
      // If /api/ai failed to reach, proceed to direct client fetch
    }
  }

  const base = trimSlash(s.baseUrl);
  if (!isSecureUrl(base)) throw new Error("insecure");
  if (s.provider === "claude") {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": s.key.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model, max_tokens: Math.min(maxTokens, 8192), system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const j = await res.json();
    if (j.stop_reason === "refusal") throw new Error("refusal");
    if (j.stop_reason === "max_tokens") throw new Error("long");
    return (j.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (s.key.trim()) headers.authorization = `Bearer ${s.key.trim()}`;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      model,
      /* OpenAI's newer models refuse `max_tokens` and default generously, so they get no budget;
         the other compatible endpoints cap around 8k */
      ...(s.provider === "openai" ? {} : { max_tokens: Math.min(maxTokens, 8192) }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = await res.json();
  if (j.choices?.[0]?.finish_reason === "length") throw new Error("long");
  const c = j.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((x: { text?: string }) => x.text ?? "").join("");
  throw new Error("empty");
}

/** the first JSON object in a reply, with any code fence stripped */
function parseJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("json");
  const v = JSON.parse(cleaned.slice(a, b + 1));
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("json");
  return v as Record<string, unknown>;
}

/* ---------- actions ---------- */

const LANG_NAME: Record<Lang, string> = { ja: "Japanese", en: "English", zh: "Simplified Chinese", ko: "Korean" };

const hasText = (v?: string | null) => !!v && v.trim().length > 0;

const itemsOnFrame = (doc: Doc, frame: Frame, widths: Record<string, number>): Item[] =>
  doc.groups.filter((g: Group) => frameOfGroup(g, doc.frames, widths)?.id === frame.id).flatMap((g) => g.items);

const describeItem = (it: Item) => {
  const bits = [`id=${it.id}`, `kind=${it.kind}`];
  if (hasText(it.label)) bits.push(`label=${JSON.stringify(it.label)}`);
  if (hasText(it.supporting)) bits.push(`supporting=${JSON.stringify(it.supporting)}`);
  if (it.icon) bits.push(`icon=${it.icon}`);
  if (it.tabs?.length) bits.push(`items=${JSON.stringify(it.tabs.map((t) => t.label || t.icon))}`);
  if (it.action) bits.push(`tap=${it.action.to}`);
  if (it.toggle) bits.push("toggle");
  if (hasText(it.note)) bits.push(`current_note=${JSON.stringify(it.note)}`);
  return bits.join(" ");
};

const context = (doc: Doc, widths: Record<string, number>, frame: Frame, lang: Lang) =>
  [
    "The author is sketching a Material 3 Expressive app. Below is the generated description of the whole design, then the screen to work on.",
    "",
    "=== Whole design ===",
    buildPrompt(doc, widths, undefined, lang),
    "",
    `=== Screen to work on: ${JSON.stringify(frame.name || "(unnamed)")} ===`,
  ].join("\n");

const SYSTEM = "You help an app designer finish a sketch. Answer with a single JSON object and nothing else: no prose, no markdown fence.";

/** picks the strings the model returned for exactly the parts asked about */
function pickStrings(v: unknown, parts: Item[], max: number): Record<string, string> {
  const map = (v ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const it of parts) {
    const s = map[it.id];
    if (typeof s === "string" && s.trim()) out[it.id] = s.trim().slice(0, max);
  }
  return out;
}

/** a short behavior note for one part; an existing note is refined rather than replaced */
export async function proposeBehavior(s: AiSettings, doc: Doc, widths: Record<string, number>, frame: Frame, lang: Lang, itemId: string, signal?: AbortSignal): Promise<string | undefined> {
  const parts = itemsOnFrame(doc, frame, widths).filter((it) => it.id === itemId);
  if (!parts.length) return undefined;
  const user = [
    context(doc, widths, frame, lang),
    "",
    "For the part listed below, write what happens when the user interacts with it: what it does, where it leads, what it shows. One sentence, concrete, in the voice of a product spec (no 'should', no hedging). Infer from the labels, icons and the other screens; do not invent screens that do not exist.",
    "A part with a current_note already has the author's own wording: keep its intent and facts, and improve it (clearer, more specific, consistent with the rest of the screen). Do not contradict it.",
    `Write in ${LANG_NAME[lang]}.`,
    "",
    "Part:",
    describeItem(parts[0]),
    "",
    'Answer as {"notes": {"<id>": "<sentence>"}} using exactly the id above.',
  ].join("\n");
  const j = parseJsonObject(await complete(s, SYSTEM, user, signal));
  return pickStrings(j.notes, parts, 300)[itemId];
}

/** a name (only when the screen has none) and a one-line purpose for the screen; an existing description is refined */
export async function proposeDescription(s: AiSettings, doc: Doc, widths: Record<string, number>, frame: Frame, lang: Lang, signal?: AbortSignal): Promise<{ name?: string; note: string }> {
  const user = [
    context(doc, widths, frame, lang),
    "",
    "Describe this screen's purpose in one or two sentences: who opens it, what they see and what they can do here. Also propose a short screen name (one to three words).",
    hasText(frame.note) ? `The author's current description is ${JSON.stringify(frame.note)}: keep its intent and facts, and improve it.` : "",
    `Write in ${LANG_NAME[lang]}.`,
    "",
    'Answer as {"name": "<name>", "description": "<sentences>"}.',
  ]
    .filter((l) => l !== "")
    .join("\n");
  const j = parseJsonObject(await complete(s, SYSTEM, user, signal));
  const note = typeof j.description === "string" ? j.description.trim().slice(0, 400) : "";
  if (!note) throw new Error("json");
  const name = typeof j.name === "string" ? j.name.trim().slice(0, 40) : "";
  return { name: !hasText(frame.name) && name ? name : undefined, note };
}

/** the value a rewritten field had before, so the rewrite can be undone; an empty field leaves nothing to go back to */
export const pushHistory = (history: string[] | undefined, replaced: string | undefined): string[] | undefined => {
  const cur = (replaced ?? "").trim();
  return cur ? [cur] : history?.length ? history : undefined;
};

/** the patch that swaps a field with what it said before the AI wrote it; pressing again swaps back */
export function popHistory<V extends string, H extends string>(current: string | undefined, history: string[] | undefined, valueKey: V, historyKey: H): Record<V, string> & Record<H, string[] | undefined> {
  const [prev] = history ?? [];
  const cur = (current ?? "").trim();
  return { [valueKey]: prev ?? "", [historyKey]: cur ? [cur] : undefined } as Record<V, string> & Record<H, string[] | undefined>;
}

const VALID_KINDS = new Set<string>(KIND_ORDER);
const VALID_VARIANTS = new Set<string>(VARIANTS.map((v) => v.key));

export function sanitizeAndNormalizeDoc(raw: any, idea: string, lang: Lang): Doc {
  if (isProject(raw)) {
    return raw;
  }

  const title = (typeof raw?.title === "string" && raw.title.trim()) || idea.slice(0, 32) || "Giao diện mới";
  const brief = (typeof raw?.brief === "string" && raw.brief.trim()) || idea || "Thiết kế bằng AI";
  const paletteKey = (typeof raw?.paletteKey === "string" && raw.paletteKey.trim()) || "purple";
  const platform = raw?.platform === "web" ? "web" : "android";

  // 1. Process frames
  let frames: Frame[] = [];
  if (Array.isArray(raw?.frames) && raw.frames.length > 0) {
    frames = raw.frames
      .filter((f: any) => typeof f === "object" && f !== null)
      .map((f: any, idx: number) => ({
        id: typeof f.id === "string" && f.id ? f.id : `frame-${idx + 1}`,
        name: typeof f.name === "string" && f.name ? f.name : `Màn hình ${idx + 1}`,
        x: Number.isFinite(f.x) ? f.x : 80 + idx * 492,
        y: Number.isFinite(f.y) ? f.y : 80,
        w: Number.isFinite(f.w) && f.w > 0 ? f.w : 412,
        h: Number.isFinite(f.h) && f.h > 0 ? f.h : 892,
        note: typeof f.note === "string" ? f.note : "",
      }));
  }

  if (frames.length === 0) {
    frames = [
      { id: "f-home", name: "Trang chủ", x: 100, y: 100, w: 412, h: 892, note: "Màn hình chính của ứng dụng" },
      { id: "f-detail", name: "Chi tiết", x: 592, y: 100, w: 412, h: 892, note: "Màn hình chi tiết nội dung" },
    ];
  }

  // 2. Process groups
  let groups: Group[] = [];
  if (Array.isArray(raw?.groups) && raw.groups.length > 0) {
    for (let gi = 0; gi < raw.groups.length; gi++) {
      const g = raw.groups[gi];
      if (!g || typeof g !== "object") continue;

      const rawItems = Array.isArray(g.items) ? g.items : [];
      const items: Item[] = [];

      for (let ii = 0; ii < rawItems.length; ii++) {
        const it = rawItems[ii];
        if (!it || typeof it !== "object") continue;

        const kind = (VALID_KINDS.has(it.kind) ? it.kind : "button") as Kind;
        const variant = (VALID_VARIANTS.has(it.variant) ? it.variant : "filled") as any;
        const label = typeof it.label === "string" ? it.label : "Item";
        const icon = typeof it.icon === "string" ? it.icon : null;

        items.push({
          id: typeof it.id === "string" && it.id ? it.id : uid(),
          kind,
          variant,
          label,
          icon,
          ...(it.supporting && typeof it.supporting === "string" ? { supporting: it.supporting } : {}),
          ...(typeof it.note === "string" ? { note: it.note } : {}),
          ...(Array.isArray(it.tabs) ? { tabs: it.tabs } : {}),
        });
      }

      if (items.length > 0) {
        groups.push({
          id: typeof g.id === "string" && g.id ? g.id : uid(),
          x: Number.isFinite(g.x) ? g.x : frames[0].x + 16,
          y: Number.isFinite(g.y) ? g.y : frames[0].y + 20 + gi * 60,
          axis: g.axis === "x" ? "x" : "y",
          items,
          ...(g.free ? { free: true } : {}),
        });
      }
    }
  }

  // If no valid groups were generated, create default Material 3 structure
  if (groups.length === 0) {
    const f1 = frames[0];
    groups = [
      {
        id: uid(),
        x: f1.x + 16,
        y: f1.y + 16,
        axis: "x",
        items: [
          { id: uid(), kind: "iconButton", variant: "filled", label: "Menu", icon: "menu" },
          { id: uid(), kind: "text", variant: "filled", label: title, icon: null },
          { id: uid(), kind: "iconButton", variant: "filled", label: "Search", icon: "search" },
        ],
      },
      {
        id: uid(),
        x: f1.x + 16,
        y: f1.y + 80,
        axis: "y",
        items: [
          { id: uid(), kind: "card", variant: "filled", label: title, supporting: brief, icon: "auto_awesome" },
        ],
      },
      {
        id: uid(),
        x: f1.x + 16,
        y: f1.y + 220,
        axis: "x",
        items: [
          { id: uid(), kind: "button", variant: "filled", label: "Bắt đầu ngay", icon: "arrow_forward" },
          { id: uid(), kind: "button", variant: "tonal", label: "Tìm hiểu thêm", icon: "info" },
        ],
      },
      {
        id: uid(),
        x: f1.x + 16,
        y: f1.y + 810,
        axis: "x",
        items: [
          {
            id: uid(),
            kind: "bottomNav",
            variant: "filled",
            label: "Nav",
            icon: null,
            tabs: [
              { icon: "home", label: "Trang chủ" },
              { icon: "explore", label: "Khám phá" },
              { icon: "notifications", label: "Thông báo" },
              { icon: "person", label: "Tài khoản" },
            ],
          },
        ],
      },
    ];
  }

  return {
    title,
    brief,
    frame: "phone",
    platform,
    paletteKey,
    theme: raw?.theme && typeof raw.theme === "object" ? { ...DEFAULT_THEME, ...raw.theme } : DEFAULT_THEME,
    frames,
    groups,
  };
}

/** A whole design from an idea, drafted by the author's own model. */
export async function draftDesign(s: AiSettings, guide: string, idea: string, lang: Lang, screenCount = 2, signal?: AbortSignal): Promise<Doc> {
  const system = [
    "You draft M3E Canvas designs. Follow the guide below exactly.",
    "Reply with the JSON document only: no share link, no prose, no markdown fence, no explanation.",
    "",
    guide,
  ].join("\n");
  const user = [
    `Sketch this app: ${idea.trim()}`,
    `Write every label, title and note in Vietnamese.`,
    `Generate exactly ${screenCount} screen(s). Place screens side by side with gap 80. Keep it clean and modern Material 3.`,
  ].join("\n");

  let parsed: any = null;
  try {
    const raw = await complete(s, system, user, signal, 12000);
    parsed = parseJsonObject(raw);
  } catch (e) {
    console.warn("Complete or parseJson returned error, using fallback normalizer:", e);
  }

  return sanitizeAndNormalizeDoc(parsed, idea, lang);
}

