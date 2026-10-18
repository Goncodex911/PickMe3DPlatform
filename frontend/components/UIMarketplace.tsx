"use client";

import { useState, useMemo, useCallback, useRef, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { UITemplate, CATEGORIES, buildPreviewHTML } from "@/lib/ui-marketplace-data";

/* ───────────────────────────────────────────────── */
/*  Tokens CSS Context                              */
/* ───────────────────────────────────────────────── */
const TokensCtx = createContext<string>("");

/* ───────────────────────────────────────────────── */
/*  Lightweight CSS-only preview for grid cards     */
/*  (no iframe — pure CSS/HTML placeholder)         */
/* ───────────────────────────────────────────────── */
function GridPreview({ template }: { template: UITemplate }) {
  const c1 = template.hue;
  const c2 = template.hue2;
  const cat = template.category;

  if (cat === "버튼") {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}0c, ${c2}0c)` }}>
        <div className="relative">
          <div className="px-8 py-3.5 rounded-full text-[11px] font-bold text-white/90 tracking-wide"
            style={{ background: `linear-gradient(135deg, ${c1}cc, ${c2}cc)`, boxShadow: `0 12px 32px ${c1}33, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
            {template.titleEn.split(" ").slice(0, 3).join(" ")}
          </div>
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `${c1}11`, filter: "blur(12px)" }} />
        </div>
      </div>
    );
  }
  if (cat === "토글·선택") {
    return (
      <div className="w-full h-full flex items-center justify-center gap-4" style={{ background: `linear-gradient(135deg, ${c1}08, ${c2}08)` }}>
        <div className="w-12 h-7 rounded-full relative" style={{ background: `${c1}33` }}>
          <div className="absolute right-1 top-1 w-5 h-5 rounded-full shadow-md" style={{ background: c1 }} />
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-20 rounded-full" style={{ background: `${c1}33` }} />
          <div className="h-1.5 w-14 rounded-full" style={{ background: `${c2}22` }} />
        </div>
      </div>
    );
  }
  if (cat === "입력·검색") {
    return (
      <div className="w-full h-full flex items-center justify-center px-5" style={{ background: `linear-gradient(135deg, ${c1}08, ${c2}08)` }}>
        <div className="w-full max-w-[200px]">
          <div className="h-10 rounded-xl border-2 flex items-center px-3 gap-2" style={{ borderColor: `${c1}55`, background: `${c1}08` }}>
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: `${c1}66` }} />
            <div className="h-2 rounded-full flex-1" style={{ background: `${c2}22` }} />
            <div className="w-5 h-5 rounded-md" style={{ background: `${c1}33` }} />
          </div>
          <div className="mt-2 h-1.5 w-3/4 rounded-full ml-3" style={{ background: `${c2}18` }} />
        </div>
      </div>
    );
  }
  if (cat === "메뉴·탭") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4" style={{ background: `linear-gradient(135deg, ${c1}08, ${c2}08)` }}>
        <div className="flex gap-1 p-1 rounded-xl w-full max-w-[180px]" style={{ background: `${c1}11` }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-7 rounded-lg flex items-center justify-center"
              style={{ background: i === 0 ? `${c1}cc` : "transparent" }}>
              <div className="w-6 h-1.5 rounded-full" style={{ background: i === 0 ? "#fff" : `${c2}33` }} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5 w-full max-w-[180px]">
          {[0, 1].map(i => <div key={i} className="h-2 rounded-full" style={{ background: `${c1}${i === 0 ? "22" : "11"}`, width: i === 0 ? "85%" : "60%" }} />)}
        </div>
      </div>
    );
  }
  if (cat === "카드·콘텐츠") {
    return (
      <div className="w-full h-full flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${c1}06, ${c2}06)` }}>
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: `${c1}0d`, border: `1px solid ${c1}22` }}>
          <div className="h-14 w-full" style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}33)` }} />
          <div className="p-3 space-y-2">
            <div className="h-2.5 w-3/4 rounded-full" style={{ background: `${c1}33` }} />
            <div className="h-2 w-1/2 rounded-full" style={{ background: `${c2}22` }} />
          </div>
        </div>
      </div>
    );
  }
  if (cat === "로그인·가입") {
    return (
      <div className="w-full h-full flex items-center justify-center px-5" style={{ background: `linear-gradient(135deg, ${c1}08, ${c2}08)` }}>
        <div className="w-full max-w-[180px] space-y-2.5">
          <div className="w-9 h-9 rounded-full mx-auto" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
          <div className="h-8 rounded-lg border" style={{ borderColor: `${c1}33`, background: `${c1}08` }} />
          <div className="h-8 rounded-lg border" style={{ borderColor: `${c1}22`, background: `${c1}06` }} />
          <div className="h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${c1}cc, ${c2}cc)` }} />
        </div>
      </div>
    );
  }
  if (cat === "위젯·차트" || cat === "분석·데이터") {
    return (
      <div className="w-full h-full flex items-end justify-center gap-1.5 px-5 pb-5" style={{ background: `linear-gradient(135deg, ${c1}06, ${c2}06)` }}>
        {[40, 65, 50, 80, 60, 45, 72, 55].map((h, i) => (
          <div key={i} className="w-3.5 rounded-t-md transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, ${c1}${60 + i * 5 > 99 ? "99" : String(60 + i * 5)}, ${c2}${40 + i * 5 > 99 ? "99" : String(40 + i * 5)})` }} />
        ))}
      </div>
    );
  }
  if (cat === "로딩·진행") {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}06, ${c2}06)` }}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: i === 1 ? c2 : c1, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: `${c1}22` }}>
            <div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
          </div>
        </div>
      </div>
    );
  }
  if (cat === "알림·피드백") {
    return (
      <div className="w-full h-full flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${c1}06, ${c2}06)` }}>
        <div className="w-full rounded-xl p-3 flex items-center gap-2.5" style={{ background: `${c1}15`, border: `1px solid ${c1}33` }}>
          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: c1 }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full" style={{ background: `${c1}44` }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: `${c2}22` }} />
          </div>
        </div>
      </div>
    );
  }
  // Default: abstract shape
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}08, ${c2}08)` }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}22, ${c2}22)`, border: `1px solid ${c1}33` }}>
        <span className="material-symbols-rounded text-xl" style={{ color: c1 }}>widgets</span>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────── */
