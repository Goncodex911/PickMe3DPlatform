import { describe, expect, it } from "vitest";
import {
  ANIMATION_SANDBOX,
  ANIMATION_SPEEDS,
  ANIMATION_TAP_MESSAGE,
  ANIMATION_TRIGGER_DELAYS,
  accentInk,
  accentTokens,
  animationDefaultSize,
  isAnimationTapMessage,
  normalizeTriggerDelay,
  opaqueHex,
  buildAnimationDocument,
  createAnimationItem,
  isButtonAnimation,
  nextInCycle,
  normalizeAnimationSpeed,
  replaceLeftoverText,
  safeCssColor,
  scriptJson,
  type AnimationDocumentInput,
} from "./animationItem";
import type { UITemplate } from "./ui-marketplace-data";

const template = (over: Partial<UITemplate> = {}): UITemplate => ({
  id: "010",
  slug: "demo",
  title: "데모",
  titleEn: "Demo card",
  category: "카드·콘텐츠",
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
  js: "console.log('안녕')",
  demo: [["wait", 400]],
  map: [["안녕", "Hello"]],
  ...over,
});

const doc = (over: Partial<AnimationDocumentInput> = {}): AnimationDocumentInput => ({
  html: '<div class="ux"><button class="u001-btn"><span class="u001-txt">Go</span></button></div>',
  js: "",
  demo: null,
  dark: false,
  color: "#6366f1",
  fallbackColor: "#6A57F2",
  onSurface: "#1D1B20",
  label: "Go",
  speed: 1,
  glow: true,
  button: true,
  ...over,
});

describe("animation sandbox", () => {
  it("lets scripts run but never gives the frame the editor's origin", () => {
    expect(ANIMATION_SANDBOX).toContain("allow-scripts");
    expect(ANIMATION_SANDBOX).not.toContain("allow-same-origin");
  });
});

describe("isButtonAnimation", () => {
  it("treats the two edge-to-edge buttons as buttons", () => {
    expect(isButtonAnimation("001", "Cards & Content")).toBe(true);
    expect(isButtonAnimation("002", undefined)).toBe(true);
  });

  it("keeps the card-shaped button templates as cards", () => {
    for (const id of ["003", "004", "005"]) expect(isButtonAnimation(id, "Buttons")).toBe(false);
  });

  it("decides the rest by category, whether stored raw or as its label", () => {
    expect(isButtonAnimation("006", "버튼")).toBe(true);
    expect(isButtonAnimation("006", "Buttons")).toBe(true);
    expect(isButtonAnimation("045", "메뉴·탭")).toBe(false);
    expect(isButtonAnimation("045", "Menu & Tabs")).toBe(false);
  });
});

describe("animationDefaultSize", () => {
  it("gives buttons, cards and tall templates their own drop size", () => {
    expect(animationDefaultSize({ id: "001", category: "버튼", shape: "square" }, 412)).toEqual({ w: 260, h: 80 });
    expect(animationDefaultSize({ id: "003", category: "버튼", shape: "square" }, 412)).toEqual({ w: 280, h: 170 });
    expect(animationDefaultSize({ id: "004", category: "버튼", shape: "square" }, 412)).toEqual({ w: 280, h: 150 });
    expect(animationDefaultSize({ id: "050", category: "카드·콘텐츠", shape: "tall" }, 412)).toEqual({ w: 320, h: 280 });
    expect(animationDefaultSize({ id: "050", category: "카드·콘텐츠", shape: "square" }, 412)).toEqual({ w: 320, h: 190 });
  });

  it("stays inside a narrow screen", () => {
    expect(animationDefaultSize({ id: "050", category: "카드·콘텐츠", shape: "square" }, 300).w).toBe(268);
  });
});

describe("normalizeAnimationSpeed", () => {
  it("keeps the offered speeds as they are", () => {
    for (const s of ANIMATION_SPEEDS) expect(normalizeAnimationSpeed(s)).toBe(s);
    expect(normalizeAnimationSpeed("1.5")).toBe(1.5);
  });

  it("plays anything unusable at normal speed and clamps extremes", () => {
    expect(normalizeAnimationSpeed(Number.NaN)).toBe(1);
    expect(normalizeAnimationSpeed(0)).toBe(1);
    expect(normalizeAnimationSpeed(-2)).toBe(1);
    expect(normalizeAnimationSpeed(undefined)).toBe(1);
    expect(normalizeAnimationSpeed(50)).toBe(4);
    expect(normalizeAnimationSpeed(0.01)).toBe(0.25);
  });
});

describe("nextInCycle", () => {
  it("steps forward and wraps around", () => {
    expect(nextInCycle([0.5, 1, 2], 1)).toBe(2);
    expect(nextInCycle([0.5, 1, 2], 2)).toBe(0.5);
  });

  it("starts the list for a value it does not hold", () => {
    expect(nextInCycle(["a", "b"], "z")).toBe("a");
  });

  it("refuses an empty list", () => {
    expect(() => nextInCycle([], 1)).toThrow();
  });
});

