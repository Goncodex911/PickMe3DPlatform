"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TemplateItem,
  TemplateReview,
  fetchTemplateByIdApi,
  getCoverEditorLink,
  prepareEditorSession,
  trackCoverTemplateApi,
  toggleLikeTemplateApi,
  addTemplateReviewApi,
  isAuthorFollowed,
  toggleFollowAuthor,
} from "@/lib/templateService";
import { Preview } from "@/components/Preview";
import { DEFAULT_THEME, paletteOf } from "@/lib/tokens";

interface TemplateDetailClientProps {
  id: string;
}

export default function TemplateDetailClient({ id }: TemplateDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  const templateId = id || "";

  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview interactive state
  const [viewMode, setViewMode] = useState<"canvas" | "image" | "3d">("canvas");
  const [activeImage, setActiveImage] = useState<string>("/hero/card-couture.png");
  const [fullInteractiveOpen, setFullInteractiveOpen] = useState(false);

  // Social & Follow state
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Embed & Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

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
    if (!templateId) return;

    let isMounted = true;
    async function loadTemplate() {
      setLoading(true);
      setError(null);

      const data = await fetchTemplateByIdApi(templateId);
      if (!isMounted) return;

      if (data) {
        setTemplate(data);
        setActiveImage(data.thumbnailUrl || "/hero/card-couture.png");
        setLikes(data.likesCount || 0);
        setReviewsList(data.reviews || []);
        setAvgRating(data.avgRating || 0);
        setRatingsCount(data.ratingsCount || 0);

        // Check if author followed
        const authorKey = (data.author?._id || data.authorName || "").toString();
        setIsFollowing(isAuthorFollowed(authorKey));
      } else {
        setError("Không tìm thấy mẫu thiết kế yêu cầu.");
      }
      setLoading(false);
    }

    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [templateId]);

  const handleToggleLike = async () => {
    if (!templateId) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    await toggleLikeTemplateApi(templateId);
  };

  const handleToggleFollow = () => {
    if (!template) return;
    const authorKey = (template.author?._id || template.authorName || "").toString();
    const updated = toggleFollowAuthor(authorKey);
    setIsFollowing(updated);
  };

  const handleUseTemplate = () => {
    if (!template) return;
    prepareEditorSession(template, false);
    if (templateId) {
      trackCoverTemplateApi(templateId);
    }
    router.push(getCoverEditorLink(template));
  };

  const handleDownloadJson = () => {
    if (!template) return;
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template.docData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${template.title.toLowerCase().replace(/\s+/g, "-")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyShareLink = () => {
    const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbedCode = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const embedCode = `<iframe src="${origin}/templates/${templateId}?embed=true" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
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
      setReviewMessage({ text: "Đã gửi nhận xét và đánh giá thành công." });
      setUserComment("");
    } else {
      setReviewMessage({ text: res.message || "Không thể gửi đánh giá.", error: true });
    }
  };

  // Embed Mode View
  if (isEmbed) {
    if (loading) {
      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0a0e17] text-slate-400 text-xs font-mono">
          Đang tải thiết kế...
        </div>
      );
    }
    if (error || !template) {
      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0a0e17] text-slate-400 text-xs">
          Mẫu không tồn tại hoặc đã bị xóa.
        </div>
      );
    }
    return (
      <div className="w-full h-full min-h-[480px] bg-[#0e1422] text-white p-4 flex flex-col justify-between border border-white/10 font-sans">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white">{template.title}</h2>
            <p className="text-xs text-slate-400">Bởi {template.authorName}</p>
          </div>
          <a
            href={`/templates/${templateId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
          >
            Mở trên PickMe3D
          </a>
        </div>

        <div className="relative my-3 flex-1 min-h-[300px] flex items-center justify-center bg-slate-950 rounded-md overflow-hidden border border-white/5">
          <img
            src={template.thumbnailUrl || "/hero/card-couture.png"}
            alt={template.title}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span>🔁 {template.forksCount || 0} lượt dùng lại</span>
          <span>★ {avgRating > 0 ? avgRating.toFixed(1) : "Chưa có đánh giá"}</span>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <header className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Bộ sưu tập mẫu</span>
          </Link>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Đang tải chi tiết thiết kế...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !template) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <header className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Bộ sưu tập mẫu</span>
          </Link>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-2xl">error_outline</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Không tìm thấy mẫu thiết kế</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Mẫu thiết kế bạn đang tìm có thể đã bị xóa hoặc đặt ở chế độ riêng tư bởi tác giả.
          </p>
          <Link
            href="/templates"
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
          >
            Quay lại bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  const images =
    template.galleryImages && template.galleryImages.length > 0
      ? template.galleryImages
      : [template.thumbnailUrl || "/hero/card-couture.png"];

  const doc = template.docData || {
    groups: [],
    frames: [{ id: "f1", name: "Screen", x: 0, y: 0 }],
    paletteKey: "purple",
    theme: DEFAULT_THEME,
  };

  const palette = paletteOf(doc.paletteKey || "purple", doc.customPalette);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      {/* Top Header / Breadcrumb */}
      <header className="sticky top-0 z-40 bg-[#0a0e17] border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Bộ sưu tập</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">
            {template.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">share</span>
            <span className="hidden sm:inline">Chia sẻ & Nhúng</span>
          </button>

          <button
            type="button"
            onClick={handleUseTemplate}
            className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">content_copy</span>
            <span>Dùng mẫu này</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 3D Preview Stage + Reviews (cols 1-7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Preview Container Card */}
          <div className="rounded-md bg-[#0e1422] border border-white/10 p-5 flex flex-col gap-4">
            {/* View Mode Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md border border-white/5">
                <button
                  type="button"
                  onClick={() => setViewMode("canvas")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "canvas"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Mô phỏng Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "3d"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Góc nhìn 3D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("image")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "image"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Ảnh chi tiết
                </button>
              </div>

              {/* Fullscreen Interactive Trigger */}
              <button
                type="button"
                onClick={() => setFullInteractiveOpen(true)}
                className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors"
                title="Mở trình xem tương tác toàn màn hình"
              >
                <span className="material-symbols-rounded text-sm">fullscreen</span>
                <span>Toàn màn hình</span>
              </button>
            </div>

            {/* Display Stage Area */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-md border border-white/5 overflow-hidden flex items-center justify-center">
              {viewMode === "canvas" ? (
                /* Interactive Canvas Phone Stage */
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <div className="relative w-[240px] sm:w-[270px] aspect-[9/18] rounded-2xl bg-[#121826] border-4 border-slate-700 shadow-xl overflow-hidden flex flex-col">
                    {/* Phone Bezel Header */}
                    <div className="h-5 bg-black/60 flex items-center justify-center">
                      <div className="w-12 h-2.5 bg-slate-800 rounded-full" />
                    </div>
                    {/* Screen View */}
                    <div
                      className="flex-1 p-3 overflow-y-auto"
                      style={{ background: palette.surface, color: palette.onSurface }}
                    >
                      <div className="text-center py-2 border-b border-black/10 mb-3">
                        <span className="text-[11px] font-bold tracking-tight block">
                          {doc.title || template.title}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {doc.frames?.[0]?.name || "Trang chủ"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {doc.groups && doc.groups.length > 0 ? (
                          doc.groups.slice(0, 5).map((g: any, i: number) => (
                            <div
                              key={i}
                              className="p-2 rounded-md bg-black/5 border border-black/5 text-[10px] space-y-1"
                            >
                              <div className="font-semibold text-slate-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span>Nhóm {i + 1}</span>
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {g.items?.map((it: any) => it.label || it.kind).join(", ") || "Phần tử"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-[10px] text-slate-400">
                            Khung thiết kế chuẩn PickMe3D
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Phone Bezel Footer */}
                    <div className="h-4 bg-black/60 flex items-center justify-center">
                      <div className="w-16 h-1 bg-slate-700 rounded-full" />
                    </div>
                  </div>
                </div>
              ) : viewMode === "3d" ? (
                /* 3D Perspective View Stage */
                <div
                  className="w-full h-full p-6 flex items-center justify-center"
                  style={{ perspective: "1000px" }}
                >
                  <div
                    className="relative w-[230px] sm:w-[260px] aspect-[9/18] rounded-2xl bg-[#0f172a] border-4 border-slate-600 shadow-2xl overflow-hidden transition-transform duration-500 hover:rotate-0"
                    style={{
                      transform: "rotateY(-20deg) rotateX(12deg) scale(0.95)",
                      boxShadow: "20px 25px 40px rgba(0,0,0,0.7)",
                    }}
                  >
                    <img
                      src={activeImage || template.thumbnailUrl || "/hero/card-couture.png"}
                      alt={template.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <span className="text-[10px] font-mono text-red-400 block uppercase">
                          Phối cảnh 3D
                        </span>
                        <span className="text-xs font-bold text-white block">{template.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Image Gallery Stage */
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={activeImage || template.thumbnailUrl || "/hero/card-couture.png"}
                    alt={template.title}
                    className="max-w-full max-h-full object-contain rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Gallery Thumbnails if multiple */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImage(img);
                      setViewMode("image");
                    }}
                    className={`w-14 h-16 rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImage === img ? "border-red-500" : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Technical Specifications Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Khung thiết kế</span>
                <span className="font-semibold text-white capitalize">{doc.frame || "Phone"}</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Bảng màu</span>
                <span className="font-semibold text-white capitalize">{doc.paletteKey || "Purple"}</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Số nhóm phần tử</span>
                <span className="font-semibold text-white">{doc.groups?.length || 0} nhóm</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Danh mục</span>
                <span className="font-semibold text-white">{template.category}</span>
              </div>
            </div>
          </div>

          {/* Section: Reviews & Đánh giá */}
          <div className="rounded-md bg-[#0e1422] border border-white/10 p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Đánh giá & Nhận xét
                </h2>
                <span className="text-xs text-slate-400">({ratingsCount})</span>
              </div>

              {avgRating > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  <span className="material-symbols-rounded text-sm">star</span>
                  <span>{avgRating.toFixed(1)} / 5</span>
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <form onSubmit={handleSubmitReview} className="p-4 rounded-md bg-slate-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Đánh giá của bạn:</span>
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
                        className="p-0.5 text-base cursor-pointer"
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

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Để lại nhận xét về mẫu thiết kế..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>

              {reviewMessage && (
                <div
                  className={`text-xs p-2 rounded-md ${
                    reviewMessage.error
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}
            </form>

            {/* Reviews List */}
            {reviewsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có nhận xét nào. Hãy là người đầu tiên đánh giá mẫu thiết kế này.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsList.map((rev, idx) => (
                  <div key={idx} className="p-3.5 rounded-md bg-slate-900 border border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {rev.userAvatar ? (
                          <img
                            src={rev.userAvatar}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                            {rev.userName ? rev.userName[0] : "U"}
                          </div>
                        )}
                        <span className="font-semibold text-white">{rev.userName}</span>
                      </div>
                      <div className="flex items-center text-amber-400 text-xs">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <span key={i} className="material-symbols-rounded text-sm">
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    {rev.comment && <p className="text-slate-300 leading-relaxed pl-8">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Template Info & Actions (cols 8-12) */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {/* Main Info Box */}
          <div className="rounded-md bg-[#0e1422] border border-white/10 p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-slate-800 text-red-400 border border-white/10">
                  {template.category}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {template.createdAt ? new Date(template.createdAt).toLocaleDateString("vi-VN") : "Công khai"}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {template.title}
              </h1>

              {/* Fork Counter & Metrics Pill */}
              <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  <span>🔁</span>
                  <span>{template.forksCount || 0} lần được dùng lại</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm text-slate-400">visibility</span>
                  <span>{template.viewsCount || 0} xem</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm text-rose-400">favorite</span>
                  <span>{likes} thích</span>
                </span>
              </div>
            </div>

            {/* Author Information + Follow Button */}
            <div className="p-3.5 rounded-md bg-slate-900 border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {template.authorAvatar ? (
                  <img
                    src={template.authorAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm shrink-0 border border-white/10">
                    {template.authorName ? template.authorName[0] : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Tác giả thiết kế</span>
                  <span className="text-sm font-semibold text-white truncate block">
                    {template.authorName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                  isFollowing
                    ? "bg-slate-800 border-white/20 text-slate-300 hover:border-white/40"
                    : "bg-white text-slate-900 border-white hover:bg-slate-100"
                }`}
              >
                {isFollowing ? "Đang theo dõi" : "Theo dõi"}
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mô tả thiết kế
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line p-3 rounded-md bg-slate-900 border border-white/5">
                {template.description || "Chưa có mô tả chi tiết cho thiết kế này."}
              </p>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Thẻ phong cách
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-xs text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              {/* Button: Dùng mẫu này / Fork & Chỉnh sửa */}
              <button
                type="button"
                onClick={handleUseTemplate}
                className="w-full py-3 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-rounded text-base">content_copy</span>
                <span>Dùng mẫu này (Fork & Chỉnh sửa)</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`py-2 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isLiked
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                      : "bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="material-symbols-rounded text-sm">
                    {isLiked ? "favorite" : "favorite_border"}
                  </span>
                  <span>{isLiked ? "Đã thích" : "Thích"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="py-2 px-3 rounded-md bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">share</span>
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="py-2 px-3 rounded-md bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Tải cấu hình JSON"
                >
                  <span className="material-symbols-rounded text-sm">download</span>
                  <span>Tải JSON</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Share & Embed Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-md bg-[#0e1422] border border-white/10 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Chia sẻ & Nhúng thiết kế</h3>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-rounded text-base">close</span>
              </button>
            </div>

            {/* Direct Link Section */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Đường dẫn trực tiếp:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href.split("?")[0] : ""}
                  className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-xs text-slate-300 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors shrink-0"
                >
                  {copiedLink ? "Đã sao chép" : "Sao chép"}
                </button>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Mã nhúng (iFrame nhúng web/blog):</label>
              <div className="space-y-2">
                <textarea
                  readOnly
                  rows={3}
                  value={`<iframe src="${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/templates/${templateId}?embed=true" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-xs text-slate-300 select-all font-mono resize-none outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyEmbedCode}
                  className="w-full py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  {copiedEmbed ? "Đã sao chép mã nhúng" : "Sao chép mã nhúng iFrame"}
                </button>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
              Bạn có thể dán mã nhúng trên vào bất kỳ website, bài viết blog hoặc Notion để hiển thị bản thiết kế 3D.
            </div>
          </div>
        </div>
      )}

      {/* Full Interactive Preview Mode */}
      {fullInteractiveOpen && (
        <Preview
          doc={doc}
          widths={{}}
          palette={palette}
          startId={doc.frames?.[0]?.id || null}
          onClose={() => setFullInteractiveOpen(false)}
        />
      )}
    </div>
  );
}
