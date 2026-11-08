"use client";

import React from "react";
import { ArchitecturalStyle } from "@/lib/floorplan-types";

export type CameraMode = "orbit" | "top_down" | "walkthrough" | "dollhouse";

export interface FloorLayerToolbarProps {
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  showCeilings: boolean;
  onToggleCeilings: () => void;
  showWalls: boolean;
  onToggleWalls: () => void;
  showFurniture: boolean;
  onToggleFurniture: () => void;
  showLandscape: boolean;
  onToggleLandscape: () => void;
  isRulerActive: boolean;
  onToggleRuler: () => void;
  measuredDistance: number | null;
  onClearMeasurement: () => void;
  onTriggerAIRender?: () => void;
  isAIRendering?: boolean;
  currentStyle?: ArchitecturalStyle;
  onSelectStyle?: (style: ArchitecturalStyle) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
}

const MATERIAL_STYLES: { id: ArchitecturalStyle; label: string }[] = [
  { id: "scandinavian", label: "Bắc Âu Gỗ Sồi" },
  { id: "luxury_marble", label: "Marble Travertine" },
  { id: "casa_serra", label: "Mộc Mạc Brutalism" },
  { id: "tropical", label: "Nhiệt Đới Xanh" }
];

export default function FloorLayerToolbar({
  cameraMode,
  onCameraModeChange,
  showCeilings,
  onToggleCeilings,
  showWalls,
  onToggleWalls,
  showFurniture,
  onToggleFurniture,
  showLandscape,
  onToggleLandscape,
  isRulerActive,
  onToggleRuler,
  measuredDistance,
  onClearMeasurement,
  onTriggerAIRender,
  isAIRendering = false,
  currentStyle = "casa_serra",
  onSelectStyle,
  isMenuOpen = true,
  onToggleMenu
}: FloorLayerToolbarProps) {
  // If isMenuOpen is omitted (e.g. in vitest), default to true so all inspector elements are rendered
  const isVisible = isMenuOpen ?? true;

  return (
    <div className="contents">
      {/* FLOATING RIGHT INSPECTOR CARD (Exact Match to Prototype Model) */}
      <div 
        className={`absolute right-6 top-16 md:top-20 z-30 pointer-events-auto transition-all duration-200 select-none ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none -translate-y-2"
        }`}
      >
        <div className="w-[340px] sm:w-[360px] rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-300/90 dark:border-neutral-800 shadow-2xl p-4 font-mono text-xs space-y-3.5">
          
          {/* HEADER */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-neutral-950 text-[10px] font-bold tracking-wider">
                TOOL
              </span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm tracking-tight">
                Tiện Ích Kiến Trúc 3D
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-2 py-0.5 rounded border border-amber-600/40 text-amber-800 dark:text-amber-300 font-bold tracking-wider uppercase">
                PRO EDITION
              </span>
              {onToggleMenu && (
                <button
                  onClick={onToggleMenu}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded transition text-xs"
                  title="Ẩn bảng công cụ"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 1. CHẾ ĐỘ XEM KHÔNG GIAN */}
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider mb-2">
              1. CHẾ ĐỘ XEM KHÔNG GIAN
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              
              {/* Mặt Bằng (2D) */}
              <button
                onClick={() => onCameraModeChange("top_down")}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between min-h-[66px] ${
                  cameraMode === "top_down"
                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 shadow-sm"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
                title="Nhìn thẳng từ trên cao xuống"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px]">
                    Mặt Bằng (2D)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${cameraMode === "top_down" ? "bg-amber-500" : "bg-neutral-300 dark:bg-neutral-600"}`} />
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Nhìn thẳng từ trên cao xuống
                </span>
              </button>

              {/* Sa Bàn (1.5m) */}
              <button
                onClick={() => onCameraModeChange("dollhouse")}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between min-h-[66px] ${
                  cameraMode === "dollhouse"
                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 shadow-sm"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
                title="Cắt tường 1.5m chuẩn quy hoạch sa bàn kiến trúc"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px]">
                    Sa Bàn (1.5m)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${cameraMode === "dollhouse" ? "bg-amber-500" : "bg-neutral-300 dark:bg-neutral-600"}`} />
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Cắt tường 1.5m chuẩn quy hoạch
                </span>
              </button>

              {/* Xoay 360° */}
              <button
                onClick={() => onCameraModeChange("orbit")}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between min-h-[66px] ${
                  cameraMode === "orbit"
                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 shadow-sm ring-1 ring-neutral-900/10"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
                title="Xoay tự do toàn cảnh công trình"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px]">
                    Xoay 360°
                  </span>
                  {cameraMode === "orbit" ? (
                    <span className="text-[9px] text-[#FF4D00] font-bold tracking-tight">
                      ● ĐANG BẬT
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  )}
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Xoay tự do toàn cảnh công trình
                </span>
              </button>

              {/* Đi Dạo (WASD) */}
              <button
                onClick={() => onCameraModeChange("walkthrough")}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between min-h-[66px] ${
                  cameraMode === "walkthrough"
                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 shadow-sm"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
                title="Khám phá góc nhìn thứ nhất (First-Person)"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px]">
                    Đi Dạo (WASD)
                  </span>
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold">
                    1st POV
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Khám phá góc nhìn thực tế
                </span>
              </button>

            </div>
          </div>

          {/* 2. PHONG CÁCH HOÀN THIỆN VẬT LIỆU */}
          {onSelectStyle && (
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider mb-2">
                2. PHONG CÁCH HOÀN THIỆN VẬT LIỆU
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MATERIAL_STYLES.map((st) => {
                  const isSelected = currentStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => onSelectStyle(st.id)}
                      className={`px-3 py-2 rounded-xl text-left border transition flex items-center justify-between ${
                        isSelected
                          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 font-bold text-neutral-950 dark:text-white shadow-sm"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="text-[11px] truncate">{st.label}</span>
                      {isSelected ? (
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">✓</span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. QUẢN LÝ LỚP & THƯỚC ĐO 3D */}
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider mb-2">
              3. QUẢN LÝ LỚP & THƯỚC ĐO 3D
            </div>
            
            {/* Layer Pills Row */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              <button
                onClick={onToggleCeilings}
                className={`py-1.5 px-1 rounded-lg transition text-[10px] font-bold flex items-center justify-center ${
                  showCeilings
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                }`}
                title="Bật/Tắt hiển thị trần và mái"
              >
                Trần / Mái
              </button>

              <button
                onClick={onToggleWalls}
                className={`py-1.5 px-1 rounded-lg transition text-[10px] font-bold flex items-center justify-center ${
                  showWalls
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                }`}
                title="Bật/Tắt hiển thị tường"
              >
                Tường
              </button>

              <button
                onClick={onToggleFurniture}
                className={`py-1.5 px-1 rounded-lg transition text-[10px] font-bold flex items-center justify-center ${
                  showFurniture
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                }`}
                title="Bật/Tắt hiển thị nội thất"
              >
                Nội Thất
              </button>

              <button
                onClick={onToggleLandscape}
                className={`py-1.5 px-1 rounded-lg transition text-[10px] font-bold flex items-center justify-center ${
                  showLandscape
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                }`}
                title="Bật/Tắt hiển thị cảnh quan sân vườn"
              >
                Sân Vườn
              </button>
            </div>

            {/* Ruler Measurement Button */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
              <button
                onClick={onToggleRuler}
                className={`flex-1 px-3 py-1.5 rounded-lg font-semibold transition text-[11px] flex items-center justify-center gap-1.5 ${
                  isRulerActive
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                }`}
                title="Click 2 điểm trong không gian 3D để đo khoảng cách"
              >
                <span>└</span>
                <span>{isRulerActive ? "Đang Đo (Click 2 điểm)" : "Thước Đo Khoảng Cách & Cao Độ 3D"}</span>
              </button>

              {measuredDistance !== null && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {measuredDistance.toFixed(2)} m
                  </span>
                  <button
                    onClick={onClearMeasurement}
                    className="text-neutral-400 hover:text-red-500 text-xs px-1"
                    title="Xóa kết quả đo"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* 4. KHỞI TẠO AI RENDER 4K (Full width luxury dark card) */}
          {onTriggerAIRender && (
            <div className="pt-0.5">
              <button
                onClick={onTriggerAIRender}
                disabled={isAIRendering}
                className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950 text-white shadow-md hover:shadow-lg transition font-bold border border-neutral-700/60 active:scale-[0.99] text-xs disabled:opacity-50"
                title="Chụp góc nhìn 3D hiện tại và xuất ảnh AI Render 4K siêu thực (ControlNet Depth)"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">●</span>
                  <span className="font-bold tracking-tight">
                    {isAIRendering ? "ĐANG XỬ LÝ AI RENDER..." : "KHỞI TẠO AI RENDER 4K"}
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono font-bold tracking-wider border border-amber-600/30">
                  CONTROLNET UHD
                </span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* WALKTHROUGH FLOATING TOAST (First-Person Walkthrough instruction) */}
      {cameraMode === "walkthrough" && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto px-4 py-2 rounded-full bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-white text-xs font-mono flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <span className="text-amber-400 font-bold">🎮 Chế độ Đi Dạo (First-Person):</span>
          <span>Dùng <strong>W-A-S-D</strong> hoặc phím mũi tên để di chuyển • Giữ chuột để xoay nhìn 360°</span>
        </div>
      )}
    </div>
  );
}