describe("createAnimationItem", () => {
  it("builds an animation part from a template, translated", () => {
    const item = createAnimationItem(template(), "#123456", 412);
    expect(item.kind).toBe("animation");
    expect(item.animationId).toBe("010");
    expect(item.label).toBe("Demo card");
    expect(item.animationText).toBe("Demo card");
    expect(item.supporting).toBe("Cards & Content");
    expect(item.animationHtml).toBe('<div class="ux">Hello</div>');
    expect(item.animationJs).toBe("console.log('Hello')");
    expect(item.animationDemo).toEqual([["wait", 400]]);
    expect(item.animationColor).toBe("#123456");
    expect(item.animationSpeed).toBe(1);
    expect(item.size).toBe(320);
    expect(item.size2).toBe(190);
  });

  it("starts in edit mode so the new part can still be selected and dragged", () => {
    expect(createAnimationItem(template(), "#123456", 412).animationInteractive).toBe(false);
    expect(createAnimationItem(template({ customInteractive: true }), "#123456", 412).animationInteractive).toBe(true);
  });

  it("honours the marketplace presets", () => {
    const item = createAnimationItem(template({ customText: "  Buy now  ", customColor: "#ef4444", customSpeed: 2 }), "#123456", 412);
    expect(item.label).toBe("Buy now");
    expect(item.animationColor).toBe("#ef4444");
    expect(item.animationSpeed).toBe(2);
  });

  it("gives every part its own id and copes with a template missing its demo", () => {
    const a = createAnimationItem(template({ demo: undefined as unknown as unknown[] }), "#123456", 412);
    const b = createAnimationItem(template(), "#123456", 412);
    expect(a.id).not.toBe(b.id);
    expect(a.animationDemo).toEqual([]);
  });
});

describe("safeCssColor", () => {
  it("accepts plain CSS colors", () => {
    for (const c of ["#abc", "#AABBCC", "#aabbcc80", "red", "rgb(1, 2, 3)", "hsl(200 50% 40% / .5)", "oklch(0.7 0.1 200)"]) {
      expect(safeCssColor(c, "#000")).toBe(c);
    }
  });

  it("falls back for anything that could leave the stylesheet", () => {
    expect(safeCssColor("red;}</style><script>alert(1)</script>", "#000")).toBe("#000");
    expect(safeCssColor("url(javascript:alert(1))", "#000")).toBe("#000");
    expect(safeCssColor("", "#000")).toBe("#000");
    expect(safeCssColor(undefined, "#000")).toBe("#000");
  });
});

describe("scriptJson", () => {
  it("cannot close the script it is written into", () => {
    const out = scriptJson({ text: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</");
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ text: "</script><img src=x onerror=alert(1)>" });
  });
});

describe("replaceLeftoverText", () => {
  it("translates the Korean strings templates still carry", () => {
    expect(replaceLeftoverText("<b>다운로드 완료</b>")).toBe("<b>Download complete</b>");
    expect(replaceLeftoverText("<b>다운로드</b>")).toBe("<b>Download</b>");
  });

  it("replaces a longer phrase before a shorter one it contains", () => {
    expect(replaceLeftoverText("복사됨 / 복사")).toBe("Copied / Copy");
    expect(replaceLeftoverText("다운로드를 취소했어요")).toBe("Download canceled");
  });
});

describe("buildAnimationDocument", () => {
  it("is empty for a part without template markup", () => {
    expect(buildAnimationDocument(doc({ html: "" }))).toBe("");
  });

  it("writes the label as script data, never as markup", () => {
    const out = buildAnimationDocument(doc({ label: "</script><script>alert(1)</script>" }));
    expect(out).not.toContain("<script>alert(1)");
  });

  it("only installs the speed script when the speed is not normal", () => {
    expect(buildAnimationDocument(doc({ speed: 1 }))).not.toContain("playbackRate");
    const fast = buildAnimationDocument(doc({ speed: 2 }));
    expect(fast).toContain("var rate = 2;");
    expect(fast).toContain("Element.prototype.animate");
    expect(fast).toContain("--anim-speed: 2;");
  });

  it("does not scale the button keyframes twice", () => {
    expect(buildAnimationDocument(doc({ speed: 2 }))).not.toMatch(/calc\([^)]*\/ ?2\)/);
  });

  it("adds the button styling only to button templates, and the glow follows its toggle", () => {
    expect(buildAnimationDocument(doc({ button: false }))).not.toContain(".u001-btn");
    expect(buildAnimationDocument(doc({ glow: true }))).toContain("#6366f1 45%");
    expect(buildAnimationDocument(doc({ glow: false }))).toContain("#6366f1 20%");
  });

  it("falls back to the palette color when the typed color is unsafe", () => {
    const out = buildAnimationDocument(doc({ color: "red;}</style><script>alert(1)</script>" }));
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("--ux-accent: #6A57F2");
  });

  it("runs the demo only when the part has one, with its steps as data", () => {
    expect(buildAnimationDocument(doc({ demo: [] }))).not.toContain("__UX_DEMO__");
    expect(buildAnimationDocument(doc({ demo: [["wait", 300]] }))).toContain('window.__UX_DEMO__ = [["wait",300]]');
  });

  it("follows the screen's theme", () => {
    expect(buildAnimationDocument(doc({ dark: true }))).toContain('data-theme="dark"');
    expect(buildAnimationDocument(doc({ dark: false }))).toContain('data-theme="light"');
  });
});