/*  Live iframe — only used in Detail Dialog        */
/* ───────────────────────────────────────────────── */
function LiveIframe({ template, className, interactive = false }: { template: UITemplate; className?: string; interactive?: boolean }) {
  const tokensCSS = useContext(TokensCtx);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => {
    if (!template.html || !tokensCSS) return "";
    return buildPreviewHTML(template, tokensCSS, "dark");
  }, [template, tokensCSS]);

  if (!srcDoc) {
    return (
      <div className={`flex items-center justify-center ${className || ""}`} style={{ background: `linear-gradient(135deg, ${template.hue}15, ${template.hue2}15)` }}>
        <GridPreview template={template} />
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className={className}
      sandbox="allow-scripts"
      style={{ border: "none", pointerEvents: interactive ? "auto" : "none" }}
      title={template.titleEn}
    />
  );
}

/* ───────────────────────────────────────────────── */
/*  Detail Dialog                                   */
/* ───────────────────────────────────────────────── */
function DetailDialog({ template, onClose }: { template: UITemplate; onClose: () => void }) {
  const tokensCSS = useContext(TokensCtx);
  const [tab, setTab] = useState<"demo" | "prompt" | "code">("demo");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const fullCode = useMemo(() => {
    if (!template.html) return "// No code available for this template";
    return `<!-- ${template.titleEn} (#${template.id}) -->\n<!-- Category: ${template.category} | Tags: ${template.tags.join(", ")} -->\n\n${template.html}\n\n<script>\n${template.js}\n<\/script>`;
  }, [template]);

  const promptText = useMemo(() => {
    return `[UI Component: ${template.titleEn}]
ID: #${template.id} | Category: ${template.category}
Tags: ${template.tags.join(", ")}

📋 Description:
${template.summaryEn}

💡 Interaction hint:
${template.hintEn || template.hint}

---
Full reference implementation (HTML + CSS + JS):

${fullCode}

---
Instructions: Please implement this UI component in my project. 
Adapt the code above to my tech stack and design system while preserving all animations and interactions.`;
  }, [template, fullCode]);

  const handleCopy = useCallback(async () => {
    const text = tab === "prompt" ? promptText : fullCode;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tab, promptText, fullCode]);

  const handleDownload = useCallback(() => {
    if (!tokensCSS) return;
    const html = buildPreviewHTML(template, tokensCSS, "dark");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.slug || template.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [template, tokensCSS]);

  const catLabel = CATEGORIES.find((c) => c.id === template.category)?.label || template.category;

  return (
    <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(180deg, #12162a 0%, #0b0e1a 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
        initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 40 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Header */}
        <div className="p-5 pb-3 flex items-start justify-between gap-4 border-b border-white/10">
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-2">
              <span className="font-mono font-bold" style={{ color: template.hue }}>#{template.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span>{catLabel}</span>
              {template.html && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold">LIVE</span>}
            </p>
            <h2 className="text-lg font-semibold text-white">{template.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{template.titleEn}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors flex-shrink-0">
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-5 mt-3 flex items-center gap-1 p-1 rounded-xl bg-white/5">
          {([
            { key: "demo" as const, icon: "play_circle", label: "Demo trực tiếp" },
            { key: "prompt" as const, icon: "auto_awesome", label: "Prompt AI" },
            { key: "code" as const, icon: "code", label: "Code gốc" },
          ]).map((t) => (
            <button key={t.key}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${tab === t.key ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
              onClick={() => setTab(t.key)}>
              <span className="material-symbols-rounded text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto mx-5 mt-3 mb-2 min-h-0">
          {tab === "demo" ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden bg-[#07080D]" style={{ border: `1px solid ${template.hue}33` }}>
                <LiveIframe template={template} className={`w-full ${template.shape === "tall" ? "h-[420px]" : "h-[300px]"}`} interactive={true} />
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8 space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">{template.summary}</p>
                <p className="text-xs text-slate-500 leading-relaxed italic">{template.summaryEn}</p>
                {template.hint && (
                  <div className="flex items-start gap-2 pt-2 border-t border-white/8">
                    <span className="material-symbols-rounded text-sm text-amber-400 mt-0.5">lightbulb</span>
                    <div>
                      <p className="text-xs text-amber-300/80">{template.hint}</p>
                      {template.hintEn && <p className="text-[11px] text-amber-300/50 mt-1 italic">{template.hintEn}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl text-[12px] text-slate-300 leading-relaxed font-mono whitespace-pre-wrap overflow-auto max-h-[420px]" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {tab === "prompt" ? promptText : fullCode}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mx-5 flex flex-wrap gap-1.5 mb-2">
          {template.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${template.hue}15`, color: template.hue, border: `1px solid ${template.hue}25` }}>{tag}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-500">
            Nguồn: <a href="https://lucianlabs.dev/uxui-prompt/" target="_blank" rel="noopener" className="underline hover:text-slate-300">lucianlabs.dev</a>
          </p>
          <div className="flex items-center gap-2">
            {template.html && (
              <button onClick={handleDownload} className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all">
                <span className="material-symbols-rounded text-sm">download</span>Tải HTML
              </button>
            )}
            {tab !== "demo" && (
              <button onClick={handleCopy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                style={{ background: copied ? "#22C3A6" : `linear-gradient(135deg, ${template.hue}, ${template.hue2})`, boxShadow: `0 6px 20px ${template.hue}44` }}>
                <span className="material-symbols-rounded text-sm">{copied ? "check" : "content_copy"}</span>
                {copied ? "Đã copy!" : tab === "prompt" ? "Copy Prompt" : "Copy Code"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────── */
/*  Grid Card Component                             */
/* ───────────────────────────────────────────────── */
function TemplateCard({ template, idx, onClick }: { template: UITemplate; idx: number; onClick: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.article ref={cardRef} layout
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.25, delay: idx < 24 ? idx * 0.018 : 0 }}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
      style={{ background: `linear-gradient(160deg, ${template.hue}0a, ${template.hue2}06)`, border: "1px solid rgba(255,255,255,0.07)" }}
      onClick={onClick}>
      {/* Preview */}
      <div className={`relative overflow-hidden ${template.shape === "tall" ? "h-44" : "h-36"}`}>
        {isVisible && <GridPreview template={template} />}
        {/* Live badge */}
        {template.html && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
            LIVE
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <span className="material-symbols-rounded text-base">play_circle</span>
            </span>
            <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <span className="material-symbols-rounded text-base">content_copy</span>
            </span>
          </div>
        </div>
      </div>
      {/* Caption */}
      <div className="p-3 sm:p-4">
        <p className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${template.hue}20`, color: template.hue }}>{template.id}</span>
          <span className="text-[10px] text-slate-500 truncate">{template.titleEn}</span>
        </p>
        <h3 className="text-xs sm:text-sm font-medium text-white group-hover:text-red-300 transition-colors leading-snug truncate">{template.title}</h3>
      </div>
    </motion.article>
  );
}

/* ───────────────────────────────────────────────── */
/*  Main Marketplace Page                           */
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
    if (activeCategory !== "all") result = result.filter((t) => t.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) || t.titleEn.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q)) ||
        t.summary.toLowerCase().includes(q) || t.summaryEn.toLowerCase().includes(q)
      );
    }
    return result;
  }, [catalog, activeCategory, searchQuery]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const loadMore = useCallback(() => setVisibleCount((prev) => Math.min(prev + 24, filtered.length)), [filtered.length]);
  useEffect(() => { setVisibleCount(24); }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalog.length };
    catalog.forEach((t) => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return counts;
  }, [catalog]);

  return (
    <TokensCtx.Provider value={tokensCSS}>
    <div className="min-h-screen bg-[#070a12] text-white">
      {/* ─── STICKY HEADER ────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10" style={{ background: "rgba(7,10,18,0.85)", backdropFilter: "blur(20px) saturate(1.5)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-110 transition-transform">
              <span className="material-symbols-rounded text-base text-white">palette</span>
            </div>
            <div>
              <span className="text-sm font-bold text-white block leading-tight">Chợ Giao Diện</span>
              <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase">UI Marketplace · {catalog.length} Templates</span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">search</span>
              <input type="search" placeholder="Tìm: button, chart, login, toggle..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white border border-white/10 transition-all">
              <span className="material-symbols-rounded text-lg">{viewMode === "grid" ? "view_list" : "grid_view"}</span>
            </button>
            <Link href="/" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm">arrow_back</span><span className="hidden sm:inline">Trang chủ</span>
            </Link>
          </div>
        </div>
        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative w-full">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">search</span>
            <input type="search" placeholder="Tìm kiếm giao diện..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-all" />
          </div>
        </div>
      </header>

      {/* ─── HERO ─────────────────────────────── */}
      <section className="relative overflow-hidden py-14 sm:py-20 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fuchsia-600/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              {catalog.length} mẫu UI tương tác · Dữ liệu từ Lucian UX/UI
            </span>
          </motion.div>
          <motion.h1 className="text-4xl sm:text-6xl lg:text-7xl font-normal text-white mb-4 leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Chợ Giao Diện{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">Động</span>
          </motion.h1>
          <motion.p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            Tương tác trực tiếp với <span className="text-white font-medium">{catalog.length} mẫu UI/UX animation</span> thật —
            nút bấm glass, biểu đồ tương tác, form, login, chart, và hơn thế. Xem demo live, lấy prompt AI, hoặc copy code gốc.
          </motion.p>
          <motion.div className="flex items-center justify-center gap-5 text-xs text-slate-500 flex-wrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-sm text-violet-400">touch_app</span>Demo animation thật</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-sm text-fuchsia-400">code</span>HTML/CSS/JS gốc</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-sm text-amber-400">auto_awesome</span>Prompt AI sẵn dùng</span>
          </motion.div>
        </div>
      </section>

      {/* ─── CATEGORY BAR ─────────────────────── */}
      <div className="sticky top-[57px] sm:top-[65px] z-40 border-b border-white/8" style={{ background: "rgba(7,10,18,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${isActive ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
                  <span className="material-symbols-rounded text-sm">{cat.icon}</span>
                  {cat.label}
                  {count > 0 && <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? "bg-violet-500/20" : "bg-white/5"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── RESULTS INFO ─────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {loading ? "Đang tải dữ liệu..." : (
            <>Hiển thị <span className="text-white font-medium">{Math.min(visibleCount, filtered.length)}</span> / {filtered.length} mẫu
            {searchQuery && <> cho &ldquo;<span className="text-violet-400">{searchQuery}</span>&rdquo;</>}</>
          )}
        </p>
        {!loading && filtered.length === 0 && (
          <button onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} className="text-xs text-violet-400 hover:text-violet-300">Xóa bộ lọc</button>
        )}
      </div>

      {/* ─── GRID / LIST ──────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-violet-500 border-r-white/30 mx-auto mb-4" />
            <p className="text-sm text-slate-400">Đang tải {catalog.length || ""} giao diện...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-rounded text-5xl text-slate-700 mb-3 block">search_off</span>
            <p className="text-base text-slate-400 mb-2">Không tìm thấy giao diện phù hợp</p>
            <p className="text-xs text-slate-500">Thử từ khóa khác hoặc chọn danh mục khác.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {visible.map((template, idx) => (
                <TemplateCard key={template.id} template={template} idx={idx} onClick={() => setSelectedTemplate(template)} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {visible.map((template, idx) => (
                <motion.article key={template.id} layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: idx < 24 ? idx * 0.012 : 0 }}
                  className="group cursor-pointer flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                  onClick={() => setSelectedTemplate(template)}>
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${template.hue}33` }}>
                    <GridPreview template={template} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${template.hue}20`, color: template.hue }}>{template.id}</span>
                      <span className="text-[10px] text-slate-500">{CATEGORIES.find((c) => c.id === template.category)?.label}</span>
                      {template.html && <span className="px-1 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-bold">LIVE</span>}
                    </div>
                    <h3 className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">{template.title}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{template.titleEn}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-400 border border-white/8">{tag}</span>
                    ))}
                  </div>
                  <span className="material-symbols-rounded text-lg text-slate-500 group-hover:text-white transition-colors flex-shrink-0">arrow_forward</span>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Load More */}
        {visibleCount < filtered.length && (
          <div className="mt-10 text-center">
            <button onClick={loadMore} className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2 mx-auto">
              <span className="material-symbols-rounded text-lg">expand_more</span>
              Xem thêm ({filtered.length - visibleCount} mẫu còn lại)
            </button>
          </div>
        )}
      </main>

      {/* ─── FOOTER ───────────────────────────── */}
      <footer className="border-t border-white/8 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Dữ liệu gốc từ{" "}
            <a href="https://lucianlabs.dev/uxui-prompt/" target="_blank" rel="noopener" className="text-slate-400 hover:text-white underline underline-offset-2">
              Lucian UX/UI Prompt ({catalog.length} templates)
            </a> · PickMe 3D Platform
          </p>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>Quay về trang chủ
          </Link>
        </div>
      </footer>

      {/* ─── DETAIL DIALOG ────────────────────── */}
      <AnimatePresence>
        {selectedTemplate && <DetailDialog template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
    </TokensCtx.Provider>
  );
}
