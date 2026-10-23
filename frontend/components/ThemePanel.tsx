"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { FONTS, Palette, SHAPES, ShapeScale, Theme } from "@/lib/tokens";
import { ensureFontLoaded } from "@/lib/theme";
import { Lang, t, useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";
import { Toggle } from "./ui";

const shapeLabel = (k: ShapeScale, lang: Lang) => (k === "square" ? t("shapeSquare", lang) : k === "full" ? t("shapeFull", lang) : t("shapeRounded", lang));

/** the corner radius a 28dp default becomes under each scale, for the option art */
const previewR = (k: ShapeScale) => (k === "square" ? 6 : k === "full" ? 28 : 16);

function Hint({ p, children }: { p: Palette; children: React.ReactNode }) {
  return <div style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant, padding: "0 4px" }}>{children}</div>;
}

function OptionCard({
  on,
  onClick,
  p,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  p: Palette;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="m3-press"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "12px 8px 10px",
        borderRadius: 16,
        border: "none",
        background: on ? p.secondaryContainer : p.surfaceContainerLow,
        color: on ? p.onSecondaryContainer : p.onSurface,
        cursor: "pointer",
        outline: on ? `2px solid ${p.primary}` : "2px solid transparent",
        outlineOffset: 1,
      }}
    >
      {children}
      <span style={{ fontSize: 12, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

/** Three cards, each drawing a button, a FAB and a card at that corner scale. */
export function ShapePanel({ p, theme, onChange }: { p: Palette; theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const lang = useLang();
  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant, padding: "0 4px" }}>{t("shapeScale", lang)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SHAPES.map((sh) => {
          const r = previewR(sh.key);
          const on = theme.shape === sh.key;
          return (
            <button
              key={sh.key}
              onClick={() => onChange({ shape: sh.key })}
              aria-pressed={on}
              className="m3-press"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px 14px",
                borderRadius: 16,
                border: "none",
                background: on ? p.secondaryContainer : p.surfaceContainerLow,
                color: on ? p.onSecondaryContainer : p.onSurface,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shapeLabel(sh.key, lang)}</span>
                {on && <Icon name="check" size={20} />}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 64, height: 26, borderRadius: r, background: p.primary }} />
                <span style={{ width: 26, height: 26, borderRadius: Math.round(r * 0.6), background: p.primaryContainer }} />
                <span style={{ width: 40, height: 26, borderRadius: Math.round(r * 0.7), background: p.surfaceContainerHighest, border: `1px solid ${p.outlineVariant}`, boxSizing: "border-box" }} />
              </span>
            </button>
          );
        })}
      </div>
      <Hint p={p}>{t("shapeHint", lang)}</Hint>
    </div>
  );
}

/** Typeface rows rendered in their own face, and the emphasized switch with a live sample. */
export function TypePanel({ p, theme, onChange }: { p: Palette; theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const lang = useLang();
  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant, padding: "0 4px" }}>{t("fontFamily", lang)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FONTS.map((f) => {
          const on = theme.font === f.key;
          ensureFontLoaded(f.key);
          return (
            <button
              key={f.key}
              onClick={() => onChange({ font: f.key })}
              aria-pressed={on}
              className="m3-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 52,
                padding: "0 14px 0 12px",
                borderRadius: 16,
                border: "none",
                background: on ? p.secondaryContainer : p.surfaceContainerLow,
                color: on ? p.onSecondaryContainer : p.onSurface,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: f.family,
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 600, width: 36, flex: "0 0 auto" }}>Aa</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
              {on && <Icon name="check" size={20} />}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 12, borderRadius: 16, background: p.surfaceContainerLow, display: "flex", flexDirection: "column", gap: 8 }}>
        <Toggle on={theme.emphasized} onChange={(emphasized) => onChange({ emphasized })} p={p} icon="format_bold" label={t("emphasized", lang)} grow />
        <Hint p={p}>{t("emphasizedHint", lang)}</Hint>
      </div>
    </div>
  );
}

/** Two option cards that replay their own motion when chosen, plus a tap-to-try dot. */
export function MotionPanel({ p, theme, onChange }: { p: Palette; theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const lang = useLang();
  const [tick, setTick] = useState(0);
  const expressive = theme.motion === "expressive";
  const transition = expressive
    ? { type: "spring" as const, stiffness: 380, damping: 18, mass: 1 }
    : { duration: 0.35, ease: [0.2, 0, 0, 1] as const };
  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant, padding: "0 4px" }}>{t("motionScheme", lang)}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <OptionCard on={!expressive} onClick={() => { onChange({ motion: "standard" }); setTick((n) => n + 1); }} p={p} label={t("motionStandard", lang)}>
          <svg width="64" height="36" viewBox="0 0 64 36" aria-hidden>
            <path d="M4 32 C 24 32, 30 4, 60 4" fill="none" stroke={p.primary} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </OptionCard>
        <OptionCard on={expressive} onClick={() => { onChange({ motion: "expressive" }); setTick((n) => n + 1); }} p={p} label={t("motionExpressive", lang)}>
          <svg width="64" height="36" viewBox="0 0 64 36" aria-hidden>
            <path d="M4 32 C 16 32, 20 -6, 32 6 S 48 10, 60 4" fill="none" stroke={p.primary} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </OptionCard>
      </div>
      <Hint p={p}>{t("motionHint", lang)}</Hint>

      <div style={{ fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant, padding: "8px 4px 0" }}>
        Interactive Motion Test
      </div>
      <button
        onClick={() => setTick((n) => n + 1)}
        className="m3-press"
        title={t("tryIt", lang)}
        aria-label={t("tryIt", lang)}
        style={{
          position: "relative",
          height: 104,
          borderRadius: 20,
          border: `1px solid ${p.outlineVariant}`,
          background: p.surfaceContainerLow,
          cursor: "pointer",
          overflow: "hidden",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {/* Animated ball */}
        <motion.span
          key={`ball:${theme.motion}:${tick}`}
          initial={{ x: -60, scale: 0.6, rotate: -45 }}
          animate={{ x: 0, scale: 1, rotate: 0 }}
          transition={transition}
          style={{
            width: 44,
            height: 44,
            borderRadius: expressive ? 14 : 22,
            background: p.primary,
            display: "grid",
            placeItems: "center",
            color: p.onPrimary,
            boxShadow: `0 8px 20px color-mix(in srgb, ${p.primary} 40%, transparent)`,
          }}
        >
          <Icon name="arrow_forward" size={22} />
        </motion.span>

        {/* Pulse chip */}
        <motion.span
          key={`chip:${theme.motion}:${tick}`}
          initial={{ scale: 0.7, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={transition}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: p.secondaryContainer,
            color: p.onSecondaryContainer,
            fontSize: 12,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="auto_awesome" size={16} />
          <span>{expressive ? "Spring 120fps" : "Cubic Ease"}</span>
        </motion.span>
      </button>
      <div style={{ fontSize: 11, color: p.onSurfaceVariant, textAlign: "center", padding: "0 4px" }}>
        Click the playground to test elasticity and physics
      </div>
    </div>
  );
}
