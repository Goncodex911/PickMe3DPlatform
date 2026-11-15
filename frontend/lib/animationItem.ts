import { contrastRatio } from "./color";
import { makeItem, uid, type Item } from "./tokens";
import { DEMO_RUNNER_CODE, getCategoryLabel, translateTemplateSource, type UITemplate } from "./ui-marketplace-data";

/**
 * The sandbox an animation frame runs under. Scripts may run, but the frame keeps an opaque
 * origin: without `allow-same-origin` a template cannot reach the editor's storage (and the
 * login token in it), its cookies or its DOM. No template in the catalog uses storage.
 */
export const ANIMATION_SANDBOX = "allow-scripts";

/** window events between an animation part on the canvas and the editor around it; the detail
 *  is `{ id }` of the part */
export const TOGGLE_LIVE_ANIMATION_EVENT = "pm:toggle_interactive";
export const REPLAY_ANIMATION_EVENT = "pm:replay_animation";

/** what an animation frame posts to the page around it when the visitor taps inside it */
export const ANIMATION_TAP_MESSAGE = "pm:animation-tap";

/** how long a tap may play before the part's action runs, in ms; 0 goes at once */
export const ANIMATION_TRIGGER_DELAYS = [0, 300, 600, 1000, 1500] as const;
const MAX_TRIGGER_DELAY = 5000;

/** a usable wait before the action, in ms: anything else goes at once */
export function normalizeTriggerDelay(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_TRIGGER_DELAY, Math.round(n)) : 0;
}

/** whether a message an animation frame posted is a visitor's tap */
export function isAnimationTapMessage(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === ANIMATION_TAP_MESSAGE;
}

/** the playback rates an animation part is offered at, slowest first */
export const ANIMATION_SPEEDS = [0.5, 0.75, 1, 1.5, 2] as const;

/** the primary colors the quick toolbar cycles through, after the palette's own primary */
export const ANIMATION_QUICK_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"] as const;

/** Templates 003–005 sit in the button category but are small cards (hold to delete, a download
 *  bar, a send button with a status line), so they keep the card layout. */
const CARD_SHAPED_BUTTONS = new Set(["003", "004", "005"]);

/**
 * Whether an animation is a single button, which is drawn edge to edge and gets the glow styling.
 * Decided by the template's id and category only: the label is text the author edits, and
 * renaming a part must not change how it is laid out.
 */
export function isButtonAnimation(animationId: string | undefined, category: string | undefined): boolean {
  if (animationId === "001" || animationId === "002") return true;
  if (animationId && CARD_SHAPED_BUTTONS.has(animationId)) return false;
  return getCategoryLabel(category ?? "").toLowerCase().includes("button");
}

/** the size an animation is dropped at, kept inside a phone screen of width `phoneW` */
export function animationDefaultSize(template: Pick<UITemplate, "id" | "category" | "shape">, phoneW: number): { w: number; h: number } {
  const roomy = Math.max(120, Math.min(320, phoneW - 32));
  if (template.id === "003") return { w: 280, h: 170 };
  if (template.id === "004") return { w: 280, h: 150 };
  if (template.shape === "tall") return { w: roomy, h: 280 };
  if (isButtonAnimation(template.id, template.category)) return { w: 260, h: 80 };
  return { w: roomy, h: 190 };
}

/** a finite, positive playback rate; anything else plays at normal speed */
export function normalizeAnimationSpeed(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(4, Math.max(0.25, n)) : 1;
}

/** the next entry of `list` after `current`, wrapping around; an unknown value starts the list */
export function nextInCycle<T>(list: readonly T[], current: T): T {
  if (list.length === 0) throw new Error("nextInCycle needs a non-empty list");
  const at = list.indexOf(current);
  return list[(at + 1) % list.length];
}

/**
 * The canvas part for a marketplace template. The template's presets (text, color, speed) are
 * honoured; a new part starts in edit mode unless the template asks for live mode, because a
 * live part takes every click inside it and can no longer be selected or dragged by clicking it.
 */
export function createAnimationItem(template: UITemplate, fallbackColor: string, phoneW: number): Item {
  const title = template.titleEn || template.title || "Animation";
  const category = getCategoryLabel(template.category);
  const { html, js } = translateTemplateSource(template);
  const { w, h } = animationDefaultSize(template, phoneW);
  const text = template.customText?.trim() || title;
  return {
    ...makeItem("animation"),
    id: uid(),
    label: text,
    animationText: text,
    supporting: category,
    animationId: template.id,
    animationHtml: html,
    animationJs: js,
    animationDemo: Array.isArray(template.demo) ? template.demo : [],
    animationColor: template.customColor || fallbackColor,
    animationSpeed: normalizeAnimationSpeed(template.customSpeed ?? 1),
    animationInteractive: template.customInteractive === true,
    size: w,
    size2: h,
  };
}

