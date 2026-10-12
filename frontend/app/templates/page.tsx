"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { TemplateItem, fetchTemplatesApi } from "@/lib/templateService";
import TemplateCard from "@/components/TemplateCard";
import TemplateDetailModal from "@/components/TemplateDetailModal";

const CATEGORIES = [
  "Tất cả",
  "Haute Couture",
  "Streetwear",
  "Casual",
  "Dạ hội",
];

const SORT_OPTIONS = [
  { key: "trending", label: "Thịnh hành nhất", icon: "local_fire_department" },
  { key: "rating", label: "Đánh giá cao", icon: "star" },
  { key: "likes", label: "Yêu thích nhất", icon: "favorite" },
  { key: "newest", label: "Mới nhất", icon: "schedule" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("trending");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("pickme3d_user");
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const res = await fetchTemplatesApi({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      if (isMounted) {
        setTemplates(res.templates);
        setIsOfflineMode(!!res.isOffline);
        setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col selection:bg-red-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#090d16]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(229,43,43,0.5)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-rounded text-lg text-white">view_in_ar</span>
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PICK ME 3D
              </span>
              <span className="text-[9px] font-mono tracking-widest text-red-400 uppercase">
                Collection
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">
              Trang chủ
            </Link>
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Bộ sưu tập mẫu
            </span>

          </nav>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 hover:border-red-500/50 text-xs text-slate-200 hover:text-white transition-all group"
              title="Xem trang Profile cá nhân"
            >
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="" className="w-5 h-5 rounded-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {currentUser.name ? currentUser.name[0] : "U"}
                </span>
              )}
              <span className="font-medium max-w-[110px] truncate">{currentUser.name || "Hồ sơ"}</span>
            </Link>
          )}

          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-full border border-white/15 hover:border-white/30 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>

          <Link
            href="/editor"
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-xs font-bold text-white shadow-[0_0_20px_rgba(229,43,43,0.5)] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-rounded text-sm">draw</span>
            <span>Vào Canvas Editor</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 pb-8 max-w-7xl mx-auto w-full">
        {/* Glow Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>COMMUNITY SHOWCASE & TEMPLATES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Khám Phá Bộ Sưu Tập Mẫu Thời Trang 3D
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Duyệt các mẫu thiết kế có sẵn từ cộng đồng PickMe3D. Bạn có thể xem chi tiết
            từng mẫu phối đồ, tải về hoặc mở trực tiếp trên Canvas để tiếp tục sáng tạo.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <span className="material-symbols-rounded absolute left-4 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm mẫu theo tên, phong cách (Haute Couture, Cyberpunk, lụa...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/5 border border-white/15 focus:border-red-500/60 focus:bg-[#0c1220] text-sm text-white placeholder:text-slate-500 outline-none backdrop-blur-md transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Pills & Sort Controls */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-red-600 text-white shadow-[0_0_15px_rgba(229,43,43,0.4)]"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sorting Dropdown / Tabs */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  sortBy === opt.key
                    ? "bg-white/15 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={opt.label}
              >
                <span className="material-symbols-rounded text-xs">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <main className="flex-1 px-4 sm:px-8 pb-16 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-red-500 border-r-white" />
            <span className="text-xs font-mono">Đang tải bộ sưu tập...</span>
          </div>
        ) : templates.length === 0 ? (
          searchQuery || selectedCategory !== "Tất cả" ? (
            <div className="py-20 text-center space-y-3">
              <span className="material-symbols-rounded text-4xl text-slate-500">search_off</span>
              <h3 className="text-base font-semibold text-white">Không tìm thấy mẫu phù hợp</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Không có mẫu nào khớp với bộ lọc hiện tại. Hãy thử tìm với từ khóa khác hoặc xóa bộ lọc.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Tất cả");
                }}
                className="mt-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Xem tất cả mẫu
              </button>
            </div>
          ) : (
            <div className="py-24 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <span className="material-symbols-rounded text-3xl">style</span>
              </div>
              <h3 className="text-lg font-bold text-white">Chưa có thiết kế công khai nào</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tất cả các bản thiết kế được bạn hoặc thành viên cộng đồng lưu ở chế độ <strong>Công khai (Public)</strong> sẽ hiển thị tại đây. Mọi người có thể <strong>Cover lại mẫu</strong> hoặc <strong>Đánh giá</strong> cho từng thiết kế.
              </p>
              <div className="pt-2">
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all"
                >
                  <span className="material-symbols-rounded text-sm">draw</span>
                  <span>Tạo thiết kế đầu tiên trong Canvas Editor</span>
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id || template._id || template.title}
                template={template}
                onSelect={(tpl) => setSelectedTemplate(tpl)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal Component */}
      <TemplateDetailModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onTemplateUpdated={(updated) => {
          setSelectedTemplate(updated);
          setTemplates((prev) =>
            prev.map((t) => ((t._id || t.id) === (updated._id || updated.id) ? updated : t))
          );
        }}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#05080e] px-4 sm:px-8 py-8 text-center text-xs text-slate-500">
        <p>PickMe3D Fashion Platform • Hệ thống trưng bày mẫu thiết kế 3D cộng đồng</p>
      </footer>
    </div>
  );
}
