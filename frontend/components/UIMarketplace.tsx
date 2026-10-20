"use client";

import { useState, useMemo, useCallback, useRef, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { UITemplate, CATEGORIES, buildPreviewHTML, buildDownloadHTML } from "@/lib/ui-marketplace-data";
import NotificationBell from "@/components/NotificationBell";
import styles from "@/app/ui-marketplace/marketplace.module.css";
import { purchaseTemplate, getPurchasedTemplateIds, subscribePurchasedTemplates } from "@/lib/purchased-animations";

/* ───────────────────────────────────────────────── */
/*  Tokens CSS Context                              */
/* ───────────────────────────────────────────────── */
const TokensCtx = createContext<string>("");

/* ───────────────────────────────────────────────── */
/*  Live iframe Component                           */
/* ───────────────────────────────────────────────── */
function LiveIframe({
  template,
  className,
  interactive = false,
  autoPlayDemo = true,
}: {
  template: UITemplate;
  className?: string;
  interactive?: boolean;
  autoPlayDemo?: boolean;
}) {
  const tokensCSS = useContext(TokensCtx);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => {
    if (!template.html || !tokensCSS) return "";
    return buildPreviewHTML(template, tokensCSS, "dark", autoPlayDemo, interactive);
  }, [template, tokensCSS, autoPlayDemo, interactive]);

  if (!srcDoc) {
    return (
      <div
        className={`flex items-center justify-center ${className || ""}`}
        style={{ background: "#111" }}
      >
        <span className="text-xs text-[#666] font-mono">#{template.id}</span>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className={className}
      sandbox="allow-scripts"
      loading="lazy"
      tabIndex={-1}
      style={{
        border: "none",
        pointerEvents: interactive ? "auto" : "none",
        width: "100%",
        height: "100%",
      }}
      title={template.titleEn || template.title}
    />
  );
}

/* ───────────────────────────────────────────────── */
/*  Detail Dialog Modal (PickMe3D Design System)     */
/* ───────────────────────────────────────────────── */
function DetailDialog({
  template,
  onClose,
  isPurchased,
  onBuy,
}: {
  template: UITemplate;
  onClose: () => void;
  isPurchased: boolean;
  onBuy: (template: UITemplate) => void;
}) {
  const tokensCSS = useContext(TokensCtx);
  const [tab, setTab] = useState<"demo" | "prompt" | "code">("demo");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = origOverflow;
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const catLabel = useMemo(() => {
    return CATEGORIES.find((c) => c.id === template.category)?.label || template.category;
  }, [template.category]);

  const fullCode = useMemo(() => {
    if (!template.html) return "// No code available for this template";
    return `<!-- ${template.titleEn} (#${template.id}) -->\n<!-- Category: ${catLabel} | Tags: ${template.tags.join(", ")} -->\n\n${template.html}\n\n<script>\n${template.js}\n<\/script>`;
  }, [template, catLabel]);

  const promptText = useMemo(() => {
    return `[UI Component: ${template.titleEn}]
ID: #${template.id} | Category: ${catLabel}
Tags: ${template.tags.join(", ")}

📋 Description:
${template.summaryEn || template.summary}

💡 Interaction Hint:
${template.hintEn || template.hint || "Interactive component with automated micro-interactions"}

---
Full reference implementation (HTML + CSS + JS):

${fullCode}

---
Instructions:
Please implement this animated UI component in my project. Adapt the code above to my tech stack and design system while preserving all micro-animations and interactive behaviors.`;
  }, [template, catLabel, fullCode]);

  const handleCopy = useCallback(async () => {
    const text = tab === "prompt" ? promptText : fullCode;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tab, promptText, fullCode]);

  const handleDownload = useCallback(() => {
    if (!tokensCSS) return;
    const html = buildDownloadHTML(template, tokensCSS);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.slug || template.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [template, tokensCSS]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 11, color: "#888" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fff", background: "#262626", padding: "2px 8px" }}>
                #{template.id}
              </span>
              <span>·</span>
              <span style={{ textTransform: "uppercase", letterSpacing: "1px" }}>{catLabel}</span>
              <span>·</span>
              <span style={{ color: "#34d399", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span className={styles.cardLiveDot} /> LIVE DEMO
              </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 6px", color: "#fff" }}>
              {template.titleEn}
            </h2>
            <p style={{ fontSize: 13, color: "#aaa", margin: 0, lineHeight: 1.6 }}>
              {template.summaryEn}
            </p>
          </div>
          <button onClick={onClose} className={styles.modalClose} aria-label="Close dialog">
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.modalTabs}>
          {([
            { key: "demo" as const, icon: "play_circle", label: "Interactive Demo" },
            { key: "prompt" as const, icon: "auto_awesome", label: "AI Prompt" },
            { key: "code" as const, icon: "code", label: "Source Code" },
          ]).map((t) => (
            <button
              key={t.key}
              className={styles.modalTab}
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {tab === "demo" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: template.shape === "tall" ? 420 : 320,
                  background: "#0c0c0c",
                  border: "1px solid #333",
                  overflow: "hidden",
                }}
              >
                <LiveIframe
                  template={template}
                  className="w-full h-full"
                  interactive={true}
                  autoPlayDemo={true}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    padding: "6px 12px",
                    background: "rgba(19,19,19,0.85)",
                    border: "1px solid #363636",
                    fontSize: 10,
                    color: "#aaa",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    pointerEvents: "none",
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>touch_app</span>
                  Interactive: test clicks, hover, and controls directly
                </div>
              </div>

              {template.hintEn && (
                <div
                  style={{
                    padding: "14px 18px",
                    background: "#1c1c1c",
                    border: "1px solid #363636",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 12,
                    color: "#ccc",
                    lineHeight: 1.6,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>
                    lightbulb
                  </span>
                  <div>
                    <strong style={{ color: "#fff" }}>Tip: </strong>
                    {template.hintEn}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 18,
                background: "#121212",
                border: "1px solid #333",
                fontSize: 12,
                fontFamily: "monospace",
                color: "#ddd",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                overflowY: "auto",
                maxHeight: 400,
              }}
            >
              {tab === "prompt" ? promptText : fullCode}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div style={{ fontSize: 11, color: "#777" }}>
            Dataset: <span style={{ color: "#aaa" }}>Hiếu Thuận</span> · PickMe3D
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPurchased ? (
              <Link
                href="/editor/"
                target="_blank"
                className={styles.modalOwnedBtn}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>check_circle</span>
                Đã sở hữu · Mở Editor ↗
              </Link>
            ) : (
              <button
                onClick={() => onBuy(template)}
                className={styles.modalBuyBtn}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>shopping_bag</span>
                Mua Animation (Miễn phí)
              </button>
            )}
            {template.html && (
              <button
                onClick={handleDownload}
                style={{
                  minHeight: 40,
                  padding: "10px 18px",
                  background: "#222",
                  border: "1px solid #444",
                  color: "#eee",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span>
                Export HTML
              </button>
            )}
            {tab !== "demo" && (
              <button
                onClick={handleCopy}
                style={{
                  minHeight: 40,
                  padding: "10px 22px",
                  background: copied ? "#22C3A6" : "#fff",
                  color: copied ? "#fff" : "#131313",
                  border: "1px solid white",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : tab === "prompt" ? "Copy AI Prompt" : "Copy Code"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────── */
/*  Grid Card Component with Live Continuous Demo    */
/* ───────────────────────────────────────────────── */
function SystemTemplateCard({
  template,
  idx,
  onClick,
  isPurchased,
  onBuy,
}: {
  template: UITemplate;
  idx: number;
  onClick: () => void;
  isPurchased: boolean;
  onBuy: (template: UITemplate) => void;
}) {
  const [isVisible, setIsVisible] = useState(idx < 12);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "500px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isVisible]);

  const catLabel = useMemo(() => {
    return CATEGORIES.find((c) => c.id === template.category)?.label || template.category;
  }, [template.category]);

  return (
    <article ref={cardRef} className={styles.card}>
      {/* Live Preview Area */}
      <div className={styles.cardStage} onClick={onClick}>
        <span className={styles.cardCategory}>{catLabel}</span>
        <span className={styles.cardLiveBadge}>
          <span className={styles.cardLiveDot} /> LIVE
        </span>

        {isVisible ? (
          <LiveIframe
            template={template}
            className="w-full h-full pointer-events-none"
            interactive={false}
            autoPlayDemo={true}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111]">
            <span className="text-xs text-[#555] font-mono">#{template.id}</span>
          </div>
        )}

        <div className={styles.cardHoverAction}>
          <span>View details</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>

      {/* Info Area */}
      <div className={styles.cardInfo}>
        <div className={styles.cardMetrics}>
          <span>#{template.id}</span>
          <span>{template.shape === "tall" ? "Tall widget" : "Component"}</span>
        </div>

        <button className={styles.cardTitle} onClick={onClick}>
          {template.titleEn}
        </button>

        <p className={styles.cardDesc}>
          {template.summaryEn}
        </p>

        <div className={styles.cardBottom}>
          <div className={styles.cardTags}>
            {template.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={styles.cardTag}>
                #{tag}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isPurchased ? (
              <button
                className={styles.cardOwnedBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open("/editor/", "_blank");
                }}
                title="Mẫu đã mua — Mở trong Canvas Editor"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span>
                <span>Đã mua ↗</span>
              </button>
            ) : (
              <button
                className={styles.cardBuyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(template);
                }}
                title="Mua mẫu animation này để đưa vào Editor"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>shopping_bag</span>
                <span>Mua</span>
              </button>
            )}
            <button className={styles.cardUseBtn} onClick={onClick}>
              <span>Inspect</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────────────────────────────── */
/*  Main Marketplace Page (PickMe3D Aligned)         */
/* ───────────────────────────────────────────────── */
export default function UIMarketplacePage() {
  const [catalog, setCatalog] = useState<UITemplate[]>([]);
  const [tokensCSS, setTokensCSS] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<UITemplate | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(24);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setPurchasedIds(getPurchasedTemplateIds());
    return subscribePurchasedTemplates(() => {
      setPurchasedIds(getPurchasedTemplateIds());
    });
  }, []);

  const handleBuy = useCallback((tmpl: UITemplate) => {
    const ok = purchaseTemplate(tmpl);
    if (ok) {
      setToastMessage(`Đã mua thành công "${tmpl.titleEn || tmpl.title}"! Mẫu đã được thêm vào mục Animation ở trang Editor.`);
      setTimeout(() => setToastMessage(null), 4500);
    }
  }, []);

  // Authenticated user state
  useEffect(() => {
    try {
      const u = localStorage.getItem("pickme3d_user");
      if (u && localStorage.getItem("pickme3d_token")) {
        setCurrentUser(JSON.parse(u));
      }
    } catch {}
  }, []);

  const editorHref = currentUser ? "/editor/" : "/login/";

  // Load catalog data + tokens CSS at runtime
  useEffect(() => {
    Promise.all([
      fetch("/ux-full-catalog.json").then((r) => r.json()),
      fetch("/ux-tokens.css").then((r) => r.text()),
    ])
      .then(([data, css]: [UITemplate[], string]) => {
        setCatalog(data);
        setTokensCSS(css);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = catalog;
    if (activeCategory !== "all") {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.titleEn.toLowerCase().includes(q) ||
          t.slug?.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.summary.toLowerCase().includes(q) ||
          t.summaryEn.toLowerCase().includes(q)
      );
    }
    return result;
  }, [catalog, activeCategory, searchQuery]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 24, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    setVisibleCount(24);
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalog.length };
    catalog.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  return (
    <TokensCtx.Provider value={tokensCSS}>
      <div className={styles.page} lang="en">
        {/* ─── SYSTEM HEADER / NAVBAR ───────────── */}
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="PickMe3D — Home">
            <svg viewBox="0 0 40 44" fill="currentColor" aria-hidden="true">
              <path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" />
            </svg>
            <span>PickMe3D</span>
          </Link>

          <nav className={styles.nav} aria-label="Main navigation">
            <Link href="/" className={styles.homeLink}>Home</Link>
            <Link href="/templates/">Template</Link>
            <Link href="/ui-marketplace/" aria-current="page" className={styles.activeNav}>
              UI Marketplace
            </Link>

            {currentUser ? (
              <>
                <div className={styles.shared}>
                  <NotificationBell />
                </div>
                <Link href="/profile/" className={styles.profile}>
                  {currentUser.name || "Profile"}
                </Link>
              </>
            ) : (
              <Link href="/login/">Sign in</Link>
            )}

            <Link href={editorHref} className={styles.primary}>
              Open Canvas <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </header>

        {/* ─── HERO SECTION ─────────────────────── */}
        <section className={styles.hero} aria-labelledby="marketplace-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>THE UI MOTION COLLECTION</p>
            <h1 id="marketplace-title">
              Interactive micro-interactions.<br />
              <em>Your canvas in motion.</em>
            </h1>
            <p>
              Explore {catalog.length || 200} live interactive UI components in continuous motion.
              Watch animations in real time, inspect interactions, copy AI prompts, or export pure HTML/CSS/JS code.
            </p>
            <div className={styles.heroMeta}>
              <span>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>play_circle</span>
                Continuous Live Demos
              </span>
              <span>·</span>
              <span>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>code</span>
                Pure HTML/CSS/JS
              </span>
              <span>·</span>
              <span>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>auto_awesome</span>
                Ready-to-use AI Prompts
              </span>
            </div>
          </div>
        </section>

        {/* ─── COLLECTION CONTAINER ─────────────── */}
        <main className={styles.collection}>
          {/* Search Row */}
          <div className={styles.searchRow}>
            <div className={styles.search}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Search components (button, chart, modal, toggle, card)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search UI components"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
                </button>
              )}
            </div>

            <div className={styles.controlsRight}>
              <button
                className={styles.viewToggle}
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                aria-label="Toggle view mode"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                  {viewMode === "grid" ? "view_list" : "grid_view"}
                </span>
              </button>
            </div>
          </div>

          {/* Categories Bar */}
          <div className={styles.categories} role="tablist" aria-label="Component categories">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  className={styles.categoryBtn}
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && <span className={styles.categoryCount}>({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Results Heading */}
          <div className={styles.resultsHeading}>
            <p>
              {loading ? (
                "Loading component catalog..."
              ) : (
                <>
                  Showing <strong>{Math.min(visibleCount, filtered.length)}</strong> of {filtered.length} components
                  {searchQuery && <> for &ldquo;<span style={{ color: "#fff" }}>{searchQuery}</span>&rdquo;</>}
                </>
              )}
            </p>
            {!loading && (filtered.length === 0 || activeCategory !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className={styles.clearBtn}
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Grid or List View */}
          {loading ? (
            <div style={{ padding: "90px 24px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  width: 28,
                  height: 28,
                  border: "2px solid #444",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 800ms linear infinite",
                  marginBottom: 16,
                }}
              />
              <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                Loading UI components...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <h2 style={{ fontSize: 32, fontWeight: 400, margin: "0 0 14px", color: "#fff" }}>
                No components found
              </h2>
              <p style={{ fontSize: 14, color: "#888", maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.7 }}>
                Try searching with different keywords or choosing another category from the list above.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className={styles.categoryBtn}
                style={{ margin: "0 auto" }}
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className={styles.cardGrid}>
              {visible.map((template, idx) => (
                <SystemTemplateCard
                  key={template.id}
                  template={template}
                  idx={idx}
                  isPurchased={purchasedIds.includes(template.id)}
                  onBuy={handleBuy}
                  onClick={() => setSelectedTemplate(template)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.listView}>
              {visible.map((template, idx) => {
                const catLabel = CATEGORIES.find((c) => c.id === template.category)?.label || template.category;
                return (
                  <div
                    key={template.id}
                    className={styles.listItem}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className={styles.listStage}>
                      <LiveIframe
                        template={template}
                        className="w-full h-full pointer-events-none"
                        interactive={false}
                        autoPlayDemo={true}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "#888", marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>#{template.id}</span>
                        <span>·</span>
                        <span style={{ textTransform: "uppercase" }}>{catLabel}</span>
                        <span>·</span>
                        <span style={{ color: "#34d399", fontWeight: 700 }}>LIVE</span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>
                        {template.titleEn}
                      </h3>
                      <p style={{ fontSize: 12, color: "#aaa", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {template.summaryEn}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {purchasedIds.includes(template.id) ? (
                        <button
                          className={styles.cardOwnedBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open("/editor/", "_blank");
                          }}
                          title="Mở trong Canvas Editor"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span>
                          <span>Đã mua ↗</span>
                        </button>
                      ) : (
                        <button
                          className={styles.cardBuyBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuy(template);
                          }}
                          title="Mua mẫu animation này để đưa vào Editor"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>shopping_bag</span>
                          <span>Mua</span>
                        </button>
                      )}
                      <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#777" }}>
                        arrow_forward
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {visibleCount < filtered.length && (
            <div className={styles.loadMoreWrap}>
              <button onClick={loadMore} className={styles.loadMoreBtn}>
                <span>Load more components ({filtered.length - visibleCount} remaining)</span>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>expand_more</span>
              </button>
            </div>
          )}
        </main>

        {/* ─── SYSTEM FOOTER ────────────────────── */}
        <footer className={styles.footer}>
          <Link href="/">PickMe3D</Link>
          <p>A space for original ideas.</p>
          <div className={styles.footerLinks}>
            <Link href="/templates/">Template library</Link>
            <Link href="/ui-marketplace/">UI Marketplace ↗</Link>
            <Link href={editorHref}>Start designing ↗</Link>
          </div>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} PickMe3D</span>
        </footer>

        {/* ─── DETAIL MODAL ─────────────────────── */}
        {selectedTemplate && (
          <DetailDialog
            template={selectedTemplate}
            isPurchased={purchasedIds.includes(selectedTemplate.id)}
            onBuy={handleBuy}
            onClose={() => setSelectedTemplate(null)}
          />
        )}

        {/* ─── PURCHASE TOAST ───────────────────── */}
        {toastMessage && (
          <div className={styles.toast}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="material-symbols-rounded" style={{ color: "#34d399", fontSize: 26 }}>
                check_circle
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Mua thành công!</div>
                <div style={{ fontSize: 12, color: "#ccc", maxWidth: 420 }}>{toastMessage}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link
                href="/editor/"
                target="_blank"
                style={{
                  background: "#34d399",
                  color: "#0c1a14",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span>Mở Editor</span>
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>arrow_outward</span>
              </Link>
              <button
                onClick={() => setToastMessage(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </TokensCtx.Provider>
  );
}