/** Korean strings some templates still carry after their own translation map, and the names
 *  they are shown under on the canvas */
const LEFTOVER_TEXT: [RegExp, string][] = [
  [/프로젝트 시작하기/g, "Start a project"],
  [/준비됐어요/g, "You’re all set"],
  [/계속하기/g, "Continue"],
  [/저장했어요/g, "Saved"],
  [/저장하는 중/g, "Saving"],
  [/길게 눌러 브랜드 시안 v3\.fig 삭제/g, "Hold to delete Brand concept v3.fig"],
  [/브랜드 시안 v3\.fig/g, "Brand concept v3.fig"],
  [/48\.2 MB · 어제 수정/g, "48.2 MB · Edited yesterday"],
  [/길게 눌러 삭제/g, "Hold to delete"],
  [/파일을 삭제했어요/g, "File deleted"],
  [/되돌리기/g, "Undo"],
  [/삭제하려면 길게 누르세요/g, "Hold to delete"],
  [/삭제됨/g, "Deleted"],
  [/2026 분기 리포트 다운로드/g, "Download the 2026 quarterly report"],
  [/2026 분기 리포트\.pdf/g, "2026 quarterly report.pdf"],
  [/다운로드/g, "Download"],
  [/남은 시간 계산 중/g, "Estimating time left"],
  [/다운로드 폴더에 저장됨/g, "Saved to Downloads"],
  [/다운로드 시작/g, "Download started"],
  [/다운로드 완료/g, "Download complete"],
  [/다운로드를 취소했어요/g, "Download canceled"],
  [/보내기/g, "Send"],
  [/전송 중/g, "Sending"],
  [/보내는 중/g, "Sending"],
  [/전송됨/g, "Sent"],
  [/전송 완료/g, "Sent"],
  [/민지/g, "Minji"],
  [/지금 활동 중/g, "Active now"],
  [/사진 보내 줄 수 있어\?/g, "Can you send me the photo?"],
  [/구독하기/g, "Subscribe"],
  [/구독 중/g, "Subscribed"],
  [/복사됨/g, "Copied"],
  [/복사/g, "Copy"],
  [/재생/g, "Play"],
  [/일시정지/g, "Pause"],
  [/버튼/g, "Button"],
  [/LUCIAN/g, "HIẾU THUẬN"],
  [/LucianLabs/gi, "Hiếu Thuận"],
  [/Lucian/g, "Hiếu Thuận"],
];

/* longest phrase first: "다운로드 완료" must be replaced before the "다운로드" inside it */
const LEFTOVER_BY_LENGTH = [...LEFTOVER_TEXT].sort((a, b) => b[0].source.length - a[0].source.length);

export function replaceLeftoverText(source: string): string {
  let out = source;
  for (const [from, to] of LEFTOVER_BY_LENGTH) out = out.replace(from, to);
  return out;
}

