"use client";

import React from "react";
import {
  TemplateItem,
  getCoverEditorLink,
  prepareEditorSession,
  trackCoverTemplateApi,
} from "@/lib/templateService";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
  template: TemplateItem;
  onSelect?: (template: TemplateItem) => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const router = useRouter();
  const templateId = template._id || template.id || "";

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(template);
    } else if (templateId) {
      router.push(`/templates/${templateId}`);
    }
  };

  const forksCount = template.forksCount || 0;

  return (
    <div className="flex flex-col rounded-md bg-[#0e1422] border border-white/10 hover:border-slate-500 transition-colors overflow-hidden">
      {/* Thumbnail Container */}
      <div
        className="relative w-full aspect-[4/5] overflow-hidden bg-slate-900 cursor-pointer"
        onClick={handleCardClick}
      >
        <img
          src={template.thumbnailUrl || "/hero/card-couture.png"}
          alt={template.title}
          className="w-full h-full object-cover"
        />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-black/80 text-red-400 border border-white/10">
            {template.category}
          </span>
        </div>

        {/* Quick View Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="px-3.5 py-1.5 rounded-md bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-rounded text-sm">visibility</span>
            <span>Xem chi tiết</span>
          </button>
        </div>

        {/* Metrics Pill (Bottom right of image) */}
        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-[11px] text-slate-300">
          {template.avgRating !== undefined && template.avgRating > 0 ? (
            <>
              <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                <span className="material-symbols-rounded text-xs">star</span>
                <span>{template.avgRating.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400 font-normal">({template.ratingsCount || 0})</span>
              </span>
              <span className="text-white/20">•</span>
            </>
          ) : null}
          <span className="flex items-center gap-1">
            <span className="material-symbols-rounded text-xs text-rose-400">favorite</span>
            <span>{template.likesCount || 0}</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-rounded text-xs text-slate-400">visibility</span>
            <span>{template.viewsCount || 0}</span>
          </span>
        </div>
      </div>

      {/* Info Container */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-[#0e1422]">
        <div className="space-y-1.5">
          {/* Visual Fork Counter Badge */}
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md w-fit">
            <span className="text-xs">🔁</span>
            <span>{forksCount} lần được dùng lại</span>
          </div>

          {/* Title */}
          <Link
            href={`/templates/${templateId}`}
            onClick={(e) => {
              if (onSelect) {
                e.preventDefault();
                onSelect(template);
              }
            }}
            className="block text-sm font-semibold text-white hover:text-red-400 transition-colors line-clamp-1"
            title={template.title}
          >
            {template.title}
          </Link>

          {/* Description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {template.description || "Thiết kế thời trang từ cộng đồng PickMe3D."}
          </p>
        </div>

        {/* Author & Action Row */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          {/* Author */}
          <div className="flex items-center gap-2 min-w-0">
            {template.authorAvatar ? (
              <img
                src={template.authorAvatar}
                alt={template.authorName}
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/20"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                {template.authorName ? template.authorName[0] : "U"}
              </div>
            )}
            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[90px]">
              {template.authorName}
            </span>
          </div>

          {/* "Dùng mẫu này" Action Button */}
          <Link
            href={getCoverEditorLink(template)}
            onClick={() => {
              prepareEditorSession(template, false);
              if (templateId) {
                trackCoverTemplateApi(templateId);
              }
            }}
            className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
            title="Dùng mẫu này để tiếp tục sáng tạo"
          >
            <span className="material-symbols-rounded text-xs">content_copy</span>
            <span>Dùng mẫu</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
