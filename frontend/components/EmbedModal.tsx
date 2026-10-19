"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DeviceConfig } from "@/constants/devices";

interface Props {
  open: boolean;
  onClose: () => void;
  templateId: string;
  /** Currently active device preset — used for "Fixed" size option */
  activeDevice?: DeviceConfig | null;
  surfaceContainerColor: string;
  onSurfaceColor: string;
  onSurfaceVariantColor: string;
  primaryColor: string;
  onPrimaryColor: string;
  secondaryContainerColor: string;
  onSecondaryContainerColor: string;
}

type SizeMode = "responsive" | "fixed" | "custom";

const DOMAIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://pickme3d.com";

function buildIframeSnippet(
  templateId: string,
  mode: SizeMode,
  activeDevice: DeviceConfig | null | undefined,
  customW: number,
  customH: number,
): string {
  let width: string;
  let height: string;

  if (mode === "responsive") {
    width = "100%";
    height = "600";
  } else if (mode === "fixed" && activeDevice) {
    width = String(activeDevice.width);
    height = String(activeDevice.height);
  } else if (mode === "custom") {
    width = String(customW);
    height = String(customH);
  } else {
    width = "100%";
    height = "600";
  }

  return `<iframe
  src="${DOMAIN}/embed/${templateId}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="fullscreen; xr-spatial-tracking"
  loading="lazy"
  title="PickMe3D Design"
></iframe>`;
}

export default function EmbedModal({
  open,
  onClose,
  templateId,
  activeDevice,
  surfaceContainerColor,
  onSurfaceColor,
  onSurfaceVariantColor,
  primaryColor,
  onPrimaryColor,
  secondaryContainerColor,
  onSecondaryContainerColor,
}: Props) {
  const [sizeMode, setSizeMode] = useState<SizeMode>("responsive");
  const [customW, setCustomW] = useState(800);
  const [customH, setCustomH] = useState(600);
  const [copied, setCopied] = useState(false);

  const snippet = buildIframeSnippet(templateId, sizeMode, activeDevice, customW, customH);
  const embedUrl = `${DOMAIN}/embed/${templateId}`;

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setSizeMode("responsive");
    }
  }, [open]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      // clipboard unavailable — select text as fallback
      const ta = document.getElementById("embed-code-textarea") as HTMLTextAreaElement | null;
      ta?.select();
    }
  };

  const optionBtn = (mode: SizeMode, label: string, disabled = false) => (
    <button
      key={mode}
      disabled={disabled}
      onClick={() => setSizeMode(mode)}
      style={{
        flex: 1,
        height: 36,
        borderRadius: 18,
        border: "none",
        background: sizeMode === mode ? primaryColor : "rgba(128,128,128,0.1)",
        color: sizeMode === mode ? onPrimaryColor : disabled ? "rgba(128,128,128,0.4)" : onSurfaceColor,
        fontSize: 13,
        fontWeight: sizeMode === mode ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 160ms, color 160ms",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="embed-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 800,
            background: "rgba(0,0,0,0.42)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Nhúng thiết kế"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 600px)",
              background: surfaceContainerColor,
              color: onSurfaceColor,
              borderRadius: 28,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.24)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "Material Symbols Rounded",
                  fontSize: 26,
                  color: primaryColor,
                }}
              >
                code
              </span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Nhúng thiết kế (Embed)</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={onClose}
                aria-label="Đóng"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: "none",
                  background: "transparent",
                  color: onSurfaceVariantColor,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 20 }}>close</span>
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: onSurfaceVariantColor, lineHeight: 1.6 }}>
              Sao chép đoạn mã dưới đây và dán vào website của bạn để nhúng thiết kế 3D này.
            </p>

            {/* ── Embed URL ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 12,
                background: "rgba(128,128,128,0.08)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: "Material Symbols Rounded",
                  fontSize: 16,
                  color: onSurfaceVariantColor,
                  flexShrink: 0,
                }}
              >
                link
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: onSurfaceVariantColor,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {embedUrl}
              </span>
            </div>

            {/* ── Size mode selector ── */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: onSurfaceVariantColor,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Kích thước
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {optionBtn("responsive", "📐 Responsive")}
                {optionBtn("fixed", "📱 Fixed (Device)", !activeDevice)}
                {optionBtn("custom", "✏️ Tuỳ chỉnh")}
              </div>
              {sizeMode === "fixed" && activeDevice && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: onSurfaceVariantColor,
                    padding: "6px 10px",
                    background: "rgba(128,128,128,0.08)",
                    borderRadius: 8,
                  }}
                >
                  {activeDevice.name}: {activeDevice.width} × {activeDevice.height}px
                </div>
              )}
              {sizeMode === "custom" && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{ fontSize: 13, color: onSurfaceVariantColor, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    W:
                    <input
                      type="number"
                      value={customW}
                      min={200}
                      max={3840}
                      onChange={(e) => setCustomW(Number(e.target.value))}
                      style={{
                        width: 80,
                        height: 34,
                        borderRadius: 8,
                        border: "1.5px solid rgba(128,128,128,0.3)",
                        background: "transparent",
                        color: onSurfaceColor,
                        fontSize: 13,
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                    px
                  </label>
                  <label
                    style={{ fontSize: 13, color: onSurfaceVariantColor, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    H:
                    <input
                      type="number"
                      value={customH}
                      min={200}
                      max={2160}
                      onChange={(e) => setCustomH(Number(e.target.value))}
                      style={{
                        width: 80,
                        height: 34,
                        borderRadius: 8,
                        border: "1.5px solid rgba(128,128,128,0.3)",
                        background: "transparent",
                        color: onSurfaceColor,
                        fontSize: 13,
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                    px
                  </label>
                </div>
              )}
            </div>

            {/* ── Code snippet ── */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: onSurfaceVariantColor,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Mã nhúng HTML
              </div>
              <textarea
                id="embed-code-textarea"
                readOnly
                value={snippet}
                rows={7}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(128,128,128,0.2)",
                  background: "rgba(0,0,0,0.12)",
                  color: onSurfaceColor,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "text",
                }}
              />
            </div>

            {/* ── Actions ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 20,
                  border: "none",
                  background: "transparent",
                  color: onSurfaceVariantColor,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
              <motion.button
                onClick={copySnippet}
                whileTap={{ scale: 0.95 }}
                style={{
                  height: 40,
                  padding: "0 22px",
                  borderRadius: 20,
                  border: "none",
                  background: copied ? "#22c55e" : primaryColor,
                  color: onPrimaryColor,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 200ms",
                }}
              >
                <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 18 }}>
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Đã sao chép!" : "Sao chép mã"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
