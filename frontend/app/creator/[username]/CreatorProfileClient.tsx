"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PublicUserProfile,
  fetchPublicProfileByUsernameApi,
} from "@/lib/userService";
import {
  CollectionItem,
  fetchUserPublicCollectionsApi,
} from "@/lib/collectionService";
import { CollectionCard } from "@/components/CollectionManager";
import NotificationBell from "@/components/NotificationBell";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Hôm nay";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

interface CreatorProfileClientProps {
  username: string;
}

function CreatorProfileClient({ username }: CreatorProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"designs" | "collections">("designs");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      const data = await fetchPublicProfileByUsernameApi(username);
      if (!mounted) return;

      if (data) {
        setProfile(data);
        // Fetch public collections
        const cols = await fetchUserPublicCollectionsApi(data.user._id);
        if (mounted) setCollections(cols);
      } else {
        setError("Không tìm thấy trang hồ sơ này.");
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [username]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <header className="border-b border-white/10 px-6 py-4 bg-[#0a0e17] flex items-center justify-between">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Khám phá mẫu</span>
          </Link>
          <NotificationBell />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
        <header className="border-b border-white/10 px-6 py-4 bg-[#0a0e17]">
          <Link href="/templates" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Khám phá mẫu</span>
          </Link>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-3xl">person_off</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Không tìm thấy Creator</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Người dùng @{username} không tồn tại hoặc chưa thiết lập username.
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

  const { user, stats, templates = [] } = profile;

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0e17]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Khám phá</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-slate-200 font-medium">@{user.username || user.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link
            href="/editor"
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-xs font-bold text-white shadow-[0_0_20px_rgba(229,43,43,0.5)] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-rounded text-sm">draw</span>
            <span>Vào Canvas</span>
          </Link>
        </div>
      </header>

      {/* Profile Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-rose-500/8 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 left-1/2 w-[600px] h-40 bg-gradient-to-t from-[#070b14] to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-12 pb-8">
          {/* Avatar + Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-slate-800 shadow-2xl">
                  {user.name?.[0] || "?"}
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-[#070b14]" />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {user.name}
              </h1>
              {user.username && (
                <p className="text-sm text-red-400 font-medium mt-0.5">@{user.username}</p>
              )}
              {user.jobRole && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5 text-xs text-slate-400">
                  <span className="material-symbols-rounded text-xs">work</span>
                  <span>{user.jobRole}</span>
                </div>
              )}
              {user.bio && (
                <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-lg whitespace-pre-line">
                  {user.bio}
                </p>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="material-symbols-rounded text-xs">calendar_today</span>
                <span>Tham gia {timeAgo(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Thiết kế", value: stats.totalDesigns, icon: "palette", color: "text-red-400 bg-red-500/10 border-red-500/20" },
              { label: "Lượt thích", value: stats.totalLikes, icon: "favorite", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
              { label: "Lượt fork", value: stats.totalForks, icon: "content_copy", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Lượt xem", value: stats.totalViews, icon: "visibility", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-xl border ${stat.color} text-center transition-transform hover:scale-[1.02]`}
              >
                <span className={`material-symbols-rounded text-lg ${stat.color.split(" ")[0]}`}>
                  {stat.icon}
                </span>
                <div className="text-xl font-extrabold text-white mt-1">
                  {formatNumber(stat.value)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-8 pb-16">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit mb-6">
          <button
            onClick={() => setActiveTab("designs")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "designs"
                ? "bg-white/15 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-sm">palette</span>
            <span>Thiết kế ({templates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "collections"
                ? "bg-white/15 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-sm">collections_bookmark</span>
            <span>Bộ sưu tập ({collections.length})</span>
          </button>
        </div>

        {/* Designs Grid */}
        {activeTab === "designs" && (
          <>
            {templates.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                  palette
                </span>
                <p className="text-xs text-slate-500">
                  {user.name} chưa có thiết kế công khai nào.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {templates.map((tpl) => (
                  <Link
                    key={tpl._id}
                    href={`/templates/${tpl._id}`}
                    className="group rounded-xl bg-[#0e1422] border border-white/10 hover:border-red-500/40 overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                      {tpl.thumbnailUrl ? (
                        <img
                          src={tpl.thumbnailUrl}
                          alt={tpl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-rounded text-4xl text-slate-700">view_in_ar</span>
                        </div>
                      )}
                      {/* Category badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-black/60 text-red-400 border border-white/10 backdrop-blur-sm">
                        {tpl.category}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                        {tpl.title}
                      </h3>
                      {tpl.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      )}
                      {/* Tags */}
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
                            <span className="text-[9px] text-slate-500">+{tpl.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      {/* Metrics */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-white/5">
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-rounded text-xs text-rose-400">favorite</span>
                          {tpl.likesCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-rounded text-xs text-emerald-400">content_copy</span>
                          {tpl.forksCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-rounded text-xs text-blue-400">visibility</span>
                          {tpl.viewsCount}
                        </span>
                        {tpl.avgRating > 0 && (
                          <span className="flex items-center gap-0.5 ml-auto">
                            <span className="material-symbols-rounded text-xs text-amber-400">star</span>
                            {tpl.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Collections Grid */}
        {activeTab === "collections" && (
          <>
            {collections.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                  collections_bookmark
                </span>
                <p className="text-xs text-slate-500">
                  {user.name} chưa có bộ sưu tập công khai nào.
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#05080e] px-4 sm:px-8 py-8 text-center text-xs text-slate-500">
        <p>PickMe3D Fashion Platform • Hồ sơ công khai của @{user.username || user.name}</p>
      </footer>
    </div>
  );
}

export default CreatorProfileClient;
