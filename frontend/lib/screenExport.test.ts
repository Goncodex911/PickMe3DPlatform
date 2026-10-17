import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { 
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
