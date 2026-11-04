"use client";

import React, { useState, useEffect } from "react";
import {
  DesignVersionItem,
  fetchRemoteVersions,
  createRemoteVersion,
  rollbackRemoteVersion,
  fetchVersionDetail,
} from "@/lib/versionHistory";

interface Props {
  open: boolean;
  onClose: () => void;
  templateId: string;
  currentDocData: any;
  onRollback: (restoredDocData: any) => void;
  primaryColor?: string;
  surfaceColor?: string;
  surfaceContainerColor?: string;
  onSurfaceColor?: string;
  onSurfaceVariantColor?: string;
  token?: string | null;
}

export default function VersionHistoryDrawer({
  open,
  onClose,
  templateId,
  currentDocData,
  onRollback,
  primaryColor = "#6366f1",
  surfaceColor = "#1e1e24",
  surfaceContainerColor = "#282830",
  onSurfaceColor = "#ffffff",
  onSurfaceVariantColor = "#a1a1aa",
  token,
}: Props) {
  const [versions, setVersions] = useState<DesignVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "snapshots" | "autosaves">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");
  const [confirmingRollback, setConfirmingRollback] = useState<DesignVersionItem | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await fetchRemoteVersions(templateId, token);
      setVersions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, templateId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    try {
      const created = await createRemoteVersion(
        templateId,
        currentDocData,
        newVersionName.trim(),
        newVersionDesc.trim(),
        true, // isSnapshot
        token
      );
      setNewVersionName("");
      setNewVersionDesc("");
      setShowCreateModal(false);
      showToast(`Đã tạo snapshot "${created.versionName}" thành công!`);
      await loadVersions();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tạo snapshot");
    }
  };

  const handleExecuteRollback = async () => {
    if (!confirmingRollback) return;
    setRollingBack(true);
    try {
      let targetDocData = confirmingRollback.docData;

      if (!targetDocData) {
        // Fetch full detail if docData was excluded in list
        const detail = await fetchVersionDetail(templateId, confirmingRollback._id, token);
        targetDocData = detail?.docData;
      }

      const res = await rollbackRemoteVersion(
        templateId,
        confirmingRollback._id,
        currentDocData,
        token
      );

      if (res.success && (res.docData || targetDocData)) {
        onRollback(res.docData || targetDocData);
        showToast(`Đã khôi phục về phiên bản V${confirmingRollback.versionNumber}!`);
        setConfirmingRollback(null);
        onClose();
      } else {
        showToast(res.message || "Khôi phục phiên bản thất bại");
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi khôi phục phiên bản");
    } finally {
      setRollingBack(false);
    }
  };

  const filteredVersions = versions.filter((v) => {
    if (filter === "snapshots") return v.isSnapshot;
    if (filter === "autosaves") return !v.isSnapshot;
    return true;
  });

  const formatTime = (ts: string | number) => {
    const d = new Date(ts);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#10b981",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontWeight: 600,
            zIndex: 10001,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Main Drawer Panel */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          height: "100%",
          backgroundColor: surfaceColor,
          color: onSurfaceColor,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Lịch sử phiên bản (Version History)</h2>
              <p style={{ margin: 0, fontSize: 12, color: onSurfaceVariantColor }}>
                Theo dõi & Khôi phục (Rollback) các mốc thiết kế
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: onSurfaceVariantColor,
              cursor: "pointer",
              fontSize: 20,
              padding: 4,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Create Snapshot Action */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: surfaceContainerColor,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "snapshots", "autosaves"] as const).map((key) => {
              const label =
                key === "all" ? "Tất cả" : key === "snapshots" ? "Mốc Snapshot" : "Tự động";
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    border: active ? `1px solid ${primaryColor}` : "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: active ? primaryColor : "transparent",
                    color: active ? "#ffffff" : onSurfaceVariantColor,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* New Snapshot Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: primaryColor,
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
            }}
          >
            + Lưu Snapshot
          </button>
        </div>

        {/* Versions Timeline List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: onSurfaceVariantColor, fontSize: 13 }}>
              Đang tải danh sách phiên bản...
            </div>
          ) : filteredVersions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: onSurfaceVariantColor, fontSize: 13 }}>
              Chưa có phiên bản nào được lưu trong bộ lọc này.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredVersions.map((v, idx) => (
                <div
                  key={v._id || idx}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: surfaceContainerColor,
                    border: v.isSnapshot
                      ? `1px solid rgba(99,102,241,0.3)`
                      : "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                  }}
                >
                  {/* Top info row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 6,
                          backgroundColor: v.isSnapshot ? primaryColor : "rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      >
                        V{v.versionNumber}
                      </span>
                      <strong style={{ fontSize: 13, color: onSurfaceColor }}>{v.versionName}</strong>
                    </div>

                    {/* Tag badge */}
                    {v.isRollback ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(245, 158, 11, 0.2)",
                          color: "#f59e0b",
                        }}
                      >
                        Rollback
                      </span>
                    ) : v.isSnapshot ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(99, 102, 241, 0.2)",
                          color: primaryColor,
                        }}
                      >
                        Snapshot
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          color: onSurfaceVariantColor,
                        }}
                      >
                        Auto-save
                      </span>
                    )}
                  </div>

                  {/* Description if present */}
                  {v.description && (
                    <div style={{ fontSize: 12, color: onSurfaceVariantColor, lineHeight: 1.4 }}>
                      {v.description}
                    </div>
                  )}

                  {/* Metrics & Time row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: onSurfaceVariantColor,
                      paddingTop: 4,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span>
                      {v.stats?.frameCount ?? 0} màn hình • {v.stats?.nodeCount ?? 0} phần tử
                    </span>
                    <span>{formatTime(v.createdAt)}</span>
                  </div>

                  {/* Rollback button */}
                  <button
                    onClick={() => setConfirmingRollback(v)}
                    style={{
                      marginTop: 4,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: onSurfaceColor,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)";
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.color = primaryColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.color = onSurfaceColor;
                    }}
                  >
                    ↩️ Khôi phục bản này (Rollback)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Version Snapshot */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 400,
                backgroundColor: surfaceColor,
                borderRadius: 14,
                padding: 24,
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
                Tạo mốc lưu thiết kế (Snapshot)
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: onSurfaceVariantColor }}>
                Đặt tên cho mốc này để dễ dàng quay lại bất kỳ lúc nào (ví dụ: &ldquo;Trước khi đổi nút Mua&rdquo;, &ldquo;Layout V2 Hoàn chỉnh&rdquo;).
              </p>

              <form onSubmit={handleCreateSnapshot}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Tên phiên bản *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bản thiết kế Header mới"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: surfaceContainerColor,
                      color: onSurfaceColor,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Ghi chú chi tiết (Tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ghi chú về các thay đổi chính trong bản này..."
                    value={newVersionDesc}
                    onChange={(e) => setNewVersionDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: surfaceContainerColor,
                      color: onSurfaceColor,
                      fontSize: 13,
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: "transparent",
                      color: onSurfaceVariantColor,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      backgroundColor: primaryColor,
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Lưu Snapshot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Rollback */}
        {confirmingRollback && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              backgroundColor: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: surfaceColor,
                borderRadius: 14,
                padding: 24,
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
                  Xác nhận khôi phục phiên bản V{confirmingRollback.versionNumber}?
                </h3>
              </div>

              <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.5, color: onSurfaceVariantColor }}>
                Toàn bộ các màn hình trên canvas sẽ được đưa về phiên bản{" "}
                <strong style={{ color: onSurfaceColor }}>
                  &ldquo;{confirmingRollback.versionName}&rdquo;
                </strong>.
              </p>

              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#10b981",
                  marginBottom: 20,
                  lineHeight: 1.4,
                }}
              >
                <strong>Bảo vệ an toàn dữ liệu:</strong> Hệ thống sẽ tự động tạo ngay một mốc sao lưu
                dự phòng trạng thái hiện tại trước khi khôi phục, bạn hoàn toàn có thể quay lại bất cứ lúc nào!
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={rollingBack}
                  onClick={() => setConfirmingRollback(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: onSurfaceVariantColor,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={rollingBack}
                  onClick={handleExecuteRollback}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: "#f59e0b",
                    color: "#000000",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {rollingBack ? "Đang khôi phục..." : "Đồng ý khôi phục"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

