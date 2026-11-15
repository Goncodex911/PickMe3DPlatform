import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { ANIMATION_TAP_MESSAGE } from "./animationItem";
import {
  ANIMATION_TAP_BRIDGE,
  multiScreenCode,
  screenCode,
  imagePdf, 
  safeName, 
  createHtmlFolderZip, 
  createReactFolderZip, 
  createAngularFolderZip, 
  createAllFrameworksZip 
} from "./screenExport";

describe("screen export", () => {
  it.each(["html", "react", "angular"] as const)("copies self-contained %s code with CSS and chosen dimensions", format => {
    const code = screenCode(format, '<main><button>Save @ {{name}} ` ${value}</button></main>', 800, 600);
    expect(code).toContain("width:800px;height:600px");
    expect(code).toContain("<button>");
    expect(code).not.toContain("styles.css");
    expect(code).not.toContain("package.json");
    if (format === "html") expect(code).toContain("<style>");
    if (format === "react") {
      expect(code).toContain("export default function App()");
      expect(code).toContain("<style>");
    }
    if (format === "angular") {
      expect(code).toContain("styles: [");
      expect(code).toContain("&#64; &#123;&#123;name&#125;&#125;");
    }
  });

  it("creates a PDF with correct byte offsets and custom page size", async () => {
    const text = await imagePdf("data:image/jpeg;base64,/9j/2Q==", 800, 600).text();
    expect(text).toContain("/MediaBox [0 0 600 450]");
    const xref = Number(text.match(/startxref\n(\d+)/)?.[1]);
    const blob = imagePdf("data:image/jpeg;base64,/9j/2Q==", 800, 600);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(xref, xref + 4))).toBe("xref");
  });

  it("prevents directory traversal in exported folder names", () => {
    expect(safeName("../../test/home")).toBe("test-home");
    expect(safeName("💡")).toBe("screen");
  });

  it("creates HTML project folder zip with proper file structure", async () => {
    const blob = await createHtmlFolderZip("HomeScreen", "<div>Hello World</div>", 390, 844);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("HomeScreen-html/index.html")).not.toBeNull();
    expect(zip.file("HomeScreen-html/style.css")).not.toBeNull();
    expect(zip.file("HomeScreen-html/README.md")).not.toBeNull();

    const htmlContent = await zip.file("HomeScreen-html/index.html")?.async("string");
    expect(htmlContent).toContain("Hello World");
    expect(htmlContent).toContain("style.css");
  });

  it("creates React project folder zip with Vite config and package.json", async () => {
    const blob = await createReactFolderZip("Dashboard", "<div>Stats</div>", 1440, 900);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("Dashboard-react/package.json")).not.toBeNull();
    expect(zip.file("Dashboard-react/vite.config.js")).not.toBeNull();
    expect(zip.file("Dashboard-react/src/App.jsx")).not.toBeNull();

    const appJsx = await zip.file("Dashboard-react/src/App.jsx")?.async("string");
    expect(appJsx).toContain("export default function App");
    expect(appJsx).toContain("Stats");
  });

  it("creates Angular project folder zip with standalone component files", async () => {
    const blob = await createAngularFolderZip("ProfileScreen", "<div>Profile @ me</div>", 400, 700);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("ProfileScreen-angular/src/app/screen/screen.component.ts")).not.toBeNull();
    expect(zip.file("ProfileScreen-angular/src/app/screen/screen.component.html")).not.toBeNull();

    const html = await zip.file("ProfileScreen-angular/src/app/screen/screen.component.html")?.async("string");
    expect(html).toContain("&#64; me");
  });

  it("creates Full Bundle zip containing HTML, React and Angular", async () => {
    const blob = await createAllFrameworksZip("MobileApp", "<div>App content</div>", 375, 812);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("MobileApp-full-bundle/html/index.html")).not.toBeNull();
    expect(zip.file("MobileApp-full-bundle/react/App.jsx")).not.toBeNull();
    expect(zip.file("MobileApp-full-bundle/angular/screen.component.html")).not.toBeNull();
  });

  it("exports multi-screen interactive prototype with action transitions and navigation", async () => {
    const payload = {
      projectName: "ShoppingApp",
      screens: [
        {
          id: "screen-home",
          name: "Home",
          markup: '<button data-action-to="screen-cart" data-action-transition="slide">Go to Cart</button>',
          width: 390,
          height: 844,
          swipe: { left: "screen-cart" },
        },
        {
          id: "screen-cart",
          name: "Cart",
          markup: '<button data-action-to="back">Back</button>',
          width: 390,
          height: 844,
          swipe: { right: "screen-home" },
        },
      ],
      initialScreenId: "screen-home",
    };

    const blob = await createHtmlFolderZip(payload);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("ShoppingApp-html/index.html")).not.toBeNull();
    expect(zip.file("ShoppingApp-html/prototype.js")).not.toBeNull();
    expect(zip.file("ShoppingApp-html/style.css")).not.toBeNull();
    expect(zip.file("ShoppingApp-html/screens/01-Home.html")).not.toBeNull();
    expect(zip.file("ShoppingApp-html/screens/02-Cart.html")).not.toBeNull();

    const indexHtml = await zip.file("ShoppingApp-html/index.html")?.async("string");
    expect(indexHtml).toContain("screen-home");
    expect(indexHtml).toContain("screen-cart");
    expect(indexHtml).toContain("data-action-to=\"screen-cart\"");
    expect(indexHtml).toContain("data-swipe-left=\"screen-cart\"");

    const script = await zip.file("ShoppingApp-html/prototype.js")?.async("string");
    expect(script).toContain("data-action-to");
    expect(script).toContain("setScreen");
  });
});

