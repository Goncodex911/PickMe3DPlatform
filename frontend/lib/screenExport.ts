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

export const safeName = (name: string) => name.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "screen";

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Capture computed styles so exports do not depend on editor CSS classes. */
export async function screenMarkup(element: HTMLElement, width: number, height: number): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...element.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  for (let i = 0; i < originals.length; i++) {
    const source = originals[i], target = copies[i], style = getComputedStyle(source);
    target.removeAttribute("class"); target.removeAttribute("data-export");
    for (const key of Array.from(style)) target.style.setProperty(key, style.getPropertyValue(key));
    for (const attr of Array.from(target.attributes)) if (/^on/i.test(attr.name)) target.removeAttribute(attr.name);
    if (source instanceof HTMLImageElement) {
      const response = await fetch(source.currentSrc || source.src);
      if (!response.ok) throw new Error("Không thể tải ảnh để đóng gói.");
      const blob = await response.blob();
      (target as HTMLImageElement).src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
      });
      target.removeAttribute("srcset");
    }
  }
  clone.style.transformOrigin = "top left";
  clone.style.transform = `scale(${width / element.offsetWidth}, ${height / element.offsetHeight})`;
  return `<main class="export-screen">${clone.outerHTML}</main>`;
}

/** One self-contained document or component suitable for pasting into an existing project. */
export function screenCode(format: "html" | "react" | "angular", markup: string, width: number, height: number): string {
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

/** Project folder generator for HTML + CSS */
export async function createHtmlFolderZip(name: string, markup: string, width: number, height: number): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `${safeName(name)}-html`;
  const folder = zip.folder(folderName) || zip;
  const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0f1117;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.screen-container {
  width: ${width}px;
  height: ${height}px;
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

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="screen-container">
    ${markup}
  </div>
</body>
</html>`;

  const readme = `# ${name} - HTML & CSS UI Export

Thiết kế màn hình được xuất từ PickMe3D Platform.

## Thông số xuất:
- Kích thước: ${width}px x ${height}px
- Font: Roboto & Material Symbols Rounded

## Cách mở và xem:
1. Mở trực tiếp file \`index.html\` bằng bất kỳ trình duyệt nào.
2. Hoặc sử dụng server cục bộ:
\`\`\`bash
npx serve .
\`\`\`
`;

  folder.file("index.html", html);
  folder.file("style.css", css);
  folder.file("README.md", readme);

  return await zip.generateAsync({ type: "blob" });
}

/** Project folder generator for ReactJS (Vite + React) */
export async function createReactFolderZip(name: string, markup: string, width: number, height: number): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `${safeName(name)}-react`;
  const folder = zip.folder(folderName) || zip;

  const pkg = {
    name: `${safeName(name).toLowerCase()}-react`,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.1",
      vite: "^5.4.2"
    }
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
    <title>${name}</title>
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
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0f1117;
  font-family: 'Roboto', sans-serif;
}

.screen-app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  padding: 24px;
}

