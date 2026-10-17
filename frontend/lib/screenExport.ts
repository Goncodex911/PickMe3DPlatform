import JSZip from "jszip";

export type ExportFormat = 
  | "html" 
  | "react" 
  | "angular" 
  | "html-folder" 
  | "react-folder" 
  | "angular-folder" 
  | "all-folder" 
  | "png" 
  | "jpeg" 
  | "pdf";

export type ExportScreenData = {
  id: string;
  name: string;
  markup: string;
  width: number;
  height: number;
  swipe?: Partial<Record<string, string>>;
};

export type MultiScreenExportPayload = {
  projectName: string;
  screens: ExportScreenData[];
  initialScreenId?: string;
};

export const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "screen";

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Capture computed styles so exports do not depend on editor CSS classes. */
export async function screenMarkup(element: HTMLElement, width: number, height: number): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...element.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  for (let i = 0; i < originals.length; i++) {
    const source = originals[i];
    const target = copies[i];
    const style = getComputedStyle(source);

    target.removeAttribute("class");
    target.removeAttribute("data-export");

    for (const key of Array.from(style)) {
      target.style.setProperty(key, style.getPropertyValue(key));
    }
    for (const attr of Array.from(target.attributes)) {
      if (/^on/i.test(attr.name)) target.removeAttribute(attr.name);
    }

    // Ensure all exported elements allow interaction
    target.style.setProperty("pointer-events", "auto");

    // Explicitly preserve interactive navigation attributes
    if (source.hasAttribute("data-action-to")) {
      target.setAttribute("data-action-to", source.getAttribute("data-action-to") || "");
      target.style.setProperty("cursor", "pointer");
    }
    if (source.hasAttribute("data-action-transition")) {
      target.setAttribute("data-action-transition", source.getAttribute("data-action-transition") || "");
    }
    if (source.hasAttribute("data-action-url")) {
      target.setAttribute("data-action-url", source.getAttribute("data-action-url") || "");
    }
    if (source.hasAttribute("data-item-id")) {
      target.setAttribute("data-item-id", source.getAttribute("data-item-id") || "");
    }

    if (source instanceof HTMLImageElement) {
      try {
        const response = await fetch(source.currentSrc || source.src);
        if (response.ok) {
          const blob = await response.blob();
          (target as HTMLImageElement).src = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // Fallback: keep existing src
      }
      target.removeAttribute("srcset");
    }
  }

  clone.style.transformOrigin = "top left";
  clone.style.pointerEvents = "auto";
  if (element.offsetWidth > 0 && element.offsetHeight > 0) {
    clone.style.transform = `scale(${width / element.offsetWidth}, ${height / element.offsetHeight})`;
  }
  return `<main class="export-screen" style="pointer-events: auto;">${clone.outerHTML}</main>`;
}

/** Normalize input to support both single-screen and multi-screen payload */
export function normalizePayload(
  nameOrPayload: string | MultiScreenExportPayload,
  markup?: string,
  width = 390,
  height = 844
): MultiScreenExportPayload {
  if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
    return nameOrPayload;
  }
  return {
    projectName: nameOrPayload || "Screen",
    screens: [
      {
        id: "screen-1",
        name: nameOrPayload || "Screen",
        markup: markup || "",
        width,
        height,
      },
    ],
  };
}

/** One self-contained document or component suitable for pasting into an existing project. */
export function screenCode(
  format: "html" | "react" | "angular",
  markupOrPayload: string | MultiScreenExportPayload,
  width = 390,
  height = 844
): string {
  if (typeof markupOrPayload === "string") {
    const markup = markupOrPayload;
    const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');\n.export-screen{position:relative;width:${width}px;height:${height}px;overflow:hidden}\n`;
    if (format === "html") {
      return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Exported screen</title>\n<style>body{margin:0}\n${css}</style>\n</head>\n<body>\n${markup}\n</body>\n</html>`;
    }
    if (format === "react") {
      return `// Paste into App.jsx in a React project. Static UI; add application behavior as needed.\nexport default function App() {\n  return (<>\n    <style>{${JSON.stringify(css)}}</style>\n    <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(markup)} }} />\n  </>);\n}\n`;
    }
    const template = markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
    return `// Paste into app.component.ts in an Angular project. Static UI.\nimport { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root',\n  standalone: true,\n  template: ${JSON.stringify(template)},\n  styles: [${JSON.stringify(css)}]\n})\nexport class AppComponent {}\n`;
  }

  return multiScreenCode(format, markupOrPayload);
}

