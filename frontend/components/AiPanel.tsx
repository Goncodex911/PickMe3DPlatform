"use client";

import { useRef, useState } from "react";
import { Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import { AiSettings, PROVIDERS, Provider, providerSpec } from "@/lib/ai";
import { Icon } from "./M3Node";

/** the message shown for a failed request, mapped from the error codes lib/ai throws */
export function aiErrorText(e: unknown, lang: ReturnType<typeof useLang>): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "refusal") return t("aiErrorRefusal", lang);
  if (m === "json" || m === "empty") return t("aiErrorJson", lang);
  if (m === "model") return t("aiErrorModel", lang);
  if (m === "insecure") return t("aiErrorInsecure", lang);
  if (/failed to fetch|networkerror|load failed/i.test(m)) return t("aiErrorNetwork", lang);
  return `${t("aiError", lang)}: ${m}`;
}

export type AiActionKey = "behavior" | "describe";

/** The button that asks the model to write the field above it; spins while it works. */
export function AiWriteBtn({ p, busy, disabled, onClick, onCancel, label, title }: { p: Palette; busy: boolean; disabled?: boolean; onClick: () => void; onCancel: () => void; label: string; title: string }) {
  const lang = useLang();
  const shown = busy ? t("cancel", lang) : title;
  return (
    <button
      onClick={busy ? onCancel : onClick}
      disabled={disabled}
      title={shown}
      aria-label={shown}
      className="m3-press"
      style={{
        height: 40,
        padding: "0 16px 0 12px",
        borderRadius: 20,
        border: "none",
        background: disabled ? p.surfaceContainerHighest : p.primary,
        color: disabled ? p.onSurfaceVariant : p.onPrimary,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flex: "0 0 auto",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      <span className={busy ? "m3-spin" : undefined} style={{ display: "inline-flex" }}>
        <Icon name={busy ? "progress_activity" : "auto_awesome"} size={20} />
      </span>
      {/* both labels are laid out so the button keeps one width while it flips */}
      <span style={{ display: "grid" }}>
        <span style={{ gridArea: "1 / 1", visibility: busy ? "hidden" : "visible" }}>{label}</span>
        <span style={{ gridArea: "1 / 1", visibility: busy ? "visible" : "hidden", textAlign: "center" }}>{t("cancel", lang)}</span>
      </span>
    </button>
  );
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const field = (p: Palette): React.CSSProperties => ({
  width: "100%",
  height: 44,
  padding: "0 14px",
  borderRadius: 22,
  border: `1px solid ${p.outlineVariant}`,
  background: p.surface,
  color: p.onSurface,
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  outline: "none",
  boxSizing: "border-box",
});

function Input({ value, onChange, placeholder, p, type = "text", label }: { value: string; onChange: (v: string) => void; placeholder?: string; p: Palette; type?: string; label: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} spellCheck={false} autoComplete="off" style={field(p)} />;
}

const Label = ({ children, p, right }: { children: React.ReactNode; p: Palette; right?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: p.onSurfaceVariant, marginBottom: 6, padding: "0 4px" }}>
    <span style={{ flex: 1 }}>{children}</span>
    {right}
  </div>
);

/** The providers as one connected button group; each segment shows the provider's mark in the button's color. */
function ProviderGroup({ value, onChange, p }: { value: Provider; onChange: (k: Provider) => void; p: Palette }) {
  const n = PROVIDERS.length;
  const ref = useRef<HTMLDivElement>(null);
  const move = (from: number, delta: number) => {
    const to = (from + delta + n) % n;
    onChange(PROVIDERS[to].key);
    (ref.current?.children[to] as HTMLElement | undefined)?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" style={{ display: "flex", gap: 3 }}>
      {PROVIDERS.map((pr, i) => {
        const on = pr.key === value;
        const outer = 22;
        const inner = 8;
        const l = i === 0 ? outer : inner;
        const r = i === n - 1 ? outer : inner;
        return (
          <button
            key={pr.key}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={pr.label}
            aria-label={pr.label}
            onClick={() => onChange(pr.key)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className="m3-press"
            style={{
              flex: 1,
              height: 44,
              border: "none",
              borderRadius: `${l}px ${r}px ${r}px ${l}px`,
              background: on ? p.primary : p.surfaceContainerHigh,
              color: on ? p.onPrimary : p.onSurfaceVariant,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              transition: "background 160ms, color 160ms",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                display: "block",
                background: "currentColor",
                WebkitMaskImage: `url(${BASE}/logos/${pr.key}.svg)`,
                maskImage: `url(${BASE}/logos/${pr.key}.svg)`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

/** The AI tab of the left rail: the provider settings. The actions live with each screen on the right. */
export function AiPanel({
  p,
  settings,
  onSettings,
  onOpenAiModal,
}: {
  p: Palette;
  settings: AiSettings;
  onSettings: (s: AiSettings) => void;
  onOpenAiModal?: () => void;
}) {
  const lang = useLang();
  const spec = providerSpec(settings.provider);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          baseUrl: settings.baseUrl,
          model: settings.model,
          key: settings.key,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Lỗi kiểm tra kết nối" });
    } finally {
      setTestBusy(false);
    }
  };

  const pick = (k: Provider) => {
    const s = providerSpec(k);
    setTestResult(null);
    onSettings({ ...settings, provider: k, baseUrl: s.baseUrl, model: s.model });
  };

  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: p.onSurfaceVariant, padding: "8px 6px 12px" }}>{t("aiSettings", lang)}</div>

      {onOpenAiModal && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.15) 100%)",
            border: "1.5px solid rgba(168, 85, 247, 0.4)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: p.onSurface, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "grid", placeItems: "center", color: "#fff" }}>
              <Icon name="auto_awesome" size={16} fill />
            </div>
            Tạo màn hình bằng AI
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: p.onSurfaceVariant, marginBottom: 12 }}>
            Nhập mô tả ý tưởng bất kỳ để AI dựng và bố cục giao diện hoàn chỉnh trực tiếp lên Canvas.
          </div>
          <button
            type="button"
            onClick={onOpenAiModal}
            className="m3-press"
            style={{
              width: "100%",
              height: 42,
              borderRadius: 21,
              border: "none",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
            }}
          >
            <Icon name="palette" size={18} />
            Nhập mô tả & Sinh màn hình
          </button>
        </div>
      )}

      <div style={{ padding: "0 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label p={p}>{t("aiProvider", lang)}</Label>
            <ProviderGroup value={settings.provider} onChange={pick} p={p} />
            {spec.hint && (
              <div style={{ fontSize: 11, color: p.primary, marginTop: 4, padding: "0 4px", fontWeight: 500 }}>
                💡 {spec.hint}
              </div>
            )}
          </div>
          <div>
            <Label p={p}>{t("aiModel", lang)}</Label>
            <Input label={t("aiModel", lang)} value={settings.model} onChange={(model) => onSettings({ ...settings, model })} placeholder={spec.model || "model"} p={p} />
            {spec.suggestedModels && spec.suggestedModels.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {spec.suggestedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setTestResult(null);
                      onSettings({ ...settings, model: m });
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      border: `1px solid ${settings.model === m ? p.primary : p.outlineVariant}`,
                      background: settings.model === m ? p.primaryContainer : p.surfaceContainerHigh,
                      color: settings.model === m ? p.onPrimaryContainer : p.onSurfaceVariant,
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label p={p}>{t("aiBaseUrl", lang)}</Label>
            <Input label={t("aiBaseUrl", lang)} value={settings.baseUrl} onChange={(baseUrl) => onSettings({ ...settings, baseUrl })} placeholder={spec.baseUrl} p={p} />
          </div>
          <div>
            <Label
              p={p}
              right={
                spec.keysUrl && (
                  <a href={spec.keysUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: p.primary }}>
                    {t("aiGetKey", lang)}
                  </a>
                )
              }
            >
              {t("aiKey", lang)}
            </Label>
            <Input label={t("aiKey", lang)} value={settings.key} onChange={(key) => { setTestResult(null); onSettings({ ...settings, key }); }} placeholder="sk-…" p={p} type="password" />
            <div style={{ fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant, marginTop: 8, padding: "0 4px" }}>
              {settings.provider === "gemini" ? "Lấy khóa miễn phí nhanh tại Google AI Studio và dán vào đây để bắt đầu." : t("aiKeyHint", lang)}
            </div>

            {/* Test connection button */}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                disabled={testBusy || (!settings.key.trim() && !settings.baseUrl.includes("localhost"))}
                onClick={testConnection}
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 19,
                  border: `1px solid ${p.outlineVariant}`,
                  background: p.surfaceContainerHigh,
                  color: p.onSurface,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: testBusy ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: (!settings.key.trim() && !settings.baseUrl.includes("localhost")) ? 0.6 : 1,
                }}
              >
                <Icon name={testBusy ? "progress_activity" : "bolt"} size={16} />
                {testBusy ? "Đang kiểm tra kết nối..." : "Kiểm tra kết nối (Test Model)"}
              </button>
              {testResult && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    lineHeight: 1.4,
                    background: testResult.success ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    color: testResult.success ? "#16a34a" : "#dc2626",
                    border: `1px solid ${testResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  }}
                >
                  {testResult.success ? "✓ " : "✕ "}
                  {testResult.message}
                </div>
              )}
            </div>

            {onOpenAiModal && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 18,
                  background: p.surfaceContainerHighest,
                  border: `1px solid ${p.outlineVariant}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: p.onSurface, marginBottom: 4 }}>
                  <Icon name="auto_awesome" size={18} color="#a855f7" />
                  Tạo màn hình bằng AI
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: p.onSurfaceVariant, marginBottom: 12 }}>
                  Nhập mô tả ý tưởng bất kỳ để AI dựng và bố cục giao diện trực tiếp lên Canvas.
                </div>
                <button
                  type="button"
                  onClick={onOpenAiModal}
                  className="m3-press"
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 20,
                    border: "none",
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
                  }}
                >
                  <Icon name="palette" size={18} />
                  Nhập mô tả & Sinh màn hình
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
