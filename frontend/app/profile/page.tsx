"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TemplateItem,
  fetchMyDesignsApi,
  updateDesignApi,
  deleteDesignApi,
  prepareEditorSession,
} from "@/lib/templateService";
import NotificationBell from "@/components/NotificationBell";
import { CollectionCard } from "@/components/CollectionManager";
import {
  CollectionItem,
  fetchMyCollectionsApi,
  deleteCollectionApi,
} from "@/lib/collectionService";
import { updateMyProfileApi } from "@/lib/userService";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [designs, setDesigns] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "public" | "private">("all");
  const [searchTag, setSearchTag] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit profile modal/state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Bio & Username editing
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  // Profile tab: designs | collections
  const [profileTab, setProfileTab] = useState<"designs" | "collections">("designs");
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("pickme3d_user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const u = JSON.parse(storedUser);
    setUser(u);
    setEditName(u.name || "");
    setEditBio(u.bio || "");
    setEditUsername(u.username || "");

    loadDesigns();
    loadCollections();
  }, [router]);

  const loadDesigns = async () => {
    setLoading(true);
    const list = await fetchMyDesignsApi();
    setDesigns(list);
    setLoading(false);
  };

  // Toggle Public / Private
  const handleTogglePrivacy = async (design: TemplateItem) => {
    const id = (design._id || design.id)!;
    const newStatus = !design.isPublic;

    // Optimistic UI update
    setDesigns((prev) =>
      prev.map((d) =>
        ((d._id || d.id) === id ? { ...d, isPublic: newStatus } : d)
      )
    );

    const res = await updateDesignApi(id, { isPublic: newStatus });
    if (res.success) {
      showToast(
        newStatus
          ? "Đã công khai thiết kế lên Bộ sưu tập mẫu! 🌐"
          : "Đã chuyển thiết kế sang chế độ riêng tư 🔒"
      );
    } else {
      showToast("Đã lưu trạng thái (chế độ cục bộ)!");
    }
  };

  // Add hashtag to design
  const handleAddTag = async (designId: string) => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, "");
    const design = designs.find((d) => (d._id || d.id) === designId);
    if (!design) return;

    if (design.tags?.includes(cleanTag)) {
      setNewTagInput("");
      setEditingTagId(null);
      return;
    }

    const updatedTags = [...(design.tags || []), cleanTag];
    setDesigns((prev) =>
      prev.map((d) =>
        ((d._id || d.id) === designId ? { ...d, tags: updatedTags } : d)
      )
    );

    setNewTagInput("");
    setEditingTagId(null);

    await updateDesignApi(designId, { tags: updatedTags });
    showToast(`Đã thêm hashtag #${cleanTag}!`);
  };

  // Remove hashtag
  const handleRemoveTag = async (designId: string, tagToRemove: string) => {
    const design = designs.find((d) => (d._id || d.id) === designId);
    if (!design) return;

    const updatedTags = (design.tags || []).filter((t) => t !== tagToRemove);
    setDesigns((prev) =>
      prev.map((d) =>
        ((d._id || d.id) === designId ? { ...d, tags: updatedTags } : d)
      )
    );

    await updateDesignApi(designId, { tags: updatedTags });
    showToast(`Đã xóa hashtag #${tagToRemove}`);
  };

  const handleEditDesign = (design: TemplateItem) => {
    prepareEditorSession(design, true);
    const designId = (design._id || design.id)!;
    router.push(`/editor?editId=${designId}`);
  };

  // Delete design
  const handleDeleteDesign = async (id: string) => {
    await deleteDesignApi(id);
    setDesigns((prev) => prev.filter((d) => (d._id || d.id) !== id));
    setDeleteConfirmId(null);
    showToast("Đã xóa thiết kế thành công!");
  };

  // Save profile name
  const handleSaveProfileName = async () => {
    if (!editName.trim() || editName === user.name) {
      setIsEditingName(false);
      return;
    }
    setSavingProfile(true);
    try {
      const token = localStorage.getItem("pickme3d_token");
      if (token) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/users/profile`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: editName.trim() }),
          }
        );
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          localStorage.setItem("pickme3d_user", JSON.stringify(data.data));
          showToast("Đã cập nhật tên tài khoản!");
        }
      } else {
        const updated = { ...user, name: editName.trim() };
        setUser(updated);
        localStorage.setItem("pickme3d_user", JSON.stringify(updated));
        showToast("Đã lưu tên tài khoản!");
      }
    } catch {
      showToast("Không thể cập nhật tên lúc này.");
    } finally {
      setSavingProfile(false);
      setIsEditingName(false);
    }
  };

  // Save bio and username
  const handleSaveBio = async () => {
    setSavingBio(true);
    const updates: Record<string, string> = {};
    if (editBio !== (user.bio || "")) updates.bio = editBio.trim();
    if (editUsername !== (user.username || "")) updates.username = editUsername.trim();

    if (Object.keys(updates).length === 0) {
      setIsEditingBio(false);
      setSavingBio(false);
      return;
    }

    const res = await updateMyProfileApi(updates);
    if (res.success && res.data) {
      setUser(res.data);
      localStorage.setItem("pickme3d_user", JSON.stringify(res.data));
      showToast("Đã cập nhật hồ sơ!");
    } else {
      showToast(res.message || "Không thể cập nhật hồ sơ.");
    }
    setSavingBio(false);
    setIsEditingBio(false);
  };

  // Load collections
  const loadCollections = async () => {
    setLoadingCollections(true);
    const cols = await fetchMyCollectionsApi();
    setCollections(cols);
    setLoadingCollections(false);
  };

  // Delete collection
  const handleDeleteCollection = async (id: string) => {
    const ok = await deleteCollectionApi(id);
    if (ok) {
      setCollections((prev) => prev.filter((c) => c._id !== id));
      showToast("Đã xóa bộ sưu tập!");
    } else {
      showToast("Không thể xóa bộ sưu tập.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    router.push("/");
  };

  // Filtered designs
  const filteredDesigns = designs.filter((item) => {
    if (filterMode === "public" && !item.isPublic) return false;
    if (filterMode === "private" && item.isPublic) return false;
    if (searchTag.trim()) {
      const q = searchTag.trim().toLowerCase().replace(/^#/, "");
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchTag;
    }
    return true;
  });

  const publicCount = designs.filter((d) => d.isPublic).length;
  const privateCount = designs.filter((d) => !d.isPublic).length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col selection:bg-red-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-semibold shadow-[0_4px_25px_rgba(229,43,43,0.5)] border border-white/20 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-rounded text-sm">notifications</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#090d16]/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
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
                Creator Profile
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">
              Trang chủ
            </Link>
            <Link href="/templates" className="hover:text-white transition-colors flex items-center gap-1">
              <span>Bộ sưu tập mẫu</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </Link>

          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link
            href="/editor"
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-xs font-bold text-white shadow-[0_0_20px_rgba(229,43,43,0.4)] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-rounded text-sm">draw</span>
            <span>Vào Canvas Editor</span>
          </Link>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-full border border-white/15 hover:border-red-500/50 bg-white/5 hover:bg-red-500/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1"
            title="Đăng xuất"
          >
            <span className="material-symbols-rounded text-sm">logout</span>
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 space-y-8">
        {/* User Profile Banner & Info */}
        <section className="relative rounded-3xl bg-[#0f1626]/90 border border-white/15 p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Background Glows */}
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-red-600/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-rose-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Avatar & Details */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-red-500/80 shadow-[0_0_25px_rgba(229,43,43,0.4)]"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-2 border-white/20">
                    {user.name ? user.name[0] : "U"}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0f1626] flex items-center justify-center" title="Trực tuyến">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1 bg-black/40 border border-red-500/60 rounded-lg text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveProfileName}
                        disabled={savingProfile}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                      >
                        {savingProfile ? "Lưu..." : "Lưu"}
                      </button>
                      <button
                        onClick={() => {
                          setEditName(user.name);
                          setIsEditingName(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-xs text-slate-300"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        {user.name}
                      </h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Chỉnh sửa tên"
                      >
                        <span className="material-symbols-rounded text-sm">edit</span>
                      </button>
                    </>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                    {user.role === "admin" ? "ADMIN CREATOR" : "FASHION CREATOR"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                  <span className="material-symbols-rounded text-xs text-slate-500">mail</span>
                  {user.email}
                </p>

                <p className="text-xs text-slate-400">
                  {user.jobRole || "Nhà thiết kế trang phục 3D & Thời trang số"}
                </p>

                {/* Bio */}
                {isEditingBio ? (
                  <div className="mt-2 space-y-2 max-w-md">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-mono">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="vd: fashionista_99"
                        className="w-full mt-0.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-mono">Giới thiệu</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Viết một vài dòng giới thiệu về bạn..."
                        className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 resize-none"
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingBio ? "Đang lưu..." : "Lưu hồ sơ"}
                      </button>
                      <button
                        onClick={() => {
                          setEditBio(user.bio || "");
                          setEditUsername(user.username || "");
                          setIsEditingBio(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-slate-300"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {user.username && (
                      <p className="text-xs text-red-400 font-medium mb-0.5">@{user.username}</p>
                    )}
                    {user.bio && (
                      <p className="text-xs text-slate-300 leading-relaxed max-w-md whitespace-pre-line">{user.bio}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => setIsEditingBio(true)}
                        className="text-[11px] text-slate-500 hover:text-white flex items-center gap-0.5 transition-colors"
                      >
                        <span className="material-symbols-rounded text-xs">edit</span>
                        <span>{user.bio ? "Chỉnh sửa hồ sơ" : "Thêm bio & username"}</span>
                      </button>
                      {user.username && (
                        <Link
                          href={`/creator/${user.username}`}
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition-colors"
                        >
                          <span className="material-symbols-rounded text-xs">open_in_new</span>
                          <span>Xem hồ sơ công khai</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Pill Cards */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="block text-xl font-bold text-white">{designs.length}</span>
                <span className="text-[11px] text-slate-400 uppercase font-mono">Tác phẩm</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="block text-xl font-bold text-emerald-400">{publicCount}</span>
                <span className="text-[11px] text-slate-400 uppercase font-mono">Công khai</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="block text-xl font-bold text-amber-400">{collections.length}</span>
                <span className="text-[11px] text-slate-400 uppercase font-mono">BST</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Switcher: Designs | Collections */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          <button
            onClick={() => setProfileTab("designs")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              profileTab === "designs"
                ? "bg-red-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-sm">palette</span>
            <span>Thiết kế ({designs.length})</span>
          </button>
          <button
            onClick={() => setProfileTab("collections")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              profileTab === "collections"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-sm">collections_bookmark</span>
            <span>Bộ sưu tập ({collections.length})</span>
          </button>
        </div>

        {/* Section: My Designs (visible when designs tab active) */}
        {profileTab === "designs" && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-red-400">inventory_2</span>
                <span>Các mẫu đã chỉnh sửa ({designs.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quản lý quyền công khai/riêng tư và gắn hashtag cho từng thiết kế của bạn.
              </p>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter tabs */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === "all"
                      ? "bg-red-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tất cả ({designs.length})
                </button>
                <button
                  onClick={() => setFilterMode("public")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === "public"
                      ? "bg-emerald-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Công khai ({publicCount})
                </button>
                <button
                  onClick={() => setFilterMode("private")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === "private"
                      ? "bg-amber-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Riêng tư ({privateCount})
                </button>
              </div>

              {/* Tag / Title search input */}
              <div className="relative">
                <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Lọc theo hashtag/tên..."
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 w-44 sm:w-56"
                />
              </div>

              {/* Create new design button */}
              <Link
                href="/editor"
                className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-rounded text-sm">add</span>
                <span>Tạo mới</span>
              </Link>
            </div>
          </div>

          {/* Design Cards Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Đang tải danh sách thiết kế của bạn...</p>
            </div>
          ) : filteredDesigns.length === 0 ? (
            <div className="py-16 px-4 rounded-3xl bg-[#0f1626]/40 border border-white/10 text-center max-w-lg mx-auto space-y-4">
              <span className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl text-slate-400 mx-auto">
                🎨
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Chưa có thiết kế nào phù hợp</h3>
                <p className="text-xs text-slate-400">
                  {searchTag
                    ? "Không tìm thấy thiết kế với từ khóa này. Hãy thử tìm hashtag khác."
                    : "Bạn chưa có tác phẩm nào đã lưu. Hãy vào Canvas Editor và bấm 'Lưu thiết kế'!"}
                </p>
              </div>
              <Link
                href="/editor"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-lg hover:opacity-95 transition-all"
              >
                <span className="material-symbols-rounded text-sm">draw</span>
                <span>Vào Canvas Editor ngay</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDesigns.map((design) => {
                const designId = (design._id || design.id)!;

                return (
                  <div
                    key={designId}
                    className="flex flex-col rounded-2xl bg-[#0f1626]/80 border border-white/10 hover:border-white/25 transition-all overflow-hidden backdrop-blur-md shadow-lg group"
                  >
                    {/* Thumbnail & Privacy Header */}
                    <div className="relative w-full aspect-[16/10] bg-slate-900 overflow-hidden">
                      <img
                        src={design.thumbnailUrl || "/hero/card-couture.png"}
                        alt={design.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1626] via-transparent to-black/40" />

                      {/* Public / Private Badge & Toggle Button */}
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePrivacy(design)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md ${
                            design.isPublic
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30"
                          }`}
                          title={
                            design.isPublic
                              ? "Click để chuyển sang Riêng tư (Private)"
                              : "Click để Công khai lên Bộ sưu tập mẫu (Public)"
                          }
                        >
                          <span className="material-symbols-rounded text-xs">
                            {design.isPublic ? "public" : "lock"}
                          </span>
                          <span>{design.isPublic ? "Công khai" : "Riêng tư"}</span>
                          <span className="material-symbols-rounded text-xs opacity-70">
                            sync_alt
                          </span>
                        </button>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-black/60 text-slate-300 border border-white/10 backdrop-blur-md">
                          {design.category || "Outfit"}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-base font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors"
                            title={design.title}
                          >
                            {design.title}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {design.description || "Bản thiết kế thời trang từ PickMe3D Canvas Editor."}
                        </p>
                      </div>

                      {/* Hashtags Section */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono uppercase text-[10px] flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs text-red-400">tag</span>
                            <span>Hashtags:</span>
                          </span>
                          {editingTagId !== designId && (
                            <button
                              onClick={() => {
                                setEditingTagId(designId);
                                setNewTagInput("");
                              }}
                              className="text-red-400 hover:text-red-300 flex items-center gap-0.5"
                            >
                              <span className="material-symbols-rounded text-xs">add</span>
                              <span>Thêm tag</span>
                            </button>
                          )}
                        </div>

                        {/* List of tags */}
                        <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
                          {design.tags && design.tags.length > 0 ? (
                            design.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 group/tag"
                              >
                                <span>#{tag}</span>
                                <button
                                  onClick={() => handleRemoveTag(designId, tag)}
                                  className="text-slate-500 hover:text-red-400 transition-colors leading-none"
                                  title={`Xóa #${tag}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Chưa gắn hashtag</span>
                          )}

                          {/* Tag Input Form if editing */}
                          {editingTagId === designId && (
                            <div className="flex items-center gap-1 mt-1 w-full">
                              <input
                                type="text"
                                placeholder="Nhập tag (VD: summer)..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddTag(designId);
                                  if (e.key === "Escape") setEditingTagId(null);
                                }}
                                className="px-2 py-0.5 rounded-md bg-black/50 border border-red-500/60 text-xs text-white focus:outline-none flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddTag(designId)}
                                className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-semibold"
                              >
                                Thêm
                              </button>
                              <button
                                onClick={() => setEditingTagId(null)}
                                className="px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 text-[11px]"
                              >
                                Hủy
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        {/* Open in Canvas Editor */}
                        <button
                          type="button"
                          onClick={() => handleEditDesign(design)}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md flex-1 justify-center transition-colors cursor-pointer"
                          title="Tải thiết kế này vào Canvas Editor để chỉnh sửa và lưu ghi đè"
                        >
                          <span className="material-symbols-rounded text-sm">draw</span>
                          <span>Chỉnh sửa tiếp</span>
                        </button>

                        {/* View in collection if public */}
                        {design.isPublic && (
                          <Link
                            href={`/templates/${designId}`}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                            title="Xem trang chi tiết công khai"
                          >
                            <span className="material-symbols-rounded text-sm">visibility</span>
                          </Link>
                        )}

                        {/* Delete design button */}
                        {deleteConfirmId === designId ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteDesign(designId)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold"
                              title="Xác nhận xóa"
                            >
                              Xóa?
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 rounded-xl bg-white/10 text-slate-400 text-xs"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(designId)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-all"
                            title="Xóa thiết kế này"
                          >
                            <span className="material-symbols-rounded text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* Section: My Collections (visible when collections tab active) */}
        {profileTab === "collections" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-amber-400">collections_bookmark</span>
                  <span>Bộ Sưu Tập Của Tôi ({collections.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quản lý các bộ sưu tập thiết kế đã ghim của bạn.
                </p>
              </div>
            </div>

            {loadingCollections ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-rounded text-3xl text-slate-600 block mb-2">
                  collections_bookmark
                </span>
                <p className="text-xs text-slate-500 mb-3">
                  Bạn chưa tạo bộ sưu tập nào. Hãy lưu các mẫu yêu thích từ trang chi tiết thiết kế.
                </p>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  <span className="material-symbols-rounded text-sm">explore</span>
                  <span>Khám phá mẫu thiết kế</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {collections.map((col) => (
                  <CollectionCard
                    key={col._id}
                    collection={col}
                    isOwner={true}
                    onDelete={handleDeleteCollection}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
