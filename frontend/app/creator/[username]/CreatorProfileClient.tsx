"use client";

import React, { useEffect, useRef, useState } from "react";
import FollowCreator from "@/components/FollowCreator";
import DesignThumbnail from "@/components/DesignThumbnail";
import TemplateDetailModal from "@/components/TemplateDetailModal";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import {
  CreatorReview,
  PublicUserProfile,
  addCreatorReviewApi,
  deleteCreatorReviewApi,
  fetchPublicProfileByIdApi,
  fetchPublicProfileByUsernameApi,
  getCreatorProfileHref,
} from "@/lib/userService";
import type { TemplateItem } from "@/lib/templateService";
import {
  CollectionItem,
  fetchUserPublicCollectionsApi,
} from "@/lib/collectionService";
import { CollectionCard } from "@/components/CollectionManager";
import ReportModal from "@/components/ReportModal";
import { isCurrentUserAdmin } from "@/lib/reportService";
import styles from "./CreatorProfile.module.css";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return "";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 1) return relativeTime.format(0, "day");
  if (days < 7) return relativeTime.format(-days, "day");
  if (days < 30) return relativeTime.format(-Math.floor(days / 7), "week");
  if (days < 365) return relativeTime.format(-Math.floor(days / 30), "month");
  return new Date(dateStr).toLocaleDateString("en-US");
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n || 0);
}

function formatCategoryLabel(category: string): string {
  return category === "Dạ hội" ? "Eveningwear" : category;
}

interface CreatorProfileClientProps {
  username?: string;
  userId?: string;
}

