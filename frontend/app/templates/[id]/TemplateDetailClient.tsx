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
  deleteTemplateReviewApi,
  isAuthorFollowed,
  toggleFollowAuthor,
} from "@/lib/templateService";
import { Preview } from "@/components/Preview";
import { DEFAULT_THEME, paletteOf } from "@/lib/tokens";
import CommentThread from "@/components/CommentThread";
import { AddToCollectionModal } from "@/components/CollectionManager";
import DesignThumbnail from "@/components/DesignThumbnail";
import ReportModal from "@/components/ReportModal";
import { isCurrentUserAdmin } from "@/lib/reportService";
import { getCreatorProfileHref } from "@/lib/userService";

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
  const [activeImage, setActiveImage] = useState<string>("");
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
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [reviewsList, setReviewsList] = useState<TemplateReview[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingsCount, setRatingsCount] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    setIsAdmin(isCurrentUserAdmin());
  }, []);

  // Collection modal state
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  // Review options dropdown state
  const [openReviewMenu, setOpenReviewMenu] = useState<string | null>(null);

  // Report modal state
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    targetType: "template" | "review" | "creator";
    targetId: string;
    targetTitle: string;
    targetUrl?: string;
  }>({
    isOpen: false,
    targetType: "template",
    targetId: "",
    targetTitle: "",
    targetUrl: "",
  });

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
        setActiveImage(data.thumbnailUrl || "");
        setLikes(data.likesCount || 0);
        setReviewsList(data.reviews || []);
        setAvgRating(data.avgRating || 0);
        setRatingsCount(data.ratingsCount || 0);

        // Check if author followed
        const authorKey = (data.author?._id || data.authorName || "").toString();
        setIsFollowing(isAuthorFollowed(authorKey));
      } else {
        setError("The requested design template could not be found.");
      }
      setLoading(false);
    }

    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-review-menu]")) {
        setOpenReviewMenu(null);
      }
    };
    if (openReviewMenu) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openReviewMenu]);

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
      setReviewMessage({ text: "Your review was submitted successfully." });
      setUserComment("");
    } else {
      setReviewMessage({ text: res.message || "Could not submit your review.", error: true });
    }
  };

  const handleDeleteReviewByAdmin = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? The average rating will be recalculated.")) {
      return;
    }
    setDeletingReviewId(reviewId);
    const res = await deleteTemplateReviewApi(templateId, reviewId);
    setDeletingReviewId(null);
    if (res.success && res.data) {
      setAvgRating(res.data.avgRating);
      setRatingsCount(res.data.ratingsCount);
      setReviewsList(res.data.reviews || []);
      setTemplate((prev) =>
        prev
          ? {
              ...prev,
              avgRating: res.data!.avgRating,
              ratingsCount: res.data!.ratingsCount,
              reviews: res.data!.reviews,
            }
          : null
      );
    } else {
      alert("Could not delete the review: " + (res.message || "Unknown error"));
    }
  };

  // Embed Mode View
  if (isEmbed) {
    if (loading) {
      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0a0e17] text-slate-400 text-xs font-mono">
          Loading design...
        </div>
      );
    }
    if (error || !template) {
      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0a0e17] text-slate-400 text-xs">
          This template does not exist or has been deleted.
        </div>
      );
    }
    return (
      <div className="w-full h-full min-h-[480px] bg-[#0e1422] text-white p-4 flex flex-col justify-between border border-white/10 font-sans">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white">{template.title}</h2>
            <p className="text-xs text-slate-400">By {template.authorName}</p>
          </div>
          <a
            href={`/templates/${templateId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
          >
            Open in PickMe3D
          </a>
        </div>

        <div className="relative my-3 flex-1 min-h-[300px] flex items-center justify-center bg-slate-950 rounded-md overflow-hidden border border-white/5">
          <DesignThumbnail docData={template.docData} thumbnailUrl={template.thumbnailUrl} title={template.title} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span>🔁 {template.forksCount || 0} uses</span>
          <span>★ {avgRating > 0 ? avgRating.toFixed(1) : "No ratings yet"}</span>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <div className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Template gallery</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading design details...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !template) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <div className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Template gallery</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-2xl">error_outline</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Template not found</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The design may have been deleted or made private by its creator.
          </p>
          <Link
            href="/templates"
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
          >
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  const images =
    template.galleryImages && template.galleryImages.length > 0
      ? template.galleryImages
      : template.thumbnailUrl ? [template.thumbnailUrl] : [];

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
      <div className="bg-[#0a0e17] border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Gallery</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">
            {template.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              type="button"
              onClick={() =>
                setReportModalData({
                  isOpen: true,
                  targetType: "template",
                  targetId: template._id || templateId,
                  targetTitle: template.title || "Design template",
                  targetUrl: `/templates/${templateId}`,
                })
              }
              className="px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Report this template"
            >
              <span className="material-symbols-rounded text-sm text-red-400">flag</span>
              <span className="hidden md:inline">Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">share</span>
            <span className="hidden sm:inline">Share & Embed</span>
          </button>

          <button
            type="button"
            onClick={handleUseTemplate}
            className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">content_copy</span>
            <span>Use this template</span>
          </button>
        </div>
      </div>

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
                  Canvas preview
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
                  3D view
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
                  Detail images
                </button>
              </div>

              {/* Fullscreen Interactive Trigger */}
              <button
                type="button"
                onClick={() => setFullInteractiveOpen(true)}
                className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors"
                title="Open the interactive viewer fullscreen"
              >
                <span className="material-symbols-rounded text-sm">fullscreen</span>
                <span>Fullscreen</span>
              </button>
            </div>

            {/* Display Stage Area */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-md border border-white/5 overflow-hidden flex items-center justify-center">
              {viewMode === "canvas" ? (
                <DesignThumbnail docData={template.docData} title={template.title} />
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
                    <DesignThumbnail docData={template.docData} thumbnailUrl={activeImage || template.thumbnailUrl} title={template.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <span className="text-[10px] font-mono text-red-400 block uppercase">
                          3D render
                        </span>
                        <span className="text-xs font-bold text-white block">{template.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Image Gallery Stage */
                <div className="w-full h-full flex items-center justify-center p-4">
                  <DesignThumbnail docData={template.docData} thumbnailUrl={activeImage || template.thumbnailUrl} title={template.title} />
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
                <span className="text-[11px] text-slate-400 block">Design frames</span>
                <span className="font-semibold text-white capitalize">{doc.frame || "Phone"}</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Color palette</span>
                <span className="font-semibold text-white capitalize">{doc.paletteKey || "Purple"}</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Element groups</span>
                <span className="font-semibold text-white">{doc.groups?.length || 0} groups</span>
              </div>
              <div className="p-2.5 rounded-md bg-slate-900 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Category</span>
                <span className="font-semibold text-white">{template.category}</span>
              </div>
            </div>
          </div>

          {/* Section: Reviews & ratings */}
          <div className="rounded-md bg-[#0e1422] border border-white/10 p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Reviews & Ratings
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
                <span className="text-xs font-medium text-slate-300">Your rating:</span>
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
                            active ? "rating-star-filled" : "rating-star-outline"
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
                  placeholder="Leave a review for this design..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500  outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingReview || userRating === 0}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  {submittingReview ? "Submitting..." : "Submit review"}
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
                No reviews yet. Be the first to rate this design.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsList.map((rev, idx) => {
                  const reviewId = (rev as any)._id || (rev as any).id || rev.user || `${templateId}-review-${idx}`;
                  const reviewerHref = getCreatorProfileHref(rev.user, rev.userName);
                  return (
                    <div key={idx} className="p-3.5 rounded-md bg-slate-900 border border-white/5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        {reviewerHref ? (
                          <Link href={reviewerHref} className="flex items-center gap-2 hover:opacity-85 transition-opacity">
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
                            <span className="font-semibold text-white hover:underline">{rev.userName}</span>
                          </Link>
                        ) : (
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
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-amber-400 text-xs">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <span key={i} className="material-symbols-rounded rating-star-filled text-sm">
                                star
                              </span>
                            ))}
                          </div>

                          {/* Admin direct delete review button */}
                          {isAdmin && (
                            <button
                              type="button"
                              disabled={deletingReviewId === reviewId}
                              onClick={() => handleDeleteReviewByAdmin(reviewId)}
                              className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                              title="Delete this review (admin)"
                            >
                              <span className="material-symbols-rounded text-sm">delete</span>
                            </button>
                          )}

                          {/* Three-dots menu for reporting review */}
                          {!isAdmin && (
                            <div className="relative" data-review-menu>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenReviewMenu(openReviewMenu === reviewId ? null : reviewId);
                                }}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                title="More options"
                              >
                                <span className="material-symbols-rounded text-base">more_vert</span>
                              </button>
                              {openReviewMenu === reviewId && (
                                <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-slate-800 border border-white/10 shadow-xl py-1 z-20 animate-fadeIn">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenReviewMenu(null);
                                      setReportModalData({
                                        isOpen: true,
                                        targetType: "review",
                                        targetId: reviewId,
                                        targetTitle: `Review by ${rev.userName || "User"} for "${template.title || 'Design template'}"`,
                                        targetUrl: `/templates/${templateId}`,
                                      });
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-white/5 hover:text-rose-300 transition-colors cursor-pointer text-left"
                                  >
                                    <span className="material-symbols-rounded text-sm">flag</span>
                                    <span>Report review</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {rev.comment && <p className="text-slate-300 leading-relaxed pl-8">{rev.comment}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Comments */}
          <div className="rounded-md bg-[#0e1422] border border-white/10 p-5">
            <CommentThread templateId={templateId} />
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
                  {template.createdAt ? new Date(template.createdAt).toLocaleDateString("en-US") : "Public"}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {template.title}
              </h1>

              {/* Fork Counter & Metrics Pill */}
              <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  <span>🔁</span>
                  <span>{template.forksCount || 0} uses</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm text-slate-400">visibility</span>
                  <span>{template.viewsCount || 0} xem</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm text-rose-400">favorite</span>
                  <span>{likes} likes</span>
                </span>
              </div>
            </div>

            {/* Author Information + Follow Button */}
            <div className="p-3.5 rounded-md bg-slate-900 border border-white/5 flex items-center justify-between gap-3">
              {(() => {
                const authorUsername =
                  typeof template.author === "object" ? template.author?.username : undefined;
                const creatorHref = getCreatorProfileHref(template.author, template.authorName);
                const avatarEl = template.authorAvatar ? (
                  <img
                    src={template.authorAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm shrink-0 border border-white/10">
                    {template.authorName ? template.authorName[0] : "U"}
                  </div>
                );
                const nameEl = (
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block">Creator</span>
                    <span className="text-sm font-semibold text-white group-hover/author:underline truncate block">
                      {template.authorName}
                    </span>
                    {authorUsername ? (
                      <span className="text-[10px] text-red-400 font-medium">@{authorUsername}</span>
                    ) : creatorHref ? (
                      <span className="text-[10px] text-slate-400">View profile & ratings →</span>
                    ) : null}
                  </div>
                );
                return creatorHref ? (
                  <Link
                    href={creatorHref}
                    className="group/author flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity"
                    title={`View ${template.authorName}'s creator profile`}
                  >
                    {avatarEl}
                    {nameEl}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    {avatarEl}
                    {nameEl}
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                  isFollowing
                    ? "bg-slate-800 border-white/20 text-slate-300 hover:border-white/40"
                    : "bg-white text-slate-900 border-white hover:bg-slate-100"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                About this design
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line p-3 rounded-md bg-slate-900 border border-white/5">
                {template.description || "No detailed description is available for this design."}
              </p>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Style tags
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
              {/* Button: Use this template / Fork & edit */}
              <button
                type="button"
                onClick={handleUseTemplate}
                className="w-full py-3 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-rounded text-base">content_copy</span>
                <span>Use this template (Fork & Edit)</span>
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
                  <span>{isLiked ? "Liked" : "Like"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="py-2 px-3 rounded-md bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">share</span>
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="py-2 px-3 rounded-md bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Download JSON configuration"
                >
                  <span className="material-symbols-rounded text-sm">download</span>
                  <span>Download JSON</span>
                </button>
              </div>

              {/* Save to Collection Button */}
              <button
                type="button"
                onClick={() => setCollectionModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">bookmark</span>
                <span>Save to collection</span>
              </button>

              {/* Report Template Trigger */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setReportModalData({
                      isOpen: true,
                      targetType: "template",
                      targetId: template._id || templateId,
                      targetTitle: template.title || "Design template",
                      targetUrl: `/templates/${templateId}`,
                    })
                  }
                  className="w-full py-2 px-3 text-slate-500 hover:text-red-400 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">flag</span>
                  <span>Report this template</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Share & Embed Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-md bg-[#0e1422] border border-white/10 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Share & Embed Design</h3>
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
              <label className="text-xs text-slate-300 font-medium">Direct link:</label>
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
                  {copiedLink ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Embed code (iframe for a website or blog):</label>
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
                  {copiedEmbed ? "Embed code copied" : "Copy iframe code"}
                </button>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
              Paste this embed code into any website, blog post, or Notion page to display the 3D design.
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

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        templateId={templateId}
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData((prev) => ({ ...prev, isOpen: false }))}
        targetType={reportModalData.targetType}
        targetId={reportModalData.targetId}
        targetTitle={reportModalData.targetTitle}
        targetUrl={reportModalData.targetUrl}
      />
    </div>
  );
}