.screen-frame {
  width: ${width}px;
  height: ${height}px;
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

  const appJsx = `import React from 'react';
import './App.css';

export default function App() {
  return (
    <div className="screen-app-container">
      <div className="screen-frame" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(markup)} }} />
    </div>
  );
}
`;

  const readme = `# ${name} - ReactJS UI Export

Dự án ReactJS được xuất từ PickMe3D Platform.

## Cài đặt và Khởi chạy:
\`\`\`bash
npm install
npm run dev
\`\`\`
Mở trình duyệt tại \`http://localhost:5173\`.
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
export async function createAngularFolderZip(name: string, markup: string, width: number, height: number): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `${safeName(name)}-angular`;
  const folder = zip.folder(folderName) || zip;

  const pkg = {
    name: `${safeName(name).toLowerCase()}-angular`,
    version: "1.0.0",
    private: true,
    dependencies: {
      "@angular/common": "^18.0.0",
      "@angular/core": "^18.0.0",
      "@angular/platform-browser": "^18.0.0"
    }
  };

  const template = markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");

  const componentTs = `import { Component } from '@angular/core';

@Component({
  selector: 'app-screen',
  standalone: true,
  templateUrl: './screen.component.html',
  styleUrls: ['./screen.component.css']
})
export class ScreenComponent {
  title = '${name}';
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
  background-color: #0f1117;
  font-family: 'Roboto', sans-serif;
}

.screen-app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.screen-frame {
  width: ${width}px;
  height: ${height}px;
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

  const readme = `# ${name} - Angular Component Export

Component Angular được xuất từ PickMe3D Platform.

## Sử dụng trong dự án Angular:
1. Sao chép thư mục component vào dự án Angular của bạn.
2. Thêm \`ScreenComponent\` vào danh sách \`imports\` của trang hoặc router.
`;

  folder.file("package.json", JSON.stringify(pkg, null, 2));
  folder.file("src/app/screen/screen.component.ts", componentTs);
  folder.file("src/app/screen/screen.component.html", componentHtml);
  folder.file("src/app/screen/screen.component.css", componentCss);
  folder.file("README.md", readme);

  return await zip.generateAsync({ type: "blob" });
}

/** Project folder generator containing HTML, React and Angular bundles */
export async function createAllFrameworksZip(name: string, markup: string, width: number, height: number): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(`${safeName(name)}-full-bundle`) || zip;

  // 1. HTML
  const htmlFolder = root.folder("html");
  if (htmlFolder) {
    const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=swap');
body { margin: 0; min-height: 100vh; display: flex; justify-content: center; align-items: center; background: #0f1117; font-family: 'Roboto', sans-serif; }
.screen-container { width: ${width}px; height: ${height}px; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-radius: 12px; background: #ffffff; }
.export-screen { width: 100%; height: 100%; position: relative; }
`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><link rel="stylesheet" href="style.css"></head><body><div class="screen-container">${markup}</div></body></html>`;
    htmlFolder.file("index.html", html);
    htmlFolder.file("style.css", css);
  }

  // 2. React
  const reactFolder = root.folder("react");
  if (reactFolder) {
    reactFolder.file("App.jsx", `import React from 'react';\n\nexport default function App() {\n  return (\n    <div style={{ width: ${width}, height: ${height}, position: 'relative', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(markup)} }} />\n  );\n}`);
  }

  // 3. Angular
  const angularFolder = root.folder("angular");
  if (angularFolder) {
    const template = markup.replace(/@/g, "&#64;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
    angularFolder.file("screen.component.html", `<div style="width: ${width}px; height: ${height}px; position: relative; overflow: hidden;">${template}</div>`);
  }

  root.file("README.md", `# ${name} Full Project Bundle\nContains HTML/CSS, React, and Angular versions.\nExported from PickMe3D Platform.\n`);

  return await zip.generateAsync({ type: "blob" });
}

/** A single-page PDF with a JPEG image at 96 CSS pixels per inch. */
export function imagePdf(jpeg: string, width: number, height: number): Blob {
  const bytes = Uint8Array.from(atob(jpeg.split(",")[1]), c => c.charCodeAt(0));
  const encode = (s: string) => new TextEncoder().encode(s);
  const parts: Uint8Array[] = [encode("%PDF-1.4\n")], offsets = [0];
  let length = parts[0].length;
  const add = (s: string | Uint8Array) => { const b = typeof s === "string" ? encode(s) : s; parts.push(b); length += b.length; };
  const object = (id: number, body: string, stream?: Uint8Array) => { offsets[id] = length; add(`${id} 0 obj\n${body}`); if (stream) { add("\nstream\n"); add(stream); add("\nendstream"); } add("\nendobj\n"); };
  const w = width * .75, h = height * .75;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  object(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`, bytes);
  const stream = encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
  object(5, `<< /Length ${stream.length} >>`, stream);
  const xref = length;
  add(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
