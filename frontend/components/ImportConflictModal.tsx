"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "@/lib/tokens";

interface Props {
  open: boolean;
  importedTitle: string;
  importedSubtitle?: string;
  activeDesignTitle?: string;
  palette: Palette;
  onReplace: () => void;
  onKeepAndImport: () => void;
  onCancel: () => void;
}

export default function ImportConflictModal({
  open,
  importedTitle,
  importedSubtitle,
  activeDesignTitle,
  palette: p,
  onReplace,
  onKeepAndImport,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="import-conflict-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 850,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận nhập thiết kế"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 580,
              borderRadius: 28,
              background: p.surfaceContainerHigh || "#ffffff",
              color: p.onSurface || "#1e1e1e",
              boxShadow: "0 20px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px 28px 16px",
                borderBottom: `1px solid ${p.outlineVariant}33`,
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: `${p.primary}18`,
                  color: p.primary,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "Material Symbols Rounded",
                    fontSize: 28,
                    lineHeight: 1,
                  }}
                >
                  file_open
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: p.onSurface,
                  }}
                >
                  Không gian làm việc đang có thiết kế
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: p.onSurfaceVariant,
                    lineHeight: 1.45,
                  }}
                >
                  {activeDesignTitle
                    ? `Bạn đang mở "${activeDesignTitle}". Bạn muốn xử lý tệp nhập mới như thế nào?`
                    : "Bạn đang có các thành phần đang chỉnh sửa trên màn hình. Hãy chọn cách nạp tệp thiết kế mới:"}
                </p>
              </div>

              <button
                onClick={onCancel}
                title="Đóng (Esc)"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: p.onSurfaceVariant,
                  padding: 6,
                  borderRadius: 16,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Imported file banner */}
            <div
              style={{
                margin: "16px 28px 8px",
                padding: "10px 16px",
                borderRadius: 16,
                background: `${p.secondaryContainer}44`,
                border: `1px solid ${p.outlineVariant}44`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "Material Symbols Rounded",
                  fontSize: 22,
                  color: p.primary,
                }}
              >
                description
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: p.onSurface,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {importedTitle || "Tệp thiết kế mới"}
                </div>
                {importedSubtitle && (
                  <div style={{ fontSize: 12, color: p.onSurfaceVariant }}>
                    {importedSubtitle}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: `${p.primary}22`,
                  color: p.primary,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Sẵn sàng nạp
              </span>
            </div>

            {/* Selection Options Body */}
            <div
              style={{
                padding: "12px 28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Option 2 (Recommended): Giữ nguyên và Thêm mới */}
              <button
                type="button"
                onClick={onKeepAndImport}
                className="m3-press group"
                style={{
                  textAlign: "left",
                  padding: "16px 18px",
                  borderRadius: 20,
                  border: `2px solid ${p.primary}`,
                  background: `${p.primary}0a`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: p.primary,
                    color: p.onPrimary,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 22 }}>
                    dashboard_customize
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: p.onSurface,
                      }}
                    >
                      Giữ nguyên và Thêm mới (Keep & Import)
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: p.primary,
                        color: p.onPrimary,
                      }}
                    >
                      Khuyên dùng
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: p.onSurfaceVariant,
                    }}
                  >
                    Giữ lại 100% thiết kế hiện tại, tạo một <strong>Artboard riêng biệt</strong> đặt
                    cạnh bên để bạn so sánh, lấy linh kiện hoặc chỉnh sửa song song.
                  </p>
                </div>
              </button>

              {/* Option 1: Thay thế (Replace) */}
              <button
                type="button"
                onClick={onReplace}
                className="m3-press"
                style={{
                  textAlign: "left",
                  padding: "16px 18px",
                  borderRadius: 20,
                  border: `1px solid ${p.outlineVariant}66`,
                  background: p.surfaceContainer || "#f4f4f4",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: `${p.outlineVariant}44`,
                    color: p.onSurface,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 22 }}>
                    swap_horiz
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: p.onSurface,
                      marginBottom: 4,
                    }}
                  >
                    Thay thế thiết kế hiện tại (Replace)
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: p.onSurfaceVariant,
                    }}
                  >
                    Đóng thiết kế cũ và thay thế hoàn toàn bằng tệp mới vừa import.
                    <em> (Bạn vẫn có thể nhấn Undo Ctrl+Z để khôi phục).</em>
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 28px 20px",
                borderTop: `1px solid ${p.outlineVariant}22`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                background: `${p.surfaceContainerLow}55`,
              }}
            >
              <button
                type="button"
                onClick={onCancel}
                className="m3-press"
                style={{
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 20,
                  border: `1px solid ${p.outlineVariant}66`,
                  background: "transparent",
                  color: p.onSurfaceVariant,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
