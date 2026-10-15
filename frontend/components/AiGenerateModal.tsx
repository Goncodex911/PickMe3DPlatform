"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";

export interface AiGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, screenCount: number) => Promise<void>;
  p: Palette;
  aiReady: boolean;
  onOpenSettings: () => void;
}

const SAMPLE_PROMPTS = [
  { icon: "restaurant", label: "App Đặt đồ ăn", prompt: "Ứng dụng đặt đồ ăn nhanh gồm màn hình Khám phá món ngon, Danh mục nhà hàng và Giỏ hàng thanh toán." },
  { icon: "shopping_bag", label: "Mua sắm E-commerce", prompt: "Giao diện shop thời trang hiện đại với banner khuyến mãi, danh sách sản phẩm nổi bật và bộ lọc danh mục." },
  { icon: "account_balance_wallet", label: "Ví điện tử & Thẻ", prompt: "Ứng dụng ngân hàng số gồm màn hình Số dư tài khoản, Chuyển tiền nhanh và Lịch sử giao dịch chi tiết." },
  { icon: "chat", label: "Trò chuyện & Tin nhắn", prompt: "Màn hình danh sách tin nhắn chat gần đây với avatar trạng thái online và màn hình khung chat chi tiết." },
  { icon: "music_note", label: "Trình nghe nhạc", prompt: "Giao diện nghe nhạc gồm playlist tuyển chọn, thanh bài hát đang phát và màn hình Player điều khiển full." },
  { icon: "fitness_center", label: "Theo dõi sức khỏe", prompt: "Màn hình theo dõi calo tiêu thụ, biểu đồ số bước chân hàng ngày và lịch trình tập luyện cá nhân." },
];

export default function AiGenerateModal({
  open,
  onClose,
  onGenerate,
  p,
  aiReady,
  onOpenSettings,
}: AiGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [screenCount, setScreenCount] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || busy) return;
    if (!aiReady) {
      setErrorMsg("Vui lòng cấu hình API Key trong Cài đặt AI trước khi tạo màn hình.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setStatusText("AI đang phân tích ý tưởng mô tả...");

    const t1 = setTimeout(() => {
      setStatusText("Đang thiết kế các thành phần Material 3 Expressive...");
    }, 2500);

    const t2 = setTimeout(() => {
      setStatusText("Đang hoàn tất bố cục và đồng bộ màn hình lên Canvas...");
    }, 6000);

    try {
      await onGenerate(prompt.trim(), screenCount);
      clearTimeout(t1);
      clearTimeout(t2);
      onClose();
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMsg(err?.message || "Không thể sinh giao diện lúc này. Vui lòng thử lại.");
    } finally {
      setBusy(false);
      setStatusText("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ai-modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={busy ? undefined : onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 650,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 640px)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px 28px",
              borderRadius: 28,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
              boxShadow: "0 16px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: `1px solid ${p.outlineVariant}55`,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
                }}
              >
                <Icon name="auto_awesome" size={24} fill />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: -0.2 }}>
                  Tạo màn hình bằng AI (AI Designer)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: p.onSurfaceVariant }}>
                  Nhập mô tả ý tưởng, AI sẽ tự động dựng và bố cục giao diện hoàn chỉnh.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: "none",
                  background: p.surfaceContainerHighest,
                  color: p.onSurfaceVariant,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                title="Đóng"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Prompt input */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.onSurfaceVariant,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Mô tả giao diện bạn muốn tạo
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Thiết kế ứng dụng du lịch gồm màn hình Khám phá điểm đến với các thẻ ảnh lớn, và màn hình Chi tiết tour có nút Đặt vé nổi bật..."
                rows={4}
                autoFocus
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: `1px solid ${p.outlineVariant}`,
                  background: p.surface,
                  color: p.onSurface,
                  fontSize: 14,
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Quick Suggestions */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.onSurfaceVariant, marginBottom: 8 }}>
                💡 Gợi ý chủ đề nhanh:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    disabled={busy}
                    onClick={() => setPrompt(sample.prompt)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 500,
                      border: `1px solid ${p.outlineVariant}`,
                      background: p.surfaceContainerHighest,
                      color: p.onSurface,
                      cursor: busy ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 140ms ease",
                    }}
                  >
                    <Icon name={sample.icon} size={15} color={p.primary} />
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope / Number of screens selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: p.onSurfaceVariant }}>
                Quy mô giao diện:
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { count: 1, label: "1 Màn hình đơn lẻ" },
                  { count: 2, label: "2 Màn hình liên kết" },
                  { count: 3, label: "Toàn bộ luồng (3 màn hình)" },
                ].map((item) => {
                  const active = screenCount === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      disabled={busy}
                      onClick={() => setScreenCount(item.count)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        border: `1px solid ${active ? p.primary : p.outlineVariant}`,
                        background: active ? p.primaryContainer : p.surface,
                        color: active ? p.onPrimaryContainer : p.onSurfaceVariant,
                        cursor: busy ? "default" : "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.45,
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#dc2626",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span>✕ {errorMsg}</span>
                {!aiReady && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 10,
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mở Cài đặt AI
                  </button>
                )}
              </div>
            )}

            {/* Loading status text */}
            {busy && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: p.primaryContainer,
                  color: p.onPrimaryContainer,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span className="m3-spin" style={{ display: "inline-flex" }}>
                  <Icon name="progress_activity" size={20} />
                </span>
                <span>{statusText || "Đang xử lý..."}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                style={{
                  height: 42,
                  padding: "0 18px",
                  borderRadius: 21,
                  border: "none",
                  background: "transparent",
                  color: p.onSurfaceVariant,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy || !prompt.trim()}
                className="m3-press"
                style={{
                  height: 44,
                  padding: "0 24px",
                  borderRadius: 22,
                  border: "none",
                  background: (!prompt.trim() || busy)
                    ? p.surfaceContainerHighest
                    : "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
                  color: (!prompt.trim() || busy) ? p.onSurfaceVariant : "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: (!prompt.trim() || busy) ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: (!prompt.trim() || busy)
                    ? "none"
                    : "0 4px 14px rgba(168, 85, 247, 0.4)",
                  transition: "all 160ms ease",
                }}
              >
                <Icon name={busy ? "progress_activity" : "auto_awesome"} size={18} fill />
                {busy ? "Đang sinh màn hình..." : "Sinh giao diện (Generate)"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
