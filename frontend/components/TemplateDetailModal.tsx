"use client";

import React, { useEffect, useState } from "react";
import {
  TemplateItem,
  TemplateReview,
  getCoverEditorLink,
  trackCoverTemplateApi,
  toggleLikeTemplateApi,
  addTemplateReviewApi,
} from "@/lib/templateService";
import Link from "next/link";

interface TemplateDetailModalProps {
  template: TemplateItem | null;
  onClose: () => void;
  onTemplateUpdated?: (updated: TemplateItem) => void;
}

export default function TemplateDetailModal({
  template,
  onClose,
  onTemplateUpdated,
}: TemplateDetailModalProps) {
  const [activeImage, setActiveImage] = useState<string>(
    template?.thumbnailUrl || "/hero/card-couture.png"
  );
  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Review & Rating state
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [reviewsList, setReviewsList] = useState<TemplateReview[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingsCount, setRatingsCount] = useState<number>(0);

  useEffect(() => {
    if (template) {
      setActiveImage(template.thumbnailUrl || "/hero/card-couture.png");
      setLikes(template.likesCount || 0);
      setIsLiked(false);
      setReviewsList(template.reviews || []);
      setAvgRating(template.avgRating || 0);
      setRatingsCount(template.ratingsCount || 0);
      setUserComment("");
      setReviewMessage(null);
    }
  }, [template]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!template) return null;

  const templateId = template._id || template.id || "";

  const handleCopyLink = () => {
    const url = `${window.location.origin}${getCoverEditorLink(template)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleLike = async () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (templateId) {
      await toggleLikeTemplateApi(templateId);
    }
  };

  const handleDownloadJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template.docData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${template.title.toLowerCase().replace(/\s+/g, "-")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;

    setSubmittingReview(true);
    setReviewMessage(null);

    const res = await addTemplateReviewApi(templateId, userRating, userComment);
    setSubmittingReview(false);

    if (res.success && res.data) {
      setAvgRating(res.data.avgRating);
      setRatingsCount(res.data.ratingsCount);
      setReviewsList(res.data.reviews || []);
      setReviewMessage({ text: "Cảm ơn bạn đã gửi đánh giá!" });
      setUserComment("");

      if (onTemplateUpdated) {
        onTemplateUpdated({
          ...template,
          avgRating: res.data.avgRating,
          ratingsCount: res.data.ratingsCount,
          reviews: res.data.reviews,
        });
      }
    } else {
      setReviewMessage({ text: res.message || "Không thể gửi đánh giá", error: true });
    }
  };

  const images =
    template.galleryImages && template.galleryImages.length > 0
      ? template.galleryImages
      : [template.thumbnailUrl || "/hero/card-couture.png"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0d131f] border border-white/15 rounded-3xl shadow-2xl z-10 flex flex-col md:flex-row overflow-hidden scrollbar-none">
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-white/20 text-slate-300 hover:text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
          title="Đóng (ESC)"
        >
          <span className="material-symbols-rounded text-lg">close</span>
        </button>

        {/* Left Side: Preview Gallery & Specs */}
        <div className="w-full md:w-1/2 p-6 bg-[#090d16]/90 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-white/10">
          {/* Main Active Image Preview */}
          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-inner group">
            <img
              src={activeImage || template.thumbnailUrl || "/hero/card-couture.png"}
              alt={template.title}
              className="w-full h-full object-cover transition-all"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-black/60 text-red-400 border border-red-500/30 backdrop-blur-md">
              {template.category}
            </div>

            {/* Rating badge on image */}
            {avgRating > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-400 text-xs font-bold">
                <span className="material-symbols-rounded text-xs">star</span>
                <span>{avgRating.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400 font-normal">({ratingsCount})</span>
              </div>
            )}
          </div>

          {/* Thumbnails Row if multiple images */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto w-full py-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-14 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImage === img
                      ? "border-red-500 scale-105 shadow-md"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Quick specs pill */}
          <div className="w-full mt-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-around text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm text-red-400">palette</span>
              <span>
                Gam màu: <strong className="text-white capitalize">{template.docData?.paletteKey || "Material"}</strong>
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm text-cyan-400">devices</span>
              <span>
                Khung: <strong className="text-white capitalize">{template.docData?.frame || "Mobile"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Information, Reviews & Action Panel */}
        <div className="w-full md:w-1/2 p-6 md:p-7 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
          <div className="space-y-4">
            {/* Title & Author */}
            <div>
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono tracking-wider uppercase mb-1">
                <span>Thiết kế cộng đồng</span>
                {template.isFeatured && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                    FEATURED
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{template.title}</h2>

              {/* Author Info */}
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-white/10">
                {template.authorAvatar ? (
                  <img
                    src={template.authorAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 flex items-center justify-center text-xs font-bold">
                    {template.authorName ? template.authorName[0] : "U"}
                  </div>
                )}
                <div>
                  <span className="text-xs text-slate-400 block">Tác giả</span>
                  <span className="text-sm font-semibold text-slate-200">{template.authorName}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Mô tả</h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                {template.description || "Chưa có mô tả chi tiết cho thiết kế này."}
              </p>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Thẻ phong cách</h4>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Community Stats */}
            <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-rounded text-base text-rose-500">favorite</span>
                <span className="font-semibold text-white">{likes}</span> thích
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-rounded text-base text-slate-400">visibility</span>
                <span className="font-semibold text-white">{template.viewsCount || 0}</span> xem
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-rounded text-base text-emerald-400">content_copy</span>
                <span className="font-semibold text-white">{template.forksCount || 0}</span> lượt cover
              </span>
            </div>

            {/* Rating & Review Section */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-sm text-amber-400">star</span>
                  <span>Đánh giá ({ratingsCount})</span>
                </h4>
                {avgRating > 0 && (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span>{avgRating.toFixed(1)} / 5</span>
                  </span>
                )}
              </div>

              {/* Add Review Form */}
              <form onSubmit={handleSubmitReview} className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Đánh giá của bạn:</span>
                  {/* Star Rating Buttons */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating || userRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5 text-base transition-transform hover:scale-125 cursor-pointer"
                        >
                          <span
                            className={`material-symbols-rounded text-lg ${
                              active ? "text-amber-400 fill-amber-400" : "text-slate-600"
                            }`}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Viết nhận xét ngắn (tùy chọn)..."
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:border-red-500/60 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-xs font-bold text-white shrink-0 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {submittingReview ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>

                {reviewMessage && (
                  <div
                    className={`text-[11px] px-2.5 py-1 rounded-lg ${
                      reviewMessage.error
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {reviewMessage.text}
                  </div>
                )}
              </form>

              {/* Reviews List */}
              {reviewsList.length > 0 && (
                <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                  {reviewsList.slice(0, 5).map((rev, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{rev.userName}</span>
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <span key={i} className="material-symbols-rounded text-xs">star</span>
                          ))}
                        </div>
                      </div>
                      {rev.comment && <p className="text-slate-400 text-[11px]">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions: COVER & EXPORT */}
          <div className="pt-4 mt-4 border-t border-white/10 space-y-2.5">
            {/* Primary Action Button: COVER IN CANVAS */}
            <Link
              href={getCoverEditorLink(template)}
              onClick={() => {
                if (templateId) {
                  trackCoverTemplateApi(templateId);
                }
              }}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(229,43,43,0.5)] transition-all flex items-center justify-center gap-2 group text-center cursor-pointer"
            >
              <span className="material-symbols-rounded text-lg group-hover:rotate-12 transition-transform">
                content_copy
              </span>
              <span>Cover mẫu này trong Canvas Editor</span>
            </Link>

            {/* Secondary Buttons Row */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleToggleLike}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isLiked
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : "bg-white/5 border-white/10 hover:border-white/25 text-slate-300 hover:text-white"
                }`}
              >
                <span className="material-symbols-rounded text-base">{isLiked ? "favorite" : "favorite_border"}</span>
                <span>{isLiked ? "Đã thích" : "Thích"}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 text-xs text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition-all"
                title="Sao chép link cover"
              >
                <span className="material-symbols-rounded text-base">{copied ? "check" : "share"}</span>
                <span>{copied ? "Đã chép" : "Chia sẻ"}</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 text-xs text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition-all"
                title="Tải cấu hình JSON"
              >
                <span className="material-symbols-rounded text-base">download</span>
                <span>Tải JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
