"use client";

import React, { useState, useEffect, useRef } from "react";

interface AdvancedSearchFiltersProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  dateRange: "week" | "month" | "all";
  onDateRangeChange: (range: "week" | "month" | "all") => void;
  forkable: boolean;
  onForkableChange: (value: boolean) => void;
  availableTags?: string[];
}

const DEFAULT_TAGS = [
  "casual", "formal", "streetwear", "minimalist", "vintage",
  "modern", "sporty", "elegant", "bohemian", "gothic",
  "retro", "classic", "avant-garde", "sustainable", "luxury",
];

const DATE_OPTIONS = [
  { value: "all" as const, label: "Tất cả", icon: "schedule" },
  { value: "week" as const, label: "Tuần này", icon: "date_range" },
  { value: "month" as const, label: "Tháng này", icon: "calendar_month" },
];

export default function AdvancedSearchFilters({
  selectedTags,
  onTagsChange,
  dateRange,
  onDateRangeChange,
  forkable,
  onForkableChange,
  availableTags,
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tags = availableTags && availableTags.length > 0 ? availableTags : DEFAULT_TAGS;
  const panelRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    selectedTags.length +
    (dateRange !== "all" ? 1 : 0) +
    (forkable ? 1 : 0);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
    onDateRangeChange("all");
    onForkableChange(false);
  };

  return (
    <div ref={panelRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          activeFilterCount > 0
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300"
        }`}
      >
        <span className="material-symbols-rounded text-sm">tune</span>
        <span>Bộ lọc nâng cao</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
            {activeFilterCount}
          </span>
        )}
        <span className="material-symbols-rounded text-sm ml-0.5">
          {isExpanded ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Filter Panel */}
      {isExpanded && (
        <div
          className="mt-3 p-4 rounded-xl bg-[#0e1422] border border-white/10 space-y-4"
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          {/* Tags Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-rounded text-sm text-slate-400">label</span>
              <span className="text-xs font-semibold text-slate-300">Hashtags</span>
              {selectedTags.length > 0 && (
                <span className="text-[10px] text-slate-500">
                  ({selectedTags.length} đã chọn)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      isSelected
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-rounded text-sm text-slate-400">
                calendar_today
              </span>
              <span className="text-xs font-semibold text-slate-300">Khoảng thời gian</span>
            </div>
            <div className="flex gap-2">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onDateRangeChange(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    dateRange === opt.value
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span className="material-symbols-rounded text-xs">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Forkable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-sm text-slate-400">
                content_copy
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Chỉ hiện thiết kế đã fork được
              </span>
            </div>
            <button
              type="button"
              onClick={() => onForkableChange(!forkable)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                forkable ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  forkable ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium"
              >
                <span className="material-symbols-rounded text-xs">close</span>
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
