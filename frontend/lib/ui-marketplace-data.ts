// UI Marketplace data types & helpers
// Real data loaded at runtime from /ux-full-catalog.json

export interface UITemplate {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  category: string;
  summary: string;
  summaryEn: string;
  hint: string;
  hintEn: string;
  shape: "square" | "tall";
  hue: string;
  hue2: string;
  tags: string[];
  source: string;
  // Live preview code
  html: string;
  js: string;
  demo: unknown[];
  map: string[][];
}

export const CATEGORIES = [
  { id: "all", label: "All", icon: "apps" },
  { id: "버튼", label: "Buttons", icon: "touch_app" },
  { id: "토글·선택", label: "Toggle & Select", icon: "toggle_on" },
  { id: "입력·검색", label: "Input & Search", icon: "edit" },
  { id: "메뉴·탭", label: "Menu & Tabs", icon: "menu" },
  { id: "카드·콘텐츠", label: "Cards & Content", icon: "dashboard" },
  { id: "로그인·가입", label: "Login & Signup", icon: "lock" },
  { id: "알림·피드백", label: "Alerts & Feedback", icon: "notifications" },
  { id: "로딩·진행", label: "Loading & Progress", icon: "hourglass_empty" },
  { id: "빈·오류 상태", label: "Empty & Error", icon: "error_outline" },
  { id: "위젯·차트", label: "Widgets & Charts", icon: "bar_chart" },
  { id: "공간·일정·디자인 도구", label: "Workspace & Design", icon: "palette" },
  { id: "문서·데이터 편집", label: "Docs & Data", icon: "description" },
  { id: "분석·데이터", label: "Analytics & Data", icon: "insights" },
  { id: "작업·시스템", label: "Ops & System", icon: "settings" },
];

