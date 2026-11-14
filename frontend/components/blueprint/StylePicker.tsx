"use client";

import React from "react";
import { ArchitecturalStyle } from "@/lib/floorplan-types";
import { SYSTEM_STYLE_PRESETS } from "@/lib/floorplan-auto-staging";

interface StylePickerProps {
  currentStyle: ArchitecturalStyle;
  onSelectStyle: (style: ArchitecturalStyle) => void;
  onAutoStage?: (style: ArchitecturalStyle) => void;
  compact?: boolean;
}

const STYLE_TAGS: Record<ArchitecturalStyle, string> = {
  scandinavian: "Gỗ sồi & nỉ xám",
  luxury_marble: "Đá Calacatta & kính",
  modern_minimal: "Lam gỗ & tối giản",
  casa_serra: "Bê tông & teak mộc",
  tropical: "Cây xanh & nắng gió"
};

export default function StylePicker({ currentStyle, onSelectStyle, onAutoStage, compact = false }: StylePickerProps) {
  const styles = Object.keys(SYSTEM_STYLE_PRESETS) as ArchitecturalStyle[];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Phong cách nội thất</h3>
          <p className="text-xs text-neutral-500">Đổi đồng bộ vật liệu sàn, tường, tông ánh sáng và kiểu nội thất</p>
        </div>

        {onAutoStage && (
          <button
            type="button"
            onClick={() => onAutoStage(currentStyle)}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold bg-white border border-[#ddd6c8] text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 transition self-start sm:self-auto"
            title="Tự động kê giường, sofa, tủ theo phong cách đang chọn"
          >
            Kê đồ tự động
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "" : "lg:grid-cols-3"} gap-3`}>
        {styles.map((styleKey) => {
          const preset = SYSTEM_STYLE_PRESETS[styleKey];
          const isSelected = currentStyle === styleKey;

          return (
            <button
              key={styleKey}
              type="button"
              onClick={() => onSelectStyle(styleKey)}
              aria-pressed={isSelected}
              className={`group text-left rounded-2xl p-4 border transition flex flex-col gap-3 ${
                isSelected
                  ? "bg-white border-neutral-900 ring-1 ring-neutral-900 shadow-sm"
                  : "bg-white border-[#e5dfd3] hover:border-neutral-400"
              }`}
            >
              {/* Dải màu đại diện */}
              <div className="flex h-8 rounded-lg overflow-hidden border border-black/5" aria-hidden="true">
                {preset.palette.map((color, cIdx) => (
                  <span key={cIdx} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>

              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-neutral-900 leading-snug">{preset.vietnameseName}</h4>
                  {isSelected && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] flex items-center justify-center" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{preset.description}</p>
              </div>

              <div className="mt-auto flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-[#f0ebe1]">
                <span>{STYLE_TAGS[styleKey]}</span>
                <span className="font-mono uppercase text-neutral-700">{preset.floorLiving}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