export function multiScreenCode(
  format: "html" | "react" | "angular",
  payload: MultiScreenExportPayload
): string {
  const screens = payload.screens;
  const initialId = payload.initialScreenId || screens[0]?.id || "";
  const first = screens[0] || { width: 390, height: 844, markup: "" };

  const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #0b0e14; font-family: 'Roboto', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
.prototype-app { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 1200px; padding: 16px; }
.prototype-nav { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: ${first.width}px; margin-bottom: 12px; padding: 8px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; backdrop-filter: blur(12px); font-size: 13px; }
.prototype-nav select { background: #1a1e28; color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 4px 10px; font-size: 13px; outline: none; }
.prototype-nav button { background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; }
.prototype-nav button:hover { background: rgba(255,255,255,0.2); }
.prototype-nav button:disabled { opacity: 0.4; cursor: not-allowed; }
.device-container { position: relative; width: ${first.width}px; height: ${first.height}px; border-radius: 36px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 10px #1e2330; background: #000; }
.screen-wrapper { position: absolute; inset: 0; width: 100%; height: 100%; display: none; overflow: hidden; }
.screen-wrapper.active { display: block; animation: screenFadeIn 0.24s cubic-bezier(0.2, 0, 0, 1) forwards; }
@keyframes screenFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.export-screen { position: relative; width: 100%; height: 100%; overflow: hidden; }
[data-action-to] { cursor: pointer !important; transition: filter 0.15s ease, transform 0.1s ease; }
[data-action-to]:hover { filter: brightness(1.08); }
[data-action-to]:active { transform: scale(0.97); }
`;

  if (format === "html") {
    const screensHtml = screens
      .map(
        (s) =>
          `<div class="screen-wrapper ${s.id === initialId ? "active" : ""}" id="screen-${s.id}" data-screen-id="${s.id}">\n${s.markup}\n</div>`
      )
      .join("\n");

    const script = `
    (function() {
      let currentId = ${JSON.stringify(initialId)};
      const history = [currentId];
      const select = document.getElementById("proto-select");
      const btnBack = document.getElementById("proto-back");

      function setScreen(id, isBack = false) {
        if (!id || id === currentId) return;
        const cur = document.getElementById("screen-" + currentId);
        const next = document.getElementById("screen-" + id);
        if (!next) return;
        if (cur) cur.classList.remove("active");
        next.classList.add("active");
        currentId = id;
        if (!isBack) history.push(id);
        if (select) select.value = id;
        if (btnBack) btnBack.disabled = history.length <= 1;
      }

      function goBack() {
        if (history.length > 1) {
          history.pop();
          setScreen(history[history.length - 1], true);
        }
      }

      document.querySelectorAll("[data-action-to]").forEach(el => {
        el.addEventListener("click", e => {
          e.stopPropagation();
          const to = el.getAttribute("data-action-to");
          const url = el.getAttribute("data-action-url");
          if (to === "link" && url) window.open(url, "_blank");
          else if (to === "back") goBack();
          else if (to) setScreen(to);
        });
      });

      if (select) select.addEventListener("change", e => setScreen(e.target.value));
      if (btnBack) btnBack.addEventListener("click", goBack);
      window.addEventListener("keydown", e => {
        if (e.key === "Backspace" || e.key === "ArrowLeft") goBack();
      });
    })();`;

    return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${payload.projectName} - Interactive Prototype</title>
<style>${css}</style>
</head>
<body>
<div class="prototype-app">
  <div class="prototype-nav">
    <button id="proto-back" disabled>← Quay lại</button>
    <select id="proto-select">
      ${screens.map((s, idx) => `<option value="${s.id}">${idx + 1}. ${s.name}</option>`).join("")}
    </select>
    <span>${screens.length} màn hình</span>
  </div>
  <div class="device-container">
    ${screensHtml}
  </div>
</div>
<script>${script}</script>
</body>
</html>`;
  }

  if (format === "react") {
    const screensArray = JSON.stringify(
      screens.map((s) => ({ id: s.id, name: s.name, markup: s.markup, width: s.width, height: s.height }))
    );

    return `import React, { useState, useEffect } from 'react';

const SCREENS = ${screensArray};

export default function App() {
  const [currentId, setCurrentId] = useState(${JSON.stringify(initialId)});
  const [history, setHistory] = useState([${JSON.stringify(initialId)}]);

  const setScreen = (id, isBack = false) => {
    if (!id || id === currentId) return;
    if (!SCREENS.some(s => s.id === id)) return;
    setCurrentId(id);
    if (!isBack) {
      setHistory(prev => [...prev, id]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop();
      const prevId = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setCurrentId(prevId);
    }
  };

  useEffect(() => {
    const handleActionClick = (e) => {
      const target = e.target.closest('[data-action-to]');
      if (!target) return;
      e.stopPropagation();
      const to = target.getAttribute('data-action-to');
      const url = target.getAttribute('data-action-url');
      if (to === 'link' && url) {
        window.open(url, '_blank');
      } else if (to === 'back') {
        goBack();
      } else if (to) {
        setScreen(to);
      }
    };

    document.addEventListener('click', handleActionClick);
    return () => document.removeEventListener('click', handleActionClick);
  }, [history]);

  const activeScreen = SCREENS.find(s => s.id === currentId) || SCREENS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: activeScreen.width, marginBottom: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 16 }}>
        <button onClick={goBack} disabled={history.length <= 1} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>← Quay lại</button>
        <select value={currentId} onChange={e => setScreen(e.target.value)} style={{ background: '#1a1e28', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px' }}>
          {SCREENS.map((s, idx) => <option key={s.id} value={s.id}>{idx + 1}. {s.name}</option>)}
        </select>
        <span>{activeScreen.name}</span>
      </div>

      <div style={{ width: activeScreen.width, height: activeScreen.height, borderRadius: 36, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 10px #1e2330', background: '#000', position: 'relative' }}>
        {SCREENS.map(s => (
          <div key={s.id} style={{ display: s.id === currentId ? 'block' : 'none', width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: s.markup }} />
        ))}
      </div>
    </div>
  );
}
`;
  }

  const template = first.markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
  return `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: ${JSON.stringify(template)},
  styles: [${JSON.stringify(css)}]
})
export class AppComponent {}
`;
}

/** Project folder generator for Interactive Multi-Screen HTML + CSS prototype */
export async function createHtmlFolderZip(
  nameOrPayload: string | MultiScreenExportPayload,
  markup?: string,
  width = 390,
  height = 844
): Promise<Blob> {
  const payload = normalizePayload(nameOrPayload, markup, width, height);
  const zip = new JSZip();
  const folderName = `${safeName(payload.projectName)}-html`;
  const folder = zip.folder(folderName) || zip;
  const screens = payload.screens;
  const initialId = payload.initialScreenId || screens[0]?.id || "";
  const first = screens[0] || { width: 390, height: 844, markup: "" };

  const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: #0b0e14;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prototype-header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  padding: 12px 24px;
  background: rgba(15, 17, 23, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-badge {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.ctrl-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.3);
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-select {
  height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #181d28;
  color: #fff;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.prototype-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  width: 100%;
}

.device-frame {
  position: relative;
  width: ${first.width}px;
  height: ${first.height}px;
  border-radius: 38px;
  overflow: hidden;
  box-shadow: 0 25px 65px rgba(0, 0, 0, 0.65), 0 0 0 10px #1c212c, 0 0 0 12px rgba(255, 255, 255, 0.08);
  background: #000;
  transition: width 0.3s ease, height 0.3s ease;
}

.device-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 96px;
  height: 24px;
  background: #000;
  border-radius: 12px;
  z-index: 50;
  pointer-events: none;
}

.screen-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.prototype-screen {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: none;
  overflow: hidden;
}

.prototype-screen.active {
  display: block;
}

.prototype-screen.enter-right {
  display: block;
  animation: enterRight 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.prototype-screen.exit-left {
  display: block;
  animation: exitLeft 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.prototype-screen.enter-left {
  display: block;
  animation: enterLeft 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.prototype-screen.exit-right {
  display: block;
  animation: exitRight 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes enterRight {
  from { transform: translateX(100%); opacity: 0.6; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes exitLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0.6; }
}
@keyframes enterLeft {
  from { transform: translateX(-100%); opacity: 0.6; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes exitRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0.6; }
}

.export-screen, .export-screen * {
  pointer-events: auto !important;
}

[data-action-to] {
  cursor: pointer !important;
  pointer-events: auto !important;
  user-select: none;
  transition: transform 0.12s ease, filter 0.12s ease;
}

[data-action-to] * {
  pointer-events: none !important;
}

[data-action-to]:hover {
  filter: brightness(1.15);
}

[data-action-to]:active {
  transform: scale(0.96);
}

.highlight-hotspots [data-action-to] {
  outline: 2px dashed #6366f1 !important;
  outline-offset: 2px;
  animation: pulseHotspot 1.5s infinite;
}

@keyframes pulseHotspot {
  0% { outline-color: #6366f1; }
  50% { outline-color: #ec4899; }
  100% { outline-color: #6366f1; }
}

.view-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 3px;
  gap: 4px;
}

.view-tab {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-tab.active {
  background: #6366f1;
  color: #fff;
  font-weight: 600;
}

.canvas-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  padding: 40px;
  justify-content: center;
  width: 100%;
  max-width: 1600px;
}

.canvas-card {
  background: #141824;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.canvas-card-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.canvas-card-title {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

.canvas-card-btn {
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.canvas-card-btn:hover {
  opacity: 0.9;
}
`;

  const screensHtml = screens
    .map(
      (s) => `
      <div class="prototype-screen ${s.id === initialId ? "active" : ""}" 
           id="screen-${s.id}" 
           data-screen-id="${s.id}" 
           data-screen-name="${s.name}"
           data-width="${s.width}" 
           data-height="${s.height}"
           data-swipe-left="${s.swipe?.left || ""}"
           data-swipe-right="${s.swipe?.right || ""}"
           data-swipe-up="${s.swipe?.up || ""}"
           data-swipe-down="${s.swipe?.down || ""}">
        ${s.markup}
      </div>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${payload.projectName} - Interactive Prototype</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap">
</head>
<body>
  <header class="prototype-header">
    <div class="brand">
      <span class="brand-badge">PROTOTYPE</span>
      <span class="brand-title">${payload.projectName}</span>
    </div>

    <div class="view-tabs">
      <button class="view-tab active" id="tab-device" title="Chế độ mô phỏng thiết bị tương tác">📱 Thiết bị (${screens.length})</button>
      <button class="view-tab" id="tab-canvas" title="Xem dàn trải tất cả các màn hình cùng lúc">🖼️ Tất cả màn hình</button>
    </div>

    <div class="controls">
      <button class="ctrl-btn" id="btn-back" disabled title="Quay lại màn hình trước (Backspace / Phím mũi tên trái)">
        <span class="material-symbols-rounded">arrow_back</span>
        <span>Quay lại</span>
      </button>

      <select class="ctrl-select" id="screen-selector" title="Chuyển màn hình trực tiếp">
        ${screens.map((s, idx) => `<option value="${s.id}">${idx + 1}. ${s.name}</option>`).join("")}
      </select>

      <button class="ctrl-btn" id="btn-restart" title="Bắt đầu lại từ màn hình đầu tiên (Phím R)">
        <span class="material-symbols-rounded">restart_alt</span>
        <span>Bắt đầu lại</span>
      </button>

      <button class="ctrl-btn" id="btn-hotspots" title="Bật/Tắt viền gợi ý các nút bấm có chuyển hướng (Phím H)">
        <span class="material-symbols-rounded">touch_app</span>
      </button>
    </div>
  </header>

  <main class="prototype-main">
    <div class="device-frame" id="device-container">
      <div class="device-notch"></div>
      <div class="screen-viewport">
        ${screensHtml}
      </div>
    </div>

    <div class="canvas-grid" id="canvas-container" style="display: none;">
      ${screens.map((s, idx) => `
        <div class="canvas-card">
          <div class="canvas-card-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="brand-badge" style="background:#475569;">${idx + 1}</span>
              <span class="canvas-card-title">${s.name}</span>
              <span style="font-size:12px;color:rgba(255,255,255,0.4);">${s.width} × ${s.height}</span>
            </div>
            <button class="canvas-card-btn" data-switch-to="${s.id}">Mở tương tác ▶</button>
          </div>
          <div style="width:${s.width}px;height:${s.height}px;overflow:hidden;position:relative;">
            ${s.markup}
          </div>
        </div>
      `).join("\n")}
    </div>
  </main>

  <script src="prototype.js"></script>
</body>
</html>`;

  const script = `
(function() {
  const screens = Array.from(document.querySelectorAll('.prototype-screen'));
  if (!screens.length) return;

  const selector = document.getElementById('screen-selector');
  const btnBack = document.getElementById('btn-back');
  const btnRestart = document.getElementById('btn-restart');
  const btnHotspots = document.getElementById('btn-hotspots');
  const deviceContainer = document.getElementById('device-container');
  const canvasContainer = document.getElementById('canvas-container');
  const tabDevice = document.getElementById('tab-device');
  const tabCanvas = document.getElementById('tab-canvas');

  let currentId = ${JSON.stringify(initialId)};
  const history = [currentId];
  let showHotspots = false;

  function findScreenEl(targetId) {
    if (!targetId) return null;
    return document.getElementById('screen-' + targetId) ||
           document.getElementById(targetId) ||
           document.querySelector('[data-screen-id="' + targetId + '"]') ||
           document.querySelector('[data-screen-name="' + targetId + '"]') ||
           document.querySelector('.prototype-screen[id*="' + targetId + '"]');
  }

  function setScreen(targetId, isBack = false) {
    if (!targetId) return;
    const targetEl = findScreenEl(targetId);
    if (!targetEl) {
      console.warn('Screen not found for target:', targetId);
      return;
    }

    const currentEl = findScreenEl(currentId);
    const tw = targetEl.dataset.width;
    const th = targetEl.dataset.height;
    if (tw && th && deviceContainer) {
      deviceContainer.style.width = tw + 'px';
      deviceContainer.style.height = th + 'px';
    }

    if (currentEl && currentEl !== targetEl) {
      currentEl.className = 'prototype-screen exit-' + (isBack ? 'right' : 'left');
      targetEl.className = 'prototype-screen active enter-' + (isBack ? 'left' : 'right');

      setTimeout(() => {
        currentEl.className = 'prototype-screen';
        targetEl.className = 'prototype-screen active';
      }, 280);
    } else {
      screens.forEach((s) => (s.className = 'prototype-screen'));
      targetEl.className = 'prototype-screen active';
    }

    currentId = targetEl.dataset.screenId || targetId;
    if (!isBack && history[history.length - 1] !== currentId) {
      history.push(currentId);
    }

    if (selector) selector.value = currentId;
    if (btnBack) btnBack.disabled = history.length <= 1;

    // If currently in canvas view, switch back to device view
    if (tabDevice && tabCanvas && canvasContainer && canvasContainer.style.display !== 'none') {
      switchView('device');
    }
  }

  function goBack() {
    if (history.length > 1) {
      history.pop();
      const prevId = history[history.length - 1];
      setScreen(prevId, true);
    }
  }

  function restart() {
    if (screens.length > 0) {
      history.length = 0;
      const firstId = screens[0].dataset.screenId;
      history.push(firstId);
      setScreen(firstId, true);
    }
  }

  function toggleHotspots() {
    showHotspots = !showHotspots;
    document.body.classList.toggle('highlight-hotspots', showHotspots);
    if (btnHotspots) btnHotspots.style.borderColor = showHotspots ? '#6366f1' : '';
  }

  function switchView(mode) {
    if (mode === 'device') {
      if (deviceContainer) deviceContainer.style.display = 'block';
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (tabDevice) tabDevice.className = 'view-tab active';
      if (tabCanvas) tabCanvas.className = 'view-tab';
    } else {
      if (deviceContainer) deviceContainer.style.display = 'none';
      if (canvasContainer) canvasContainer.style.display = 'flex';
      if (tabDevice) tabDevice.className = 'view-tab';
      if (tabCanvas) tabCanvas.className = 'view-tab active';
    }
  }

  if (tabDevice) tabDevice.addEventListener('click', () => switchView('device'));
  if (tabCanvas) tabCanvas.addEventListener('click', () => switchView('canvas'));

  // Document-level event delegation for all interactive elements
  document.addEventListener('click', (e) => {
    // 1. Check canvas card switch button
    const switchBtn = e.target.closest('[data-switch-to]');
    if (switchBtn) {
      const targetScreen = switchBtn.getAttribute('data-switch-to');
      if (targetScreen) setScreen(targetScreen);
      return;
    }

    // 2. Check interactive elements with action
    const actionEl = e.target.closest('[data-action-to]');
    if (!actionEl) return;

    const to = actionEl.getAttribute('data-action-to');
    if (!to) return;

    e.preventDefault();
    e.stopPropagation();

    const url = actionEl.getAttribute('data-action-url');
    if (to === 'link' && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (to === 'back') {
      goBack();
    } else {
      setScreen(to);
    }
  });

  // Swipe detection
  if (deviceContainer) {
    let touchStartX = 0, touchStartY = 0;
    deviceContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    deviceContainer.addEventListener('touchend', (e) => {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;
      const currentEl = findScreenEl(currentId);
      if (!currentEl) return;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX < 0 && currentEl.dataset.swipeLeft) {
          setScreen(currentEl.dataset.swipeLeft);
        } else if (diffX > 0 && currentEl.dataset.swipeRight) {
          setScreen(currentEl.dataset.swipeRight);
        }
      } else if (Math.abs(diffY) > 40) {
        if (diffY < 0 && currentEl.dataset.swipeUp) {
          setScreen(currentEl.dataset.swipeUp);
        } else if (diffY > 0 && currentEl.dataset.swipeDown) {
          setScreen(currentEl.dataset.swipeDown);
        }
      }
    }, { passive: true });
  }

  if (selector) selector.addEventListener('change', (e) => setScreen(e.target.value));
  if (btnBack) btnBack.addEventListener('click', goBack);
  if (btnRestart) btnRestart.addEventListener('click', restart);
  if (btnHotspots) btnHotspots.addEventListener('click', toggleHotspots);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        goBack();
      }
    } else if (e.key.toLowerCase() === 'r') {
      restart();
    } else if (e.key.toLowerCase() === 'h') {
      toggleHotspots();
    }
  });
})();`;

  const readme = `# ${payload.projectName} - Interactive Prototype Export

Dự án nguyên mẫu (Prototype) tương tác đầy đủ được xuất từ PickMe3D Platform.

## Thông tin dự án:
- Tổng số màn hình: ${screens.length}
- Hỗ trợ chuyển hướng tương tác: Có (Buttons, Swipe, Back/Restart navigation).

## Danh sách màn hình:
${screens.map((s, idx) => `${idx + 1}. **${s.name}** (${s.width}x${s.height})`).join("\n")}

## Cách sử dụng:
1. Mở trực tiếp file \`index.html\` trên bất kỳ trình duyệt nào.
2. Hoặc chạy local server:
\`\`\`bash
npx serve .
\`\`\`
`;

  folder.file("index.html", html);
  folder.file("style.css", css);
  folder.file("prototype.js", script);
  folder.file("README.md", readme);

  // Standalone screen htmls
  const screensFolder = folder.folder("screens");
  if (screensFolder) {
    screens.forEach((s, idx) => {
      const fileName = `${String(idx + 1).padStart(2, "0")}-${safeName(s.name)}.html`;
      const screenHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${s.name}</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0b0e14;">
  <div style="width:${s.width}px;height:${s.height}px;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
    ${s.markup}
  </div>
</body>
</html>`;
      screensFolder.file(fileName, screenHtml);
    });
  }

  return await zip.generateAsync({ type: "blob" });
}

/** Project folder generator for Interactive Multi-Screen ReactJS (Vite + React) */
export async function createReactFolderZip(
  nameOrPayload: string | MultiScreenExportPayload,
  markup?: string,
  width = 390,
  height = 844
): Promise<Blob> {
  const payload = normalizePayload(nameOrPayload, markup, width, height);
  const zip = new JSZip();
  const folderName = `${safeName(payload.projectName)}-react`;
  const folder = zip.folder(folderName) || zip;
  const screens = payload.screens;
  const initialId = payload.initialScreenId || screens[0]?.id || "";

  const pkg = {
    name: `${safeName(payload.projectName).toLowerCase()}-react`,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.1",
      vite: "^5.4.2",
    },
  };

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

  const indexHtml = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${payload.projectName}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

  const mainJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

  const appCss = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: #0b0e14;
  font-family: 'Roboto', sans-serif;
  color: #fff;
}

.prototype-app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

.prototype-topbar {
  width: 100%;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.device-shell {
  border-radius: 38px;
  overflow: hidden;
  box-shadow: 0 25px 65px rgba(0,0,0,0.65), 0 0 0 10px #1c212c;
  background: #000;
  position: relative;
  transition: width 0.3s ease, height 0.3s ease;
}

.screen-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

[data-action-to] {
  cursor: pointer !important;
  transition: filter 0.15s ease, transform 0.1s ease;
}

[data-action-to]:hover {
  filter: brightness(1.08);
}

[data-action-to]:active {
  transform: scale(0.97);
}
`;

  const appJsx = `import React, { useState, useEffect } from 'react';

const SCREENS = ${JSON.stringify(
    screens.map((s) => ({
      id: s.id,
      name: s.name,
      markup: s.markup,
      width: s.width,
      height: s.height,
      swipe: s.swipe,
    })),
    null,
    2
  )};

export default function App() {
  const [currentId, setCurrentId] = useState(${JSON.stringify(initialId)});
  const [history, setHistory] = useState([${JSON.stringify(initialId)}]);

  const activeScreen = SCREENS.find((s) => s.id === currentId) || SCREENS[0];

  const setScreen = (id, isBack = false) => {
    if (!id || id === currentId) return;
    if (!SCREENS.some((s) => s.id === id)) return;
    setCurrentId(id);
    if (!isBack) {
      setHistory((prev) => [...prev, id]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop();
      const prevId = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setCurrentId(prevId);
    }
  };

  const restart = () => {
    if (SCREENS.length > 0) {
      setHistory([SCREENS[0].id]);
      setCurrentId(SCREENS[0].id);
    }
  };

  useEffect(() => {
    const handleActionClick = (e) => {
      const target = e.target.closest('[data-action-to]');
      if (!target) return;
      e.stopPropagation();
      const to = target.getAttribute('data-action-to');
      const url = target.getAttribute('data-action-url');
      if (to === 'link' && url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (to === 'back') {
        goBack();
      } else if (to) {
        setScreen(to);
      }
    };

    document.addEventListener('click', handleActionClick);
    return () => document.removeEventListener('click', handleActionClick);
  }, [currentId, history]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          goBack();
        }
      } else if (e.key.toLowerCase() === 'r') {
        restart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  return (
    <div className="prototype-app">
      <header className="prototype-topbar">
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          ${payload.projectName} <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>({SCREENS.length} màn hình)</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={goBack}
            disabled={history.length <= 1}
            style={{
              padding: '6px 14px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              cursor: history.length > 1 ? 'pointer' : 'not-allowed',
              opacity: history.length > 1 ? 1 : 0.4,
            }}
          >
            ← Quay lại
          </button>
          <select
            value={currentId}
            onChange={(e) => setScreen(e.target.value)}
            style={{
              background: '#1a1e28',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 18,
              padding: '6px 12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SCREENS.map((s, idx) => (
              <option key={s.id} value={s.id}>
                {idx + 1}. {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={restart}
            style={{
              padding: '6px 14px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Bắt đầu lại
          </button>
        </div>
      </header>

      <main className="device-stage">
        <div className="device-shell" style={{ width: activeScreen.width, height: activeScreen.height }}>
          {SCREENS.map((s) => (
            <div
              key={s.id}
              className="screen-view"
              style={{ display: s.id === currentId ? 'block' : 'none' }}
              dangerouslySetInnerHTML={{ __html: s.markup }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
`;

  const readme = `# ${payload.projectName} - ReactJS Prototype Export

Dự án ReactJS Prototype tương tác toàn diện từ PickMe3D Platform.

## Cài đặt và Chạy:
\`\`\`bash
npm install
npm run dev
\`\`\`
Mở trình duyệt tại \`http://localhost:5173\`.

Tất cả ${screens.length} màn hình đã được cấu hình chuyển hướng tương tác đầy đủ!
`;

  folder.file("package.json", JSON.stringify(pkg, null, 2));
  folder.file("vite.config.js", viteConfig);
  folder.file("index.html", indexHtml);
  folder.file("src/main.jsx", mainJsx);
  folder.file("src/App.jsx", appJsx);
  folder.file("src/App.css", appCss);
  folder.file("README.md", readme);

  return await zip.generateAsync({ type: "blob" });
}

/** Project folder generator for Angular */
export async function createAngularFolderZip(
  nameOrPayload: string | MultiScreenExportPayload,
  markup?: string,
  width = 390,
  height = 844
): Promise<Blob> {
  const payload = normalizePayload(nameOrPayload, markup, width, height);
  const zip = new JSZip();
  const folderName = `${safeName(payload.projectName)}-angular`;
  const folder = zip.folder(folderName) || zip;
  const screens = payload.screens;
  const first = screens[0] || { width: 390, height: 844, markup: "" };

  const pkg = {
    name: `${safeName(payload.projectName).toLowerCase()}-angular`,
    version: "1.0.0",
    private: true,
    dependencies: {
      "@angular/common": "^18.0.0",
      "@angular/core": "^18.0.0",
      "@angular/platform-browser": "^18.0.0",
    },
  };

  const template = first.markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");

  const componentTs = `import { Component } from '@angular/core';

@Component({
  selector: 'app-screen',
  standalone: true,
  templateUrl: './screen.component.html',
  styleUrls: ['./screen.component.css']
})
export class ScreenComponent {
  title = '${payload.projectName}';
}
`;

  const componentHtml = `<div class="screen-app-container">
  <div class="screen-frame">
    ${template}
  </div>
</div>
`;

  const componentCss = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');

:host {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0b0e14;
  font-family: 'Roboto', sans-serif;
}

.screen-app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.screen-frame {
  width: ${first.width}px;
  height: ${first.height}px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  background-color: #ffffff;
}

.export-screen {
  width: 100%;
  height: 100%;
  position: relative;
}
`;

  const readme = `# ${payload.projectName} - Angular Component Export
Exported from PickMe3D Platform with ${screens.length} screens.
`;

  folder.file("package.json", JSON.stringify(pkg, null, 2));
  folder.file("src/app/screen/screen.component.ts", componentTs);
  folder.file("src/app/screen/screen.component.html", componentHtml);
  folder.file("src/app/screen/screen.component.css", componentCss);
  folder.file("README.md", readme);

  return await zip.generateAsync({ type: "blob" });
}

/** Project folder generator containing HTML, React and Angular bundles */
export async function createAllFrameworksZip(
  nameOrPayload: string | MultiScreenExportPayload,
  markup?: string,
  width = 390,
  height = 844
): Promise<Blob> {
  const payload = normalizePayload(nameOrPayload, markup, width, height);
  const zip = new JSZip();
  const root = zip.folder(`${safeName(payload.projectName)}-full-bundle`) || zip;
  const screens = payload.screens;
  const first = screens[0] || { width: 390, height: 844, markup: "" };

  // 1. HTML
  const htmlFolder = root.folder("html");
  if (htmlFolder) {
    const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');
body { margin: 0; min-height: 100vh; display: flex; justify-content: center; align-items: center; background: #0f1117; font-family: 'Roboto', sans-serif; }
.screen-container { width: ${first.width}px; height: ${first.height}px; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-radius: 12px; background: #ffffff; }
.export-screen { width: 100%; height: 100%; position: relative; }
`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${payload.projectName}</title><link rel="stylesheet" href="style.css"></head><body><div class="screen-container">${first.markup}</div></body></html>`;
    htmlFolder.file("index.html", html);
    htmlFolder.file("style.css", css);

    // Also include the full interactive prototype zip contents
    const htmlProtoBlob = await createHtmlFolderZip(payload);
    const htmlProtoZip = await JSZip.loadAsync(htmlProtoBlob);
    for (const [path, file] of Object.entries(htmlProtoZip.files)) {
      if (!file.dir && !path.endsWith("style.css")) {
        const cleanPath = path.replace(/^[^\/]+\//, "");
        if (cleanPath !== "index.html") {
          htmlFolder.file(cleanPath, await file.async("blob"));
        }
      }
    }
  }

  // 2. React
  const reactFolder = root.folder("react");
  if (reactFolder) {
    reactFolder.file(
      "App.jsx",
      `import React from 'react';\n\nexport default function App() {\n  return (\n    <div style={{ width: ${first.width}, height: ${first.height}, position: 'relative', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(first.markup)} }} />\n  );\n}`
    );
    const reactBlob = await createReactFolderZip(payload);
    const reactZip = await JSZip.loadAsync(reactBlob);
    for (const [path, file] of Object.entries(reactZip.files)) {
      if (!file.dir && !path.endsWith("App.jsx")) {
        const cleanPath = path.replace(/^[^\/]+\//, "");
        reactFolder.file(cleanPath, await file.async("blob"));
      }
    }
  }

  // 3. Angular
  const angularFolder = root.folder("angular");
  if (angularFolder) {
    const template = first.markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
    angularFolder.file(
      "screen.component.html",
      `<div style="width: ${first.width}px; height: ${first.height}px; position: relative; overflow: hidden;">${template}</div>`
    );
  }

  root.file(
    "README.md",
    `# ${payload.projectName} Full Interactive Prototype Bundle
Bao gồm trọn bộ HTML/CSS Prototype, ReactJS Prototype, và Angular Component.
Tổng số màn hình: ${payload.screens.length}.
Được xuất tự động từ PickMe3D Platform.
`
  );

  return await zip.generateAsync({ type: "blob" });
}

/** A single-page PDF with a JPEG image at 96 CSS pixels per inch. */
export function imagePdf(jpeg: string, width: number, height: number): Blob {
  const bytes = Uint8Array.from(atob(jpeg.split(",")[1]), (c) => c.charCodeAt(0));
  const encode = (s: string) => new TextEncoder().encode(s);
  const parts: Uint8Array[] = [encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  const add = (s: string | Uint8Array) => {
    const b = typeof s === "string" ? encode(s) : s;
    parts.push(b);
    length += b.length;
  };
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length;
    add(`${id} 0 obj\n${body}`);
    if (stream) {
      add("\nstream\n");
      add(stream);
      add("\nendstream");
    }
    add("\nendobj\n");
  };
  const w = width * 0.75;
  const h = height * 0.75;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`,
    bytes
  );
  const stream = encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
  object(5, `<< /Length ${stream.length} >>`, stream);
  const xref = length;
  add(
    `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
      .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  );
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
