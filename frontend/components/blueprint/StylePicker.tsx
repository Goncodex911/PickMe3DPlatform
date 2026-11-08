"use client";

import React from "react";
import { ArchitecturalStyle } from "@/lib/floorplan-types";
import {
  SYSTEM_STYLE_PRESETS,
  StylePresetDefinition
} from "@/lib/floorplan-auto-staging";

interface StylePickerProps {
  currentStyle: ArchitecturalStyle;
  onSelectStyle: (style: ArchitecturalStyle) => void;
  onAutoStage?: (style: ArchitecturalStyle) => void;
  compact?: boolean;
}

const STYLE_BADGES: Record<ArchitecturalStyle, { icon: string; tag: string }> = {
  scandinavian: { icon: "🌲", tag: "Gỗ Sồi & Nỉ Xám" },
  luxury_marble: { icon: "🏛️", tag: "Đá Calacatta & Kính" },
  modern_minimal: { icon: "📐", tag: "Lam Gỗ & Tối Giản" },
  casa_serra: { icon: "🏺", tag: "Bê Tông & Teak Mộc" },
  tropical: { icon: "🌴", tag: "Cây Xanh & Nắng Gió" }
};

export default function StylePicker({
  currentStyle,
  onSelectStyle,
  onAutoStage,
  compact = false
}: StylePickerProps) {
  const styles = Object.keys(SYSTEM_STYLE_PRESETS) as ArchitecturalStyle[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>🎨</span>
            <span>Bộ Sưu Tập Phong Cách Nội Thất Kiến Trúc</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Tự động đổi đồng bộ chất liệu sàn, vách tường, tông ánh sáng và kiểu dáng đồ nội thất
          </p>
        </div>

        {onAutoStage && (
          <button
            onClick={() => onAutoStage(currentStyle)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            title="Tự động kê giường, sofa, tủ, vách tắm theo phong cách hiện tại"
          >
            <span>🛋️</span>
            <span>Kê Đồ Tự Động (Auto-Stage)</span>
          </button>
        )}
      </div>

      <div className={`grid ${compact ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"}`}>
        {styles.map((styleKey) => {
          const preset = SYSTEM_STYLE_PRESETS[styleKey];
          const isSelected = currentStyle === styleKey;
          const badge = STYLE_BADGES[styleKey];

          return (
            <div
              key={styleKey}
              onClick={() => onSelectStyle(styleKey)}
              className={`group relative rounded-xl p-4 cursor-pointer transition border text-left flex flex-col justify-between ${
                isSelected
                  ? "bg-[#1f242d] border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
                  : "bg-[#16181e] border-[#292d37] hover:border-neutral-500 hover:bg-[#1b1e26]"
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{badge.icon}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {badge.tag}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black font-bold text-xs flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition leading-snug">
                  {preset.vietnameseName}
                </h4>

                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Bottom: Palette swatches & materials preview */}
              <div className="mt-4 pt-3 border-t border-[#262a34] space-y-2">
                {/* Color swatches */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-semibold">
                    Bảng màu
                  </span>
                  <div className="flex items-center gap-1.5">
                    {preset.palette.map((color, cIdx) => (
                      <span
                        key={cIdx}
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Materials list */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>Sàn chính:</span>
                  <span className="text-neutral-200 uppercase font-semibold">
                    {preset.floorLiving}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

