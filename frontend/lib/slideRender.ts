// Tiện ích hiển thị slide PPTist ngoài studio: lọc HTML chữ, nền, gradient.

const ALLOWED_TAGS = new Set(["P", "SPAN", "STRONG", "B", "EM", "I", "U", "S", "DEL", "SUP", "SUB", "BR", "UL", "OL", "LI", "A", "CODE", "BLOCKQUOTE", "MARK"]);
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "TEMPLATE", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "IMG", "VIDEO", "AUDIO", "SOURCE"]);

export function safeStyle(style: string) {
  return /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(style) ? "" : style;
}

// Chữ trong slide là HTML do người dùng soạn và hiện trên trang công khai, nên chỉ giữ thẻ định dạng và thuộc tính style an toàn
export function sanitizeRichText(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (DROP_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }
      walk(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (name === "style") child.setAttribute("style", safeStyle(attr.value));
        else if (name === "href" && child.tagName === "A" && /^https?:\/\//i.test(attr.value)) continue;
        else child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
    }
  };
  walk(root);
  return root.innerHTML;
}

type Gradient = { type: string; colors: { pos: number; color: string }[]; rotate: number };

export function gradientCss(gradient?: Gradient) {
  if (!gradient || !Array.isArray(gradient.colors) || !gradient.colors.length) return "";
  const stops = gradient.colors.map((c) => `${c.color} ${c.pos}%`).join(", ");
  return gradient.type === "radial" ? `radial-gradient(${stops})` : `linear-gradient(${gradient.rotate || 0}deg, ${stops})`;
}

export function backgroundCss(background: { type?: string; color?: string; image?: { src: string; size?: string }; gradient?: Gradient } | undefined, fallback: string) {
  if (!background) return { background: fallback };
  if (background.type === "image" && background.image?.src && /^(https?:|data:image\/)/.test(background.image.src)) {
    const size = background.image.size === "repeat" ? "auto" : background.image.size || "cover";
    return {
      backgroundColor: background.color || fallback,
      backgroundImage: `url("${background.image.src.replace(/"/g, "%22")}")`,
      backgroundSize: size,
      backgroundRepeat: background.image.size === "repeat" ? "repeat" : "no-repeat",
      backgroundPosition: "center",
    };
  }
  if (background.type === "gradient") return { background: gradientCss(background.gradient) || fallback };
  return { background: background.color || fallback };
}

export function safeSrc(src: unknown) {
  return typeof src === "string" && /^(https?:|data:image\/|blob:|\/)/.test(src) ? src : "";
}
