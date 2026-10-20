"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, KIND_ORDER, KIND_SPEC, PALETTE_HIDDEN, Category, Kind, Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { KIND_TEXT, t, useLang } from "@/lib/i18n";
import { Field, Section, Tile } from "./ui";
import { UITemplate } from "@/lib/ui-marketplace-data";
import { getPurchasedTemplates, subscribePurchasedTemplates } from "@/lib/purchased-animations";

const CATEGORY_TEXT = {
  ja: { actions: "操作", navigation: "ナビゲーション", containment: "コンテナ", inputs: "入力", content: "コンテンツ", progress: "進捗" },
  zh: { actions: "操作", navigation: "导航", containment: "容器", inputs: "输入", content: "内容", progress: "进度" },
  ko: { actions: "동작", navigation: "내비게이션", containment: "컨테이너", inputs: "입력", content: "콘텐츠", progress: "진행 상태" },
} satisfies Record<string, Record<Category, string>>;

export function PartsPalette({
  palette: p,
  favorites,
  onToggleFavorite,
  onPartPointerDown,
  onAddAnimation,
  onAnimationPointerDown,
}: {
  palette: Palette;
  favorites: Kind[];
  onToggleFavorite: (k: Kind) => void;
  onPartPointerDown: (e: React.PointerEvent, kind: Kind) => void;
  onAddAnimation?: (template: UITemplate) => void;
  onAnimationPointerDown?: (e: React.PointerEvent, template: UITemplate) => void;
}) {
  const lang = useLang();
  const [q, setQ] = useState("");
  const [purchased, setPurchased] = useState<UITemplate[]>([]);

  useEffect(() => {
    setPurchased(getPurchasedTemplates());
    return subscribePurchasedTemplates(setPurchased);
  }, []);

  const labelOf = (k: Kind) => (lang === "en" ? KIND_SPEC[k].label : (KIND_TEXT[lang][k]?.noun ?? KIND_SPEC[k].label));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    /* the shapes a part switches into in its own panel are not tiles of their own */
    const listed = KIND_ORDER.filter((k) => !PALETTE_HIDDEN.includes(k));
    if (!s) return listed;
    return listed.filter((k) => {
      const sp = KIND_SPEC[k];
      return labelOf(k).toLowerCase().includes(s) || sp.label.toLowerCase().includes(s) || sp.noun.toLowerCase().includes(s) || k.toLowerCase().includes(s);
    });
  }, [q, lang]);

  const filteredAnimations = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return purchased;
    return purchased.filter(
      (t) =>
        t.title.toLowerCase().includes(s) ||
        t.titleEn?.toLowerCase().includes(s) ||
        t.id.includes(s) ||
        t.category.toLowerCase().includes(s) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(s))
    );
  }, [q, purchased]);

  const tile = (k: Kind) => {
    const s = KIND_SPEC[k];
    return (
      <Tile
        key={k}
        icon={s.paletteIcon}
        label={labelOf(k)}
        p={p}
        onPointerDown={(e) => onPartPointerDown(e, k)}
        starred={favorites.includes(k)}
        onStar={() => onToggleFavorite(k)}
      />
    );
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))",
    gap: 6,
  };

  const renderAnimationCard = (tmpl: UITemplate) => (
    <div
      key={tmpl.id}
      onPointerDown={(e) => onAnimationPointerDown && onAnimationPointerDown(e, tmpl)}
      onClick={() => onAddAnimation && onAddAnimation(tmpl)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: p.surfaceContainerLow,
        borderRadius: 12,
        border: `1px solid ${p.outlineVariant}`,
        cursor: "grab",
        userSelect: "none",
        transition: "border-color 150ms, transform 150ms",
      }}
      title="Nhấp hoặc kéo để đưa vào màn hình giao diện"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "#16161c",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          color: "#34d399",
        }}
      >
        <span className="msr" style={{ fontSize: 20 }}>animation</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: p.primary, fontWeight: 700 }}>
            #{tmpl.id}
          </span>
          <span style={{ fontSize: 9, color: p.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {tmpl.category}
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: p.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tmpl.titleEn || tmpl.title}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddAnimation && onAddAnimation(tmpl);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${p.outlineVariant}`,
          background: p.surfaceContainerHigh,
          color: p.onSurface,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
        title="Thêm vào màn hình"
      >
        <span className="msr" style={{ fontSize: 16 }}>add</span>
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ padding: "12px 12px 8px" }}>
        <Field value={q} onChange={setQ} placeholder={t("search", lang)} p={p} icon="search" height={40} />
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 8px" }}>
        {/* Favorites */}
        {!q && favorites.length > 0 && (
          <Section id="fav" icon="star" title={t("favorites", lang)} p={p}>
            <div style={grid}>{favorites.filter((k) => KIND_SPEC[k] && !PALETTE_HIDDEN.includes(k)).map(tile)}</div>
          </Section>
        )}

        {/* ─── ANIMATION SECTION (UI MARKETPLACE ITEMS) ─── */}
        {!q && (
          <Section id="cat:animation" icon="auto_awesome" title="Animation" p={p}>
            {purchased.length === 0 ? (
              <div
                style={{
                  padding: "16px 14px",
                  background: p.surfaceContainerLow,
                  borderRadius: 14,
                  border: `1px dashed ${p.outlineVariant}`,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: p.surfaceContainerHigh,
                    display: "grid",
                    placeItems: "center",
                    color: p.primary,
                  }}
                >
                  <span className="msr" style={{ fontSize: 22 }}>storefront</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.onSurface }}>
                  Chưa có Animation đã mua
                </div>
                <p style={{ fontSize: 11, color: p.onSurfaceVariant, margin: 0, lineHeight: 1.45 }}>
                  Khám phá các animation tương tác từ UI Marketplace để đưa vào giao diện.
                </p>
                <Link
                  href="/ui-marketplace/"
                  target="_blank"
                  style={{
                    marginTop: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 999,
                    background: p.primary,
                    color: p.onPrimary,
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <span>Khám phá Marketplace</span>
                  <span className="msr" style={{ fontSize: 13 }}>open_in_new</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {purchased.map(renderAnimationCard)}
              </div>
            )}
          </Section>
        )}

        {/* Search Results */}
        {q ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 4px 12px" }}>
            {filteredAnimations.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: p.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  Animations ({filteredAnimations.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredAnimations.map(renderAnimationCard)}
                </div>
              </div>
            )}
            {filtered.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: p.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  Components ({filtered.length})
                </div>
                <div style={grid}>{filtered.map(tile)}</div>
              </div>
            )}
            {filtered.length === 0 && filteredAnimations.length === 0 && (
              <div role="status" style={{ gridColumn: "1 / -1", color: p.outline, fontSize: 13, padding: 12, textAlign: "center", display: "grid", placeItems: "center", gap: 6 }}>
                <Icon name="search_off" size={28} />
                <span>{t("noMatch", lang)}</span>
              </div>
            )}
          </div>
        ) : (
          CATEGORIES.map((c) => (
            <Section key={c.key} id={`cat:${c.key}`} icon={c.icon} title={lang === "en" ? c.label : CATEGORY_TEXT[lang][c.key]} p={p}>
              <div style={grid}>{KIND_ORDER.filter((k) => KIND_SPEC[k].category === c.key && !PALETTE_HIDDEN.includes(k)).map(tile)}</div>
            </Section>
          ))
        )}
      </div>
    </div>
  );
}
