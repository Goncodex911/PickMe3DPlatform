"use client";

import React, { useState } from "react";

export interface AIRenderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSnapshotUrl: string | null;
  renderResultUrl: string | null;
  isLoading: boolean;
  error?: string | null;
  styleName: string;
  enhancedPrompt?: string;
  executionTimeMs?: number;
  resolution?: string;
}

export default function AIRenderPreviewModal({
  isOpen,
  onClose,
  originalSnapshotUrl,
  renderResultUrl,
  isLoading,
  error,
  styleName,
  enhancedPrompt,
  executionTimeMs,
  resolution = "3840x2160 (4K UHD)"
}: AIRenderPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"render" | "original">("render");

  if (!isOpen) return null;

  const handleDownload = () => {
    const downloadUrl = renderResultUrl || originalSnapshotUrl;
    if (!downloadUrl) return;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `PickMe3D_Render4K_${styleName}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#12141a] border border-[#2b303d] shadow-2xl text-neutral-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232734] bg-[#171a23]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white text-xl shadow-lg shadow-amber-500/20">
              📸
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Ảnh AI Render 4K Siêu Thực (ControlNet ArchViz)
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  {resolution}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Xuất ảnh phối cảnh nội thất chân thực từng vân gỗ, đá cẩm thạch và dải đèn LED kiến trúc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[420px] overflow-y-auto bg-black/40">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
                <div className="w-20 h-20 rounded-full border-4 border-amber-400 border-t-transparent animate-spin flex items-center justify-center text-2xl">
                  ✨
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Đang khởi tạo phối cảnh 4K siêu thực...
                </h3>
                <p className="text-xs text-neutral-400 max-w-md">
                  Áp dụng bản đồ độ sâu (ControlNet Depth), ánh sáng hắt cyan tủ bếp, bóng đổ mềm và vật liệu PBR cao cấp
                </p>
              </div>
              <div className="text-[11px] font-mono text-amber-400 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 animate-pulse">
                ⚡ Tốc độ xử lý dự kiến: &lt; 5 giây
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <div className="text-3xl text-rose-500">⚠️</div>
              <h3 className="text-sm font-semibold text-rose-400">Không thể xuất ảnh Render 4K</h3>
              <p className="text-xs text-neutral-400 max-w-md">{error}</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* View Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setViewMode("render")}
                  className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1.5 ${
                    viewMode === "render"
                      ? "bg-amber-400 text-black shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>✨ Ảnh AI Render 4K</span>
                </button>
                <button
                  onClick={() => setViewMode("original")}
                  className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1.5 ${
                    viewMode === "original"
                      ? "bg-amber-400 text-black shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>📐 Khung Nhìn 3D Gốc</span>
                </button>
              </div>

              {/* Main Image Viewport */}
              <div className="relative w-full max-h-[58vh] aspect-video rounded-xl overflow-hidden border border-[#2e3444] bg-black flex items-center justify-center shadow-2xl">
                <img
                  src={(viewMode === "render" ? renderResultUrl : originalSnapshotUrl) || originalSnapshotUrl || ""}
                  alt="Render Output"
                  className="w-full h-full object-contain"
                />

                {/* Corner Watermark / Badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-neutral-300 flex items-center gap-2">
                  <span className="text-amber-400 font-bold">PickMe3D ArchViz</span>
                  <span>•</span>
                  <span>{styleName}</span>
                </div>
              </div>

              {/* Prompt disclosure */}
              {enhancedPrompt && (
                <div className="w-full p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed font-sans">
                  <span className="text-neutral-200 font-semibold font-mono uppercase text-[10px] mr-2">
                    Architectural Prompt:
                  </span>
                  {enhancedPrompt}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#232734] bg-[#161922]">
          <div className="text-xs text-neutral-400 flex items-center gap-3">
            <span>Phong cách: <strong className="text-white font-mono">{styleName}</strong></span>
            {executionTimeMs !== undefined && (
              <>
                <span>•</span>
                <span>Thời gian: <strong className="text-emerald-400 font-mono">{executionTimeMs} ms</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg transition"
            >
              Đóng
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !renderResultUrl}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>📥</span>
              <span>Tải Ảnh 4K (.PNG)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