function CreatorProfileClient({ username = "", userId = "" }: CreatorProfileClientProps) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"designs" | "collections">("designs");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);

  // Auth & Role states
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Creator Review states
  const [reviewsList, setReviewsList] = useState<CreatorReview[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingsCount, setRatingsCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [openReviewMenu, setOpenReviewMenu] = useState<string | null>(null);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [profileCopied, setProfileCopied] = useState(false);
  const reviewInputRef = useRef<HTMLInputElement | null>(null);
  const reviewsSectionRef = useRef<HTMLElement | null>(null);

  // Unified Report Modal state (supports reporting Creator with targetType: 'CREATOR' or reporting a Creator Review)
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    targetType: "CREATOR" | "creator" | "review";
    targetId: string;
    targetTitle: string;
    targetUrl?: string;
  }>({
    isOpen: false,
    targetType: "CREATOR",
    targetId: "",
    targetTitle: "",
    targetUrl: "",
  });

  useEffect(() => {
    const syncAuth = () => {
      setIsAdmin(isCurrentUserAdmin());
      setIsSignedIn(Boolean(localStorage.getItem("pickme3d_token")));
      try {
        const storedUser = JSON.parse(localStorage.getItem("pickme3d_user") || "null");
        setCurrentUserId(String(storedUser?._id || storedUser?.id || ""));
      } catch {
        setCurrentUserId("");
      }
    };
    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-creator-review-menu]")) {
        setOpenReviewMenu(null);
      }
      if (!target.closest("[data-creator-profile-menu]")) {
        setOpenProfileMenu(false);
      }
    };
    if (openReviewMenu || openProfileMenu) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openReviewMenu, openProfileMenu]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      let data: PublicUserProfile | null = null;
      const cleanId = userId.trim();
      const cleanUsername = username.trim();

      if (cleanId) {
        data = await fetchPublicProfileByIdApi(cleanId);
        if (!data && cleanUsername) {
          data = await fetchPublicProfileByUsernameApi(cleanUsername);
        }
      } else if (cleanUsername) {
        if (/^[0-9a-fA-F]{24}$/.test(cleanUsername)) {
          data = await fetchPublicProfileByIdApi(cleanUsername);
        }
        if (!data) {
          data = await fetchPublicProfileByUsernameApi(cleanUsername);
        }
      }

      if (!mounted) return;

      if (data) {
        setProfile(data);
        setReviewsList(data.user.reviews || []);
        setAvgRating(data.user.avgRating || data.stats.avgRating || 0);
        setRatingsCount(data.user.ratingsCount ?? data.stats.ratingsCount ?? (data.user.reviews?.length || 0));

        const cols = await fetchUserPublicCollectionsApi(data.user._id);
        if (mounted) setCollections(cols);
      } else {
        setError("This creator profile could not be found.");
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [username, userId]);

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#070b14] text-white flex flex-col ${styles.page}`}>
        <div className="border-b border-white/10 px-6 py-4 bg-[#0a0e17] flex items-center justify-between">
          <Link href="/templates/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Explore templates</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading creator profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen bg-[#070b14] text-white flex flex-col ${styles.page}`}>
        <div className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Explore templates</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-3xl">person_off</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Creator not found</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The creator profile you’re looking for may no longer be available.
          </p>
          <Link
            href="/templates/"
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
          >
            Back to collection
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, templates = [] } = profile;
  const isSelf = Boolean(currentUserId && String(user._id) === currentUserId);
  const canonicalCreatorUrl = user.username
    ? `/creator/?username=${encodeURIComponent(user.username)}`
    : `/creator/?id=${encodeURIComponent(user._id)}`;

  const handleScrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      reviewInputRef.current?.focus();
    }, 350);
  };

  const handleOpenCreatorReport = () => {
    setOpenProfileMenu(false);
    setReportModalData({
      isOpen: true,
      targetType: "CREATOR",
      targetId: user._id,
      targetTitle: user.username ? `${user.name} (@${user.username})` : user.name,
      targetUrl: canonicalCreatorUrl,
    });
  };

  const handleCopyProfileLink = async () => {
    setOpenProfileMenu(false);
    try {
      const fullUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${canonicalCreatorUrl}`
          : canonicalCreatorUrl;
      await navigator.clipboard.writeText(fullUrl);
      setProfileCopied(true);
      setTimeout(() => setProfileCopied(false), 2000);
    } catch {
      // Ignore clipboard failures silently
    }
  };

  const handleSubmitCreatorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewMessage(null);

    const res = await addCreatorReviewApi(user._id, userRating, userComment);
    setSubmittingReview(false);

    if (res.success && res.data) {
      setAvgRating(res.data.avgRating);
      setRatingsCount(res.data.ratingsCount);
      setReviewsList(res.data.reviews || []);
      setUserComment("");
      setReviewMessage({ text: "Your review was submitted." });
    } else {
      setReviewMessage({
        text: "Couldn’t submit your review. Please sign in and try again.",
        error: true,
      });
    }
  };

  const handleDeleteCreatorReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review from the creator profile?")) {
      return;
    }
    setDeletingReviewId(reviewId);
    const res = await deleteCreatorReviewApi(user._id, reviewId);
    setDeletingReviewId(null);

    if (res.success && res.data) {
      setAvgRating(res.data.avgRating);
      setRatingsCount(res.data.ratingsCount);
      setReviewsList(res.data.reviews || []);
    } else {
      alert("Couldn’t delete the review. Please try again.");
    }
  };

  return (
    <div className={`min-h-screen bg-[#070b14] text-white flex flex-col ${styles.page}`}>
      {/* Profile Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-rose-500/8 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 left-1/2 w-[600px] h-40 bg-gradient-to-t from-[#070b14] to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <UserAvatar
                picture={user.picture}
                googlePicture={user.googlePicture}
                name={user.name}
                size={112}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-[#070b14]" />
            </div>

            {/* Identity & Actions */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <span className={`material-symbols-rounded text-sm ${styles.star}`}>star</span>
                  <span>{avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : "New"}</span>
                  <span className="text-slate-400 font-normal">
                          ({ratingsCount} {ratingsCount === 1 ? "review" : "reviews"})
                  </span>
                </span>
              </div>

              {user.username && (
                <p className="text-sm text-red-400 font-medium mt-0.5">@{user.username}</p>
              )}

              {/* Primary Creator Actions: Follow, Rate Creator, Report Creator */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3.5">
                <FollowCreator creatorId={user._id} />

                {!isSelf && (
                  <button
                    type="button"
                    onClick={handleScrollToReviews}
                    className="px-3.5 py-1.5 rounded-full border border-amber-500/30 hover:border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Rate and review this creator"
                  >
                    <span className={`material-symbols-rounded text-sm ${styles.star}`}>star</span>
                    <span>Rate creator</span>
                  </button>
                )}

                {!isAdmin && !isSelf && (
                  <button
                    type="button"
                    onClick={handleOpenCreatorReport}
                    className="px-3.5 py-1.5 rounded-full border border-white/10 hover:border-red-500/40 bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Report this creator"
                  >
                    <span className="material-symbols-rounded text-sm text-rose-400">flag</span>
                    <span>Report creator</span>
                  </button>
                )}

                {isSelf && (
                  <Link
                    href="/profile/"
                    className="px-3.5 py-1.5 rounded-full border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span>
                    <span>Edit your profile</span>
                  </Link>
                )}

                {/* Three-dots Option Menu */}
                <div className="relative" data-creator-profile-menu>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenProfileMenu((prev) => !prev);
                    }}
                    className="w-8 h-8 rounded-full border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Creator profile options"
                    aria-label="Creator profile options"
                  >
                    <span className="material-symbols-rounded text-base">more_vert</span>
                  </button>

                  {openProfileMenu && (
                    <div className="absolute right-0 sm:left-0 top-full mt-2 w-52 rounded-xl bg-slate-900 border border-white/15 shadow-2xl py-1.5 z-40 text-left">
                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-rounded text-sm text-slate-400">link</span>
                        <span>{profileCopied ? "Link copied!" : "Copy profile link"}</span>
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenProfileMenu(false);
                            handleScrollToReviews();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">star</span>
                          <span>Rate creator</span>
                        </button>
                      )}

                      {!isAdmin && !isSelf && (
                        <button
                          type="button"
                          onClick={handleOpenCreatorReport}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer border-t border-white/10 mt-1 pt-2"
                        >
                          <span className="material-symbols-rounded text-sm">flag</span>
                          <span>Report creator</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {user.jobRole && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2.5 text-xs text-slate-400">
                  <span className="material-symbols-rounded text-xs">work</span>
                  <span>{user.jobRole}</span>
                </div>
              )}

              {user.bio && (
                <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-xl whitespace-pre-line">
                  {user.bio}
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="material-symbols-rounded text-xs">calendar_today</span>
                <span>Joined {timeAgo(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8">
            {[
              { label: "Designs", value: formatNumber(stats.totalDesigns), icon: "palette", color: "text-red-400 bg-red-500/10 border-red-500/20" },
              {
                label: `Reviews (${ratingsCount})`,
                value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—",
                icon: "star",
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
              },
              { label: "Likes", value: formatNumber(stats.totalLikes), icon: "favorite", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
              { label: "Remixes", value: formatNumber(stats.totalForks), icon: "content_copy", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Views", value: formatNumber(stats.totalViews), icon: "visibility", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-xl border ${stat.color} text-center transition-transform hover:scale-[1.02]`}
              >
                <span className={`material-symbols-rounded text-lg ${stat.color.split(" ")[0]} ${stat.icon === "star" ? styles.star : ""}`}>
                  {stat.icon}
                </span>
                <div className="text-xl font-extrabold text-white mt-1">
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content: Creator Reviews + Portfolio */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 pb-16 space-y-10">
        {/* Creator Rating & Review Section */}
        <section
          id="creator-reviews"
          ref={reviewsSectionRef}
          className="scroll-mt-20 rounded-2xl bg-[#0e1422] border border-white/10 p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-400 text-xl">reviews</span>
              <h2 className="text-base font-bold text-white">
                Reviews & feedback
              </h2>
              <span className="text-xs text-slate-400">({ratingsCount})</span>
            </div>

            <div className="flex items-center gap-2">
              {avgRating > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <span className={`material-symbols-rounded text-sm ${styles.star}`}>star</span>
                  <span>{avgRating.toFixed(1)} / 5</span>
                </span>
              )}
              {!isAdmin && !isSelf && (
                <button
                  type="button"
                  onClick={handleOpenCreatorReport}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-rounded text-xs">flag</span>
                  <span>Report content</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Creator Review Form */}
          {isSelf ? (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 flex items-center gap-2">
              <span className="material-symbols-rounded text-base text-slate-400">info</span>
              <span>This is your public profile. Other users can leave a review here.</span>
            </div>
          ) : !isSignedIn ? (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">
                Sign in to rate and review <strong>{user.name}</strong>.
              </span>
              <Link
                href="/login/"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shrink-0"
              >
                Sign in to review
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitCreatorReview}
              className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300">
                  How would you rate {user.name}?
                </span>
                <div className="flex items-center gap-1" role="group" aria-label="Choose a star rating">
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
                        aria-label={`${star} stars`}
                      >
                        <span
                          className={`material-symbols-rounded text-xl ${
                            active ? styles.star : styles.starOutline
                          }`}
                        >
                          star
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  ref={reviewInputRef}
                  type="text"
                  placeholder="Share your thoughts on this creator’s style and designs (optional)…"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  maxLength={500}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 focus:border-amber-400/60 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={submittingReview || userRating === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 disabled:opacity-50 text-xs font-bold text-white shrink-0 transition-all cursor-pointer"
                >
                  {submittingReview ? "Submitting…" : "Submit review"}
                </button>
              </div>

              {reviewMessage && (
                <div
                  className={`text-xs px-3 py-2 rounded-xl ${
                    reviewMessage.error
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}
            </form>
          )}

          {/* Reviews List */}
          {reviewsList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No reviews for {user.name} yet. Be the first to leave one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviewsList.map((rev, idx) => {
                const reviewId =
                  rev._id || `${user._id}-creator-review-${idx}`;
                const reviewerHref = getCreatorProfileHref(rev.user, rev.userName);
                const isOwnReview = Boolean(currentUserId && String(rev.user) === currentUserId);

                return (
                  <div
                    key={reviewId}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {reviewerHref ? (
                        <Link
                          href={reviewerHref}
                          className="flex items-center gap-2 min-w-0 hover:opacity-85 transition-opacity"
                        >
                          {rev.userAvatar ? (
                            <img
                              src={rev.userAvatar}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-white/15 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {rev.userName?.[0] || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-white truncate block hover:underline">
                              {rev.userName}
                            </span>
                            {rev.createdAt && (
                              <span className="text-[10px] text-slate-500 block">
                                {timeAgo(rev.createdAt)}
                              </span>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {rev.userName?.[0] || "U"}
                          </div>
                          <span className="font-semibold text-white truncate">{rev.userName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <span key={i} className="material-symbols-rounded rating-star-filled text-sm">
                              star
                            </span>
                          ))}
                        </div>

                        {(isAdmin || isOwnReview) && (
                          <button
                            type="button"
                            disabled={deletingReviewId === reviewId}
                            onClick={() => handleDeleteCreatorReview(reviewId)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                            title="Delete this review"
                          >
                            <span className="material-symbols-rounded text-sm">delete</span>
                          </button>
                        )}

                        {!isAdmin && !isOwnReview && (
                          <div className="relative" data-creator-review-menu>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenReviewMenu(openReviewMenu === reviewId ? null : reviewId);
                              }}
                              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                              title="Review options"
                            >
                              <span className="material-symbols-rounded text-sm">more_vert</span>
                            </button>
                            {openReviewMenu === reviewId && (
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-slate-800 border border-white/15 shadow-2xl py-1 z-30">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenReviewMenu(null);
                                    setReportModalData({
                                      isOpen: true,
                                      targetType: "review",
                                      targetId: `${user._id}-creator-review-${idx}`,
                                      targetTitle: `Review by ${rev.userName || "user"} on ${user.name}’s creator profile`,
                                      targetUrl: canonicalCreatorUrl,
                                    });
                                  }}
                                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:bg-white/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
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

                    {rev.comment && (
                      <p className="text-slate-300 leading-relaxed pl-9">{rev.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Portfolio Tabs: Designs & Collections */}
        <section>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit mb-6">
            <button
              onClick={() => setActiveTab("designs")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "designs"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-rounded text-sm">palette</span>
              <span>Designs ({templates.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "collections"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-rounded text-sm">collections_bookmark</span>
              <span>Collections ({collections.length})</span>
            </button>
          </div>

          {activeTab === "designs" && (
            <>
              {templates.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-[#0e1422]/60 border border-white/5">
                  <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                    palette
                  </span>
                  <p className="text-xs text-slate-500">
                    {user.name} has no public designs yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {templates.map((tpl) => {
                    const tplItem: TemplateItem = {
                      ...tpl,
                      docData: tpl.docData ?? null,
                      author: tpl.author || {
                        _id: user._id,
                        name: user.name,
                        username: user.username,
                        picture: user.picture,
                      },
                      authorName: tpl.authorName || user.name,
                      authorAvatar: tpl.authorAvatar || user.picture,
                    };

                    return (
                      <button
                        key={tpl._id}
                        type="button"
                        onClick={() => setSelectedTemplate(tplItem)}
                        className="text-left group rounded-xl bg-[#0e1422] border border-white/10 hover:border-red-500/40 overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] cursor-pointer"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                          <DesignThumbnail
                            docData={tpl.docData}
                            thumbnailUrl={tpl.thumbnailUrl}
                            title={tpl.title}
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-black/60 text-red-400 border border-white/10 backdrop-blur-sm">
                            {formatCategoryLabel(tpl.category)}
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {tpl.title}
                          </h3>
                          {tpl.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {tpl.description}
                            </p>
                          )}
                          {tpl.tags && tpl.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tpl.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-slate-400 border border-white/5"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {tpl.tags.length > 3 && (
                                <span className="text-[9px] text-slate-500">
                                  +{tpl.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-white/5">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-rounded text-xs text-rose-400">
                                favorite
                              </span>
                              {tpl.likesCount}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-rounded text-xs text-emerald-400">
                                content_copy
                              </span>
                              {tpl.forksCount}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-rounded text-xs text-blue-400">
                                visibility
                              </span>
                              {tpl.viewsCount}
                            </span>
                            {tpl.avgRating > 0 && (
                              <span className="flex items-center gap-0.5 ml-auto">
                                <span className={`material-symbols-rounded text-xs text-amber-400 ${styles.star}`}>
                                  star
                                </span>
                                {tpl.avgRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "collections" && (
            <>
              {collections.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-[#0e1422]/60 border border-white/5">
                  <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                    collections_bookmark
                  </span>
                  <p className="text-xs text-slate-500">
                    {user.name} has no public collections yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {collections.map((col) => (
                    <CollectionCard key={col._id} collection={col} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#05080e] px-4 sm:px-8 py-8 text-center text-xs text-slate-500 mt-auto">
        <p>PickMe3D Platform • Public profile of {user.username ? `@${user.username}` : user.name}</p>
      </footer>

      {/* Template Detail Modal when clicking one of Creator's designs */}
      <TemplateDetailModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onTemplateUpdated={(updated) => {
          setSelectedTemplate(updated);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  templates: (prev.templates || []).map((t) =>
                    t._id === (updated._id || updated.id) ? { ...t, ...updated } : t
                  ),
                }
              : prev
          );
        }}
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

export default CreatorProfileClient;
