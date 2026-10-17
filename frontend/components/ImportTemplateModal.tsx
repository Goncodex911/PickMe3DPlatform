"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { parseTemplateFile, TemplateFile } from "@/types/template-file";
import { findDeviceById } from "@/constants/devices";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the parsed file when validation passes */
  onImportSuccess: (file: TemplateFile) => void;
  surfaceContainerColor: string;
  onSurfaceColor: string;
  onSurfaceVariantColor: string;
  primaryColor: string;
  onPrimaryColor: string;
  errorColor?: string;
}

type ParseState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "error"; errors: string[] }
  | { status: "success"; file: TemplateFile };

const ACCEPTED = ".json,.pickme3d";

export default function ImportTemplateModal({
  open,
  onClose,
  onImportSuccess,
  surfaceContainerColor,
  onSurfaceColor,
  onSurfaceVariantColor,
  primaryColor,
  onPrimaryColor,
  errorColor = "#ef4444",
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParseState({ status: "idle" });
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback(
    (file: File) => {
      // Validate extension
      const name = file.name.toLowerCase();
      if (!name.endsWith(".json") && !name.endsWith(".pickme3d")) {
        setParseState({
          status: "error",
          errors: ["File không hợp lệ. Chỉ chấp nhận .json hoặc .pickme3d"],
        });
        return;
      }

      setParseState({ status: "parsing" });

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw: unknown = JSON.parse(ev.target?.result as string);
          const result = parseTemplateFile(raw);
          if (!result.ok) {
            setParseState({ status: "error", errors: result.errors });
            return;
          }

          // Resolve devicePresetId into a full preset if present
          if (result.data.devicePresetId) {
            const preset = findDeviceById(result.data.devicePresetId);
            if (preset && !result.data.devicePreset) {
              result.data.devicePreset = {
                id: preset.id,
                name: preset.name,
                width: preset.width,
                height: preset.height,
              };
            }
          }

          setParseState({ status: "success", file: result.data });
        } catch {
          setParseState({
            status: "error",
            errors: ["File không phải JSON hợp lệ. Vui lòng kiểm tra lại."],
          });
        }
      };
      reader.onerror = () => {
        setParseState({ status: "error", errors: ["Không thể đọc file."] });
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleConfirm = () => {
    if (parseState.status !== "success") return;
    onImportSuccess(parseState.file);
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="import-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 800,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Nhập Template"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 540px)",
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
                style={{ fontFamily: "Material Symbols Rounded", fontSize: 26, color: primaryColor }}
              >
                file_open
              </span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Nhập Template</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={handleClose}
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
              Kéo thả hoặc chọn file <strong>.json</strong> / <strong>.pickme3d</strong> để nhập
              template vào Editor. Nếu file có docData, Editor sẽ tải toàn bộ thiết kế.
            </p>

            {/* ── Drop zone ── */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? primaryColor : parseState.status === "error" ? errorColor : "rgba(128,128,128,0.3)"}`,
                borderRadius: 16,
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                background: dragOver ? `${primaryColor}10` : "transparent",
                transition: "border-color 160ms, background 160ms",
              }}
            >
              {parseState.status === "parsing" ? (
                <>
                  <span
                    style={{
                      fontFamily: "Material Symbols Rounded",
                      fontSize: 40,
                      color: primaryColor,
                      animation: "spin 1s linear infinite",
                    }}
                  >
                    progress_activity
                  </span>
                  <span style={{ fontSize: 14, color: onSurfaceVariantColor }}>Đang phân tích file…</span>
                </>
              ) : parseState.status === "success" ? (
                <>
                  <span
                    style={{ fontFamily: "Material Symbols Rounded", fontSize: 40, color: "#22c55e" }}
                  >
                    check_circle
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, textAlign: "center" }}>
                    {parseState.file.metadata.title}
                  </span>
                  <span style={{ fontSize: 12, color: onSurfaceVariantColor, textAlign: "center" }}>
                    {parseState.file.layers.length} layer(s) &nbsp;·&nbsp; v{parseState.file.version}
                    {parseState.file.devicePreset &&
                      ` · ${parseState.file.devicePreset.width}×${parseState.file.devicePreset.height}`}
                  </span>
                  <span style={{ fontSize: 12, color: onSurfaceVariantColor, opacity: 0.6 }}>
                    Nhấn để chọn file khác
                  </span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      fontFamily: "Material Symbols Rounded",
                      fontSize: 40,
                      color: dragOver ? primaryColor : onSurfaceVariantColor,
                    }}
                  >
                    upload_file
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {dragOver ? "Thả file vào đây" : "Kéo thả file vào đây"}
                  </span>
                  <span style={{ fontSize: 12, color: onSurfaceVariantColor }}>
                    hoặc nhấn để chọn file • .json · .pickme3d
                  </span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              hidden
              onChange={handleFileInput}
            />

            {/* ── Error messages ── */}
            <AnimatePresence>
              {parseState.status === "error" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: `${errorColor}14`,
                    border: `1px solid ${errorColor}40`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      color: errorColor,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 18 }}>
                      error
                    </span>
                    File không hợp lệ
                  </div>
                  <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: errorColor }}>
                    {parseState.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Actions ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={handleClose}
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
                Huỷ
              </button>
              <button
                onClick={handleConfirm}
                disabled={parseState.status !== "success"}
                style={{
                  height: 40,
                  padding: "0 24px",
                  borderRadius: 20,
                  border: "none",
                  background:
                    parseState.status === "success" ? primaryColor : "rgba(128,128,128,0.2)",
                  color:
                    parseState.status === "success" ? onPrimaryColor : onSurfaceVariantColor,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: parseState.status === "success" ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 160ms",
                }}
              >
                <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 18 }}>
                  file_open
                </span>
                Nhập vào Editor
              </button>
            </div>
          </motion.div>

          {/* Spin keyframe */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
