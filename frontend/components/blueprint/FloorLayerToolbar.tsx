"use client";

import React from "react";

export type CameraMode = "orbit" | "top_down" | "walkthrough";

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
}

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
  onClearMeasurement
}: FloorLayerToolbarProps) {
  return (
    <div className="absolute top-20 left-6 z-20 pointer-events-auto flex flex-col gap-2 font-mono text-xs">
      {/* 1. CAMERA MODE SELECTOR */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-300 dark:border-neutral-800 shadow-lg">
        <button
          onClick={() => onCameraModeChange("top_down")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            cameraMode === "top_down"
              ? "bg-amber-400 text-neutral-950 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
          title="Nhìn thẳng từ trên cao xuống (Mặt bằng 2D/3D)"
        >
          <span>📐</span>
          <span>Mặt Bằng</span>
        </button>

        <button
          onClick={() => onCameraModeChange("orbit")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            cameraMode === "orbit"
              ? "bg-amber-400 text-neutral-950 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
          title="Xoay tự do 360 độ quanh công trình"
        >
          <span>🔄</span>
          <span>Xoay 360°</span>
        </button>

        <button
          onClick={() => onCameraModeChange("walkthrough")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            cameraMode === "walkthrough"
              ? "bg-amber-400 text-neutral-950 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
          title="Đi dạo góc nhìn thứ nhất (Dùng phím W-A-S-D và chuột)"
        >
          <span>🚶</span>
          <span>Đi Dạo (WASD)</span>
        </button>
      </div>

      {/* 2. LAYER VISIBILITY TOGGLES */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-300 dark:border-neutral-800 shadow-lg">
        <button
          onClick={onToggleCeilings}
          className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center gap-1 ${
            showCeilings
              ? "bg-neutral-800 text-white font-medium dark:bg-neutral-200 dark:text-neutral-950"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
          title="Bật/Tắt hiển thị trần và mái nhà"
        >
          <span>🏠</span>
          <span>Trần / Mái</span>
        </button>

        <button
          onClick={onToggleWalls}
          className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center gap-1 ${
            showWalls
              ? "bg-neutral-800 text-white font-medium dark:bg-neutral-200 dark:text-neutral-950"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
          title="Bật/Tắt mảng tường"
        >
          <span>🧱</span>
          <span>Tường</span>
        </button>

        <button
          onClick={onToggleFurniture}
          className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center gap-1 ${
            showFurniture
              ? "bg-neutral-800 text-white font-medium dark:bg-neutral-200 dark:text-neutral-950"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
          title="Bật/Tắt đồ nội thất"
        >
          <span>🛋️</span>
          <span>Nội Thất</span>
        </button>

        <button
          onClick={onToggleLandscape}
          className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center gap-1 ${
            showLandscape
              ? "bg-neutral-800 text-white font-medium dark:bg-neutral-200 dark:text-neutral-950"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
          title="Bật/Tắt cảnh quan đồi cỏ và sân vườn"
        >
          <span>🌿</span>
          <span>Sân Vườn</span>
        </button>
      </div>

      {/* 3. 3D MEASUREMENT RULER */}
      <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-300 dark:border-neutral-800 shadow-lg text-[11px]">
        <button
          onClick={onToggleRuler}
          className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
            isRulerActive
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
          title="Click 2 điểm trong không gian 3D để đo khoảng cách"
        >
          <span>📏</span>
          <span>{isRulerActive ? "Đang Đo (Click 2 điểm)" : "Thước Đo 3D"}</span>
        </button>

        {measuredDistance !== null && (
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-300 dark:border-neutral-700">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {measuredDistance.toFixed(2)} m
            </span>
            <button
              onClick={onClearMeasurement}
              className="text-neutral-400 hover:text-red-500"
              title="Xóa kết quả đo"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Walkthrough Instructions Tip */}
      {cameraMode === "walkthrough" && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed shadow-sm">
          <p className="font-bold">🎮 Chế độ Đi Dạo (First-Person):</p>
          <p>• Dùng <strong>W-A-S-D</strong> hoặc phím mũi tên để di chuyển.</p>
          <p>• Giữ chuột và rê để xoay góc nhìn 360°.</p>
        </div>
      )}
    </div>
  );
}