describe("animation taps in exported prototypes", () => {
  type Listener = (e: { data: unknown; source: unknown }) => void;
  const runBridge = () => {
    let listener: Listener | null = null;
    const frameWindow = {};
    const box = { click: vi.fn() };
    const frame = {
      contentWindow: frameWindow,
      getAttribute: (name: string) => (name === "data-tap-delay" ? "600" : null),
      closest: (sel: string) => (sel === "[data-action-to]" ? box : null),
    };
    const win: Record<string, unknown> = {
      addEventListener: (type: string, fn: Listener) => {
        if (type === "message") listener = fn;
      },
    };
    const doc = { getElementsByTagName: (tag: string) => (tag === "iframe" ? [frame] : []) };
    new Function("window", "document", ANIMATION_TAP_BRIDGE)(win, doc);
    return { send: (data: unknown, source: unknown = frameWindow) => listener?.({ data, source }), box, win };
  };

  it("listens for the message the animation frame posts", () => {
    expect(ANIMATION_TAP_BRIDGE).toContain(`"${ANIMATION_TAP_MESSAGE}"`);
  });

  it("clicks the part's action box once the author's wait is over, and ignores taps meanwhile", () => {
    vi.useFakeTimers();
    try {
      const { send, box } = runBridge();
      send({ type: ANIMATION_TAP_MESSAGE });
      send({ type: ANIMATION_TAP_MESSAGE });
      vi.advanceTimersByTime(599);
      expect(box.click).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(box.click).toHaveBeenCalledTimes(1);
      send({ type: ANIMATION_TAP_MESSAGE });
      vi.advanceTimersByTime(600);
      expect(box.click).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores other messages and frames that are not on the page", () => {
    vi.useFakeTimers();
    try {
      const { send, box } = runBridge();
      send({ type: "something-else" });
      send("pm:animation-tap");
      send({ type: ANIMATION_TAP_MESSAGE }, {});
      vi.advanceTimersByTime(5000);
      expect(box.click).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("installs itself only once per page", () => {
    const { win } = runBridge();
    expect(win.__pmAnimationTapBridge).toBe(true);
  });

  const payload = {
    projectName: "Anim",
    screens: [{ id: "a", name: "A", markup: '<div data-action-to="b"><iframe srcdoc="x"></iframe></div>', width: 390, height: 844 }],
    initialScreenId: "a",
  };

  it.each(["html", "react"] as const)("ships the bridge in the %s prototype", (format) => {
    expect(multiScreenCode(format, payload)).toContain(ANIMATION_TAP_MESSAGE);
  });

  it("ships the bridge in the HTML and React project folders, and lets the frame take taps", async () => {
    const html = await JSZip.loadAsync(await createHtmlFolderZip(payload));
    expect(await html.file("Anim-html/prototype.js")?.async("string")).toContain(ANIMATION_TAP_MESSAGE);
    expect(await html.file("Anim-html/style.css")?.async("string")).toMatch(/\[data-action-to\] iframe \{\s*pointer-events: auto !important;/);

    const react = await JSZip.loadAsync(await createReactFolderZip(payload));
    const sources = await Promise.all(Object.values(react.files).filter((f) => !f.dir && f.name.endsWith(".jsx")).map((f) => f.async("string")));
    expect(sources.some((s) => s.includes(ANIMATION_TAP_MESSAGE))).toBe(true);
  });
});