describe("opaqueHex", () => {
  it("reads every hex form as #RRGGBB", () => {
    expect(opaqueHex("#abc")).toBe("#AABBCC");
    expect(opaqueHex("#abcd")).toBe("#AABBCC");
    expect(opaqueHex("#a1b2c3")).toBe("#A1B2C3");
    expect(opaqueHex("#a1b2c380")).toBe("#A1B2C3");
  });

  it("has nothing to say about other colors", () => {
    expect(opaqueHex("red")).toBeNull();
    expect(opaqueHex("rgb(1,2,3)")).toBeNull();
    expect(opaqueHex("#12")).toBeNull();
  });
});

describe("accent colors", () => {
  it("writes dark text on a pale accent and white text on a deep one", () => {
    expect(accentInk("#F59E0B", false)).toBe("#0B0C12");
    expect(accentInk("#FDE68A", true)).toBe("#0B0C12");
    expect(accentInk("#1E1B4B", false)).toBe("#FFFFFF");
    expect(accentInk("#6A57F2", false)).toBe("#FFFFFF");
  });

  it("keeps the theme's ink for a color it cannot measure", () => {
    expect(accentInk("rgb(10, 20, 30)", false)).toBe("#FFFFFF");
    expect(accentInk("rgb(10, 20, 30)", true)).toBe("#0B0C12");
  });

  it("moves every accent token a template reads to the chosen color", () => {
    const tokens = accentTokens("#10B981", false);
    expect(Object.keys(tokens).sort()).toEqual(
      ["--blob", "--color-primary", "--ux-accent", "--ux-accent-2", "--ux-accent-ink", "--ux-accent-soft", "--ux-grad"].sort(),
    );
    for (const value of Object.values(tokens)) {
      if (value !== tokens["--ux-accent-ink"]) expect(value).toContain("#10B981");
    }
  });
});

describe("buildAnimationDocument colors", () => {
  it("writes all accent tokens, so none keeps the stock purple", () => {
    const out = buildAnimationDocument(doc({ color: "#F59E0B" }));
    for (const name of ["--ux-accent", "--ux-accent-2", "--ux-accent-soft", "--ux-accent-ink", "--ux-grad", "--blob", "--color-primary"]) {
      expect(out).toMatch(new RegExp(`${name}: [^;]+ !important;`));
    }
    expect(out).toContain("--ux-accent-ink: #0B0C12 !important;");
  });

  it("outranks the stock tokens' dark theme block", () => {
    expect(buildAnimationDocument(doc({ dark: true }))).toContain(":root, :root[data-theme] {");
  });
});

describe("animation triggers", () => {
  it("offers waits from none upward, and clamps any other wait", () => {
    expect(ANIMATION_TRIGGER_DELAYS[0]).toBe(0);
    for (const ms of ANIMATION_TRIGGER_DELAYS) expect(normalizeTriggerDelay(ms)).toBe(ms);
    expect(normalizeTriggerDelay(undefined)).toBe(0);
    expect(normalizeTriggerDelay(-100)).toBe(0);
    expect(normalizeTriggerDelay(Number.NaN)).toBe(0);
    expect(normalizeTriggerDelay(450.6)).toBe(451);
    expect(normalizeTriggerDelay(99999)).toBe(5000);
  });

  it("recognizes only a tap message", () => {
    expect(isAnimationTapMessage({ type: ANIMATION_TAP_MESSAGE })).toBe(true);
    expect(isAnimationTapMessage({ type: "other" })).toBe(false);
    expect(isAnimationTapMessage(ANIMATION_TAP_MESSAGE)).toBe(false);
    expect(isAnimationTapMessage(null)).toBe(false);
  });

  it("reports taps only for a part with an action, and only real ones", () => {
    expect(buildAnimationDocument(doc())).not.toContain(ANIMATION_TAP_MESSAGE);
    const out = buildAnimationDocument(doc({ reportTaps: true }));
    expect(out).toContain(`type: "${ANIMATION_TAP_MESSAGE}"`);
    expect(out).toContain("if (!e.isTrusted) return;");
  });

  it("writes a tap reporter that parses", () => {
    const out = buildAnimationDocument(doc({ reportTaps: true }));
    const script = /<script>\s*\(function \(\) \{\s*document\.addEventListener\("click"[\s\S]*?<\/script>/.exec(out)?.[0] ?? "";
    expect(script).not.toBe("");
    expect(() => new Function(script.replace(/^<script>|<\/script>$/g, ""))).not.toThrow();
  });
});
