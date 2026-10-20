// UI Marketplace data types
// Real data loaded at runtime from /ux-full-catalog.json (scraped from lucianlabs.dev/uxui-prompt)

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
  // Live preview code (from preview JSON files)
  html: string;
  js: string;
  demo: unknown[];
  map: string[][];
}

export const CATEGORIES = [
  { id: "all", label: "Tất cả", labelEn: "All", icon: "apps" },
  { id: "버튼", label: "Nút bấm", labelEn: "Buttons", icon: "touch_app" },
  { id: "토글·선택", label: "Bật tắt · Chọn", labelEn: "Toggle & Select", icon: "toggle_on" },
  { id: "입력·검색", label: "Nhập liệu · Tìm kiếm", labelEn: "Input & Search", icon: "edit" },
  { id: "메뉴·탭", label: "Menu · Tab", labelEn: "Menu & Tabs", icon: "menu" },
  { id: "카드·콘텐츠", label: "Thẻ · Nội dung", labelEn: "Cards & Content", icon: "dashboard" },
  { id: "로그인·가입", label: "Đăng nhập · Đăng ký", labelEn: "Login & Signup", icon: "lock" },
  { id: "알림·피드백", label: "Thông báo · Phản hồi", labelEn: "Alerts & Feedback", icon: "notifications" },
  { id: "로딩·진행", label: "Tải · Tiến trình", labelEn: "Loading & Progress", icon: "hourglass_empty" },
  { id: "빈·오류 상태", label: "Trống · Lỗi", labelEn: "Empty & Error", icon: "error_outline" },
  { id: "위젯·차트", label: "Widget · Biểu đồ", labelEn: "Widgets & Charts", icon: "bar_chart" },
  { id: "공간·일정·디자인 도구", label: "Không gian · Thiết kế", labelEn: "Workspace & Design", icon: "palette" },
  { id: "문서·데이터 편집", label: "Tài liệu · Dữ liệu", labelEn: "Docs & Data", icon: "description" },
  { id: "분석·데이터", label: "Phân tích · Dữ liệu", labelEn: "Analytics & Data", icon: "insights" },
  { id: "작업·시스템", label: "Nghiệp vụ · Hệ thống", labelEn: "Ops & System", icon: "settings" },
];

/** Build full standalone HTML for an iframe with ux-tokens + component CSS/HTML/JS */
export function buildPreviewHTML(template: UITemplate, tokensCSS: string, theme: "light" | "dark" = "dark"): string {
  if (!template.html) return "";
  return `<!DOCTYPE html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${tokensCSS}
html,body{margin:0;padding:0;min-height:100%;display:grid;place-items:center;
  background:var(--ux-page);color:var(--ux-ink);font-family:system-ui,-apple-system,sans-serif;
  overflow:hidden}
</style>
</head>
<body>
${template.html}
<script>${template.js}<\/script>
</body>
</html>`;
}

/** Build full downloadable HTML file with embedded tokens */
export function buildDownloadHTML(template: UITemplate, tokensCSS: string): string {
  if (!template.html) return "";
  return `<!DOCTYPE html>
<html data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${template.titleEn} — Lucian UX/UI #${template.id}</title>
<style>
${tokensCSS}
html,body{margin:0;padding:0;min-height:100vh;display:grid;place-items:center;
  background:var(--ux-page);color:var(--ux-ink);
  font-family:system-ui,-apple-system,sans-serif}
</style>
</head>
<body>
${template.html}
<script>${template.js}<\/script>
</body>
</html>`;
}