/** Translate template HTML & JS using its embedded translation map */
export function translateTemplateSource(template: UITemplate): { html: string; js: string } {
  let html = template.html || "";
  let js = template.js || "";
  if (Array.isArray(template.map)) {
    for (const pair of template.map) {
      if (Array.isArray(pair) && pair[0] && pair[1]) {
        html = html.split(pair[0]).join(pair[1]);
        js = js.split(pair[0]).join(pair[1]);
      }
    }
  }

  // Sanitize any remaining Lucian references
  html = html
    .replace(/LUCIAN/g, "HIẾU THUẬN")
    .replace(/LucianLabs/gi, "Hiếu Thuận")
    .replace(/lucianLabs/gi, "Hiếu Thuận")
    .replace(/@lucian\//gi, "@pickme3d/")
    .replace(/seoyeon@lucian/gi, "seoyeon@hieuthuan")
    .replace(/Lucian2026/gi, "HieuThuan2026")
    .replace(/lucian\.app/gi, "pickme3d.com")
    .replace(/Lucian/g, "Hiếu Thuận")
    .replace(/lucian/g, "hieuthuan");

  js = js
    .replace(/LUCIAN/g, "HIẾU THUẬN")
    .replace(/LucianLabs/gi, "Hiếu Thuận")
    .replace(/lucianLabs/gi, "Hiếu Thuận")
    .replace(/@lucian\//gi, "@pickme3d/")
    .replace(/seoyeon@lucian/gi, "seoyeon@hieuthuan")
    .replace(/Lucian2026/gi, "HieuThuan2026")
    .replace(/lucian\.app/gi, "pickme3d.com")
    .replace(/Lucian/g, "Hiếu Thuận")
    .replace(/lucian/g, "hieuthuan");

  return { html, js };
}

/** Demo runner that drives automated interactions */
const DEMO_RUNNER_CODE = `
(function() {
  var demo = window.__UX_DEMO__;
  if (!Array.isArray(demo) || demo.length === 0) return;
  var stepIdx = 0, running = true, timer = 0, raf = 0;

  function getEl(sel, idx) {
    if (!sel || sel === ':root') return document.documentElement;
    if (sel === 'body') return document.body;
    var all = document.querySelectorAll(sel);
    return all[idx || 0] || document.querySelector(sel);
  }

  function next() {
    if (!running) return;
    if (stepIdx >= demo.length) {
      stepIdx = 0;
      timer = setTimeout(next, 2000);
      return;
    }
    var s = demo[stepIdx++];
    if (!Array.isArray(s)) { next(); return; }
    var cmd = s[0];

    if (cmd === 'wait') {
      timer = setTimeout(next, s[1] || 400);
    } else if (cmd === 'tap') {
      var el = getEl(s[1], s[2]);
      if (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
        setTimeout(function() {
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
          var after = (s[3] && s[3].after) || 160;
          timer = setTimeout(next, after);
        }, 120);
      } else {
        next();
      }
    } else if (cmd === 'hover') {
      var el = getEl(s[1], s[2]);
      if (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, clientX: cx, clientY: cy }));
        el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx, clientY: cy }));
      }
      var after = (s[3] && s[3].after) || 600;
      timer = setTimeout(next, after);
    } else if (cmd === 'hold') {
      var el = getEl(s[1], s[2]);
      var dur = s[3] || 1200;
      if (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
        setTimeout(function() {
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
          timer = setTimeout(next, 300);
        }, dur);
      } else {
        timer = setTimeout(next, dur);
      }
    } else if (cmd === 'glide') {
      var el = getEl(s[1], s[2]);
      var from = s[3] || [0.1, 0.5];
      var to = s[4] || [0.5, 0.5];
      var dur = s[5] || 700;
      if (el) {
        var r = el.getBoundingClientRect();
        var sx = r.left + r.width * from[0], sy = r.top + r.height * from[1];
        var ex = r.left + r.width * to[0], ey = r.top + r.height * to[1];
        var t0 = performance.now();
        function loop(now) {
          if (!running) return;
          var p = Math.min(1, (now - t0) / dur);
          var x = sx + (ex - sx) * p, y = sy + (ey - sy) * p;
          el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
          if (p < 1) raf = requestAnimationFrame(loop);
          else next();
        }
        raf = requestAnimationFrame(loop);
      } else {
        next();
      }
    } else if (cmd === 'leave') {
      document.documentElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      timer = setTimeout(next, s[1] || 400);
    } else {
      timer = setTimeout(next, 400);
    }
  }

  timer = setTimeout(next, 350);
})();
`;

/** Build full standalone HTML for an iframe with ux-tokens + translated component CSS/HTML/JS + optional auto demo */
export function buildPreviewHTML(
  template: UITemplate,
  tokensCSS: string,
  theme: "light" | "dark" = "dark",
  autoPlayDemo: boolean = true,
  interactive: boolean = false
): string {
  if (!template.html) return "";
  const { html, js } = translateTemplateSource(template);
  const demoScript =
    autoPlayDemo && Array.isArray(template.demo) && template.demo.length > 0
      ? `<script>window.__UX_DEMO__ = ${JSON.stringify(template.demo)};</script><script>${DEMO_RUNNER_CODE}<\/script>`
      : "";

  return `<!DOCTYPE html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
// Prevent iframe micro-interactions from stealing browser focus or jumping outer window scroll
(function() {
  try {
    window.focus = function() {};
    window.scrollTo = function() {};
    window.scrollBy = function() {};
    if (window.Element && window.Element.prototype) {
      window.Element.prototype.scrollIntoView = function() {};
    }

    var origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(options) {
      if (${interactive ? "true" : "false"}) {
        try {
          origFocus.call(this, { preventScroll: true, ...(options || {}) });
        } catch(e) {}
      }
      // Non-interactive cards never trigger native focus
    };

    if (window.HTMLInputElement && HTMLInputElement.prototype) {
      HTMLInputElement.prototype.select = function() {};
    }

    // Prevent links with # or javascript from jumping page scroll
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) {
        var href = a.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) {
          e.preventDefault();
        }
      }
    }, true);

    // Prevent form submission reloads
    document.addEventListener('submit', function(e) {
      e.preventDefault();
    }, true);
  } catch(err) {}
})();
<\/script>
<style>
${tokensCSS}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ux-page);
  color: var(--ux-ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  user-select: none;
}
/* Scale component slightly if larger than preview box */
.ux {
  transform-origin: center center;
}
</style>
</head>
<body>
${html}
<script>${js}<\/script>
${demoScript}
<script>
(function() {
  function fit() {
    var el = document.querySelector('.ux');
    if (!el) return;
    var w = el.offsetWidth || 340;
    var h = el.offsetHeight || 240;
    var winW = window.innerWidth || 340;
    var winH = window.innerHeight || 240;
    var pad = 16;
    var s = Math.min(1, (winW - pad) / Math.max(w, 1), (winH - pad) / Math.max(h, 1));
    el.style.transform = 'scale(' + s.toFixed(3) + ')';
    el.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fit);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fit);
  } else {
    fit();
  }
  setTimeout(fit, 50);
  setTimeout(fit, 250);
})();
<\/script>
</body>
</html>`;
}

/** Build full downloadable HTML file with embedded tokens & translated English content */
export function buildDownloadHTML(template: UITemplate, tokensCSS: string): string {
  if (!template.html) return "";
  const { html, js } = translateTemplateSource(template);
  return `<!DOCTYPE html>
<html data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${template.titleEn} — PickMe3D UI #${template.id}</title>
<style>
${tokensCSS}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ux-page);
  color: var(--ux-ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}