/** JSON that is safe to drop inside an inline <script>: no "</script>", no HTML comment opener */
export function scriptJson(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const NAMED_COLOR = /^[a-z]{3,20}$/i;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(\s*[-0-9.%,\s/a-z]*\)$/i;

/** a color the author typed, or the fallback when it is not a plain CSS color (it is written into a
 *  stylesheet, so nothing that could close a rule or a tag gets through) */
export function safeCssColor(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  if (v && (HEX_COLOR.test(v) || NAMED_COLOR.test(v) || FUNCTION_COLOR.test(v))) return v;
  return fallback;
}

/** #rgb, #rgba, #rrggbb and #rrggbbaa as #rrggbb (alpha dropped); null for anything else */
export function opaqueHex(color: string): string | null {
  const v = color.trim();
  if (!HEX_COLOR.test(v)) return null;
  const digits = v.slice(1);
  const full = digits.length <= 4 ? digits.slice(0, 3).split("").map((c) => c + c).join("") : digits.slice(0, 6);
  return `#${full.toUpperCase()}`;
}

const LIGHT_INK = "#FFFFFF";
const DARK_INK = "#0B0C12";

/**
 * The text color for words drawn on the accent (the template's --ux-accent-ink). Templates assume
 * the stock purple, so a pale accent such as amber would otherwise carry white text it cannot
 * hold. A color that is not hex keeps the theme's own ink.
 */
export function accentInk(color: string, dark: boolean): string {
  const hex = opaqueHex(color);
  if (!hex) return dark ? DARK_INK : LIGHT_INK;
  return contrastRatio(hex, LIGHT_INK) >= contrastRatio(hex, DARK_INK) ? LIGHT_INK : DARK_INK;
}

/** Every token a template reads its accent from, all following the one color the author picked.
 *  The stock tokens derive the soft, second and ink accents from purple; left alone they keep
 *  that purple next to the new color. */
export function accentTokens(color: string, dark: boolean): Record<string, string> {
  const second = `color-mix(in srgb, ${color} 55%, #38bdf8)`;
  return {
    "--ux-accent": color,
    "--color-primary": color,
    "--ux-accent-2": second,
    "--ux-accent-soft": `color-mix(in srgb, ${color} ${dark ? 18 : 14}%, transparent)`,
    "--ux-accent-ink": accentInk(color, dark),
    "--ux-grad": `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #38bdf8))`,
    "--blob": `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #38bdf8))`,
  };
}

/**
 * Reports a visitor's tap to the page around the frame, so a tap can carry the part's action.
 * Only real input counts: the demo runner's synthetic clicks have isTrusted false and must not
 * send the visitor to another screen on their own.
 */
const TAP_REPORT_SCRIPT = `<script>
(function () {
  document.addEventListener("click", function (e) {
    if (!e.isTrusted) return;
    try { window.parent.postMessage({ type: "${ANIMATION_TAP_MESSAGE}" }, "*"); } catch (err) {}
  }, true);
})();
</script>`;

/**
 * Plays every animation in the frame at `rate`: CSS animations and transitions as they start,
 * and Web Animations made with element.animate(). Each animation is scaled once, so a template
 * that reverses one (a negative rate) keeps doing so at the new speed.
 */
function speedScript(rate: number): string {
  if (rate === 1) return "";
  return `<script>
(function () {
  var rate = ${rate};
  var seen = typeof WeakSet === "function" ? new WeakSet() : null;
  function scale(a) {
    if (!a || (seen && seen.has(a))) return;
    if (seen) seen.add(a);
    try { a.playbackRate = a.playbackRate * rate; } catch (e) {}
  }
  var animate = window.Element && Element.prototype.animate;
  if (animate) {
    Element.prototype.animate = function () {
      var a = animate.apply(this, arguments);
      scale(a);
      return a;
    };
  }
  function applyAll() {
    try { document.getAnimations().forEach(scale); } catch (e) {}
  }
  document.addEventListener("animationstart", applyAll, true);
  document.addEventListener("transitionrun", applyAll, true);
  document.addEventListener("DOMContentLoaded", applyAll);
  window.addEventListener("load", applyAll);
})();
</script>`;
}

export interface AnimationDocumentInput {
  html: string;
  js: string;
  demo: unknown[] | null | undefined;
  dark: boolean;
  /** the part's primary color; unsafe values fall back to `fallbackColor` */
  color: string | undefined;
  fallbackColor: string;
  /** text color of the screen behind the part */
  onSurface: string;
  label: string;
  speed: number;
  glow: boolean;
  button: boolean;
  /** the part has an action, so taps inside the frame are reported to the page around it */
  reportTaps?: boolean;
}

/** The whole page an animation part runs in. Empty when the part has no template markup. */
export function buildAnimationDocument(input: AnimationDocumentInput): string {
  if (!input.html) return "";
  const html = replaceLeftoverText(input.html);
  const js = replaceLeftoverText(input.js || "");
  const color = safeCssColor(input.color, safeCssColor(input.fallbackColor, "#6A57F2"));
  const ink = safeCssColor(input.onSurface, input.dark ? "#F4F0E8" : "#16151B");
  const speed = normalizeAnimationSpeed(input.speed);
  const dark = input.dark;
  const demo = Array.isArray(input.demo) && input.demo.length > 0 ? input.demo : null;
  const demoScript = demo ? `<script>window.__UX_DEMO__ = ${scriptJson(demo)};</script><script>${DEMO_RUNNER_CODE}</script>` : "";
  const accent = accentTokens(color, dark);
  const grad = accent["--ux-grad"];
  const accentCss = Object.entries(accent)
    .map(([name, value]) => `  ${name}: ${value} !important;`)
    .join("\n");

  const buttonCss = input.button
    ? `
.ux {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}
.u001-blobs { display: none !important; }
.u001-float {
  animation: u001-float-anim 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
  will-change: transform;
  backface-visibility: hidden;
}
.u001-sheen {
  animation: u001-shimmer-anim 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
  will-change: transform;
  backface-visibility: hidden;
}
.u001-btn {
  --g1: color-mix(in srgb, ${color} 25%, rgba(255,255,255,0.85));
  --g2: color-mix(in srgb, ${color} 45%, rgba(255,255,255,0.55));
  --g3: color-mix(in srgb, ${color} 65%, rgba(255,255,255,0.7));
  box-shadow: inset 0 1.5px 0 rgba(255,255,255,.8), inset 0 -12px 20px -14px rgba(255,255,255,.8), inset 0 0 0 1px rgba(255,255,255,.45), 0 20px 36px -16px color-mix(in srgb, ${color} ${input.glow ? "45%" : "20%"}, transparent) !important;
  transition: transform 0.2s cubic-bezier(0.34, 1.45, 0.64, 1), box-shadow 0.2s ease !important;
  will-change: transform, box-shadow;
}
.u002-glow {
  opacity: ${input.glow ? "0.55" : "0"} !important;
  animation: u002-glow-pulse 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
  background: ${grad} !important;
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}
.u002-fill { background: ${grad} !important; }
`
    : "";

  const fitScript = input.button
    ? `
    var btn = el.querySelector('button') || el;
    var btnW = btn.offsetWidth || 252;
    var btnH = btn.offsetHeight || 78;
    var s = Math.min(1, window.innerWidth / Math.max(btnW, 1), window.innerHeight / Math.max(btnH, 1));
    el.style.transform = s < 0.98 ? 'translate3d(0, 0, 0) scale(' + s.toFixed(3) + ')' : 'translate3d(0, 0, 0)';
    el.style.transformOrigin = 'center center';`
    : `
    var w = el.offsetWidth || 300;
    var h = el.offsetHeight || 170;
    var s = Math.min(1, window.innerWidth / Math.max(w, 1), window.innerHeight / Math.max(h, 1));
    el.style.transform = 'translate3d(0, 0, 0) scale(' + s.toFixed(3) + ')';
    el.style.transformOrigin = 'center center';`;

  return `<!DOCTYPE html>
<html data-theme="${dark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/ux-tokens.css">
<script>
(function() {
  try {
    window.focus = function() {};
    window.scrollTo = function() {};
    window.scrollBy = function() {};
    if (window.Element && window.Element.prototype) {
      window.Element.prototype.scrollIntoView = function() {};
    }
    HTMLElement.prototype.focus = function() {};
    if (window.HTMLInputElement && HTMLInputElement.prototype) {
      HTMLInputElement.prototype.select = function() {};
    }
  } catch(e) {}
})();
</script>
${speedScript(speed)}
<style>
/* ":root[data-theme]" outranks the stock tokens' ":root[data-theme=dark]" and dark media block,
   which a bare ":root" would lose to: the part's colors must win in either theme */
:root, :root[data-theme] {
  --anim-speed: ${speed};
  --ux-spring: cubic-bezier(.34, 1.45, .64, 1);
  --ux-ease: cubic-bezier(.2, .8, .2, 1);
  --ux-mint: #119C72;
  --ux-ink: ${dark ? "#F4F0E8" : "#16151B"};
  --ux-ink-2: ${dark ? "rgba(244,240,232,.68)" : "#57535F"};
  --ux-ink-3: ${dark ? "rgba(244,240,232,.42)" : "#8E8A97"};
  --ux-line: ${dark ? "rgba(255,255,255,.08)" : "rgba(22,21,27,.09)"};
  --ux-line-2: ${dark ? "rgba(255,255,255,.16)" : "rgba(22,21,27,.17)"};
  --ux-surface: ${dark ? "#13141C" : "#FFFFFF"};
  --ux-surface-2: ${dark ? "#1A1B25" : "#F5F3EF"};
  --ux-page: transparent;
${accentCss}
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  color: ${ink};
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden !important;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
* { scrollbar-width: none !important; -ms-overflow-style: none !important; }
.ux {
  transform-origin: center center;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
}
${buttonCss}
</style>
</head>
<body>
${html}
<script>${js}</script>
${demoScript}
${input.reportTaps ? TAP_REPORT_SCRIPT : ""}
<script>
(function() {
  var customText = ${scriptJson(input.label || "")};
  if (customText) {
    function applyCustomText() {
      var u002 = document.querySelector('.u002-txt');
      if (u002) {
        var s1 = u002.querySelector('span:first-child');
        if (s1) { s1.textContent = customText; return; }
      }
      var u001 = document.querySelector('.u001-txt');
      if (u001) {
        u001.textContent = customText;
        return;
      }
      var txtEl = document.querySelector('[class*="-txt"], button > span:not([class*="orb"]):not([class*="icon"]):not([class*="spin"]):not([class*="sheen"]), button');
      if (txtEl) {
        var inner = txtEl.querySelector('span:first-child');
        if (inner) inner.textContent = customText;
        else txtEl.textContent = customText;
      }
    }
    applyCustomText();
    setTimeout(applyCustomText, 50);
  }

  /* scale the template down to its frame, so no scrollbar ever shows */
  function fit() {
    var el = document.querySelector('.ux');
    if (!el) return;${fitScript}
  }
  window.addEventListener('resize', fit);
  fit();
  setTimeout(fit, 80);
})();
</script>
</body>
</html>`;
}
