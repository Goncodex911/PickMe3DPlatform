"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminTemplatesApi,
  createSystemTemplateApi,
  updateAdminTemplateApi,
  deleteAdminTemplateApi,
  fetchAdminPresentationsApi,
  togglePresentationVisibilityApi,
  deleteAdminPresentationApi,
  AdminTemplate,
  AdminPresentation,
  PaginationMeta,
} from "@/lib/adminService";

const CATEGORIES = [
  "Tất cả",
  "Official 3D Asset",
  "Outfit",
  "Streetwear",
  "Haute Couture",
  "Casual",
  "Dạ hội",
  "Phụ kiện",
];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isSystem, setIsSystem] = useState("all");
  const [isPublic, setIsPublic] = useState("all");

  // Tab switcher: "templates" | "presentations"
  const [activeTab, setActiveTab] = useState<"templates" | "presentations">("templates");
  const [presentations, setPresentations] = useState<AdminPresentation[]>([]);
  const [presentationPagination, setPresentationPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 12 });
  const [loadingPresentations, setLoadingPresentations] = useState(false);
  const [presSearch, setPresSearch] = useState("");
  const [presPublicFilter, setPresPublicFilter] = useState("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalTemplate, setEditModalTemplate] = useState<AdminTemplate | null>(null);
  const [deleteModalTemplate, setDeleteModalTemplate] = useState<AdminTemplate | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form state for Create / Edit
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Official 3D Asset");
  const [formTags, setFormTags] = useState("");
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formIsSystem, setFormIsSystem] = useState(true);


  const loadPresentations = async (page = 1) => {
    setLoadingPresentations(true);
    try {
      const res = await fetchAdminPresentationsApi({
        page,
        limit: 12,
        search: presSearch.trim() || undefined,
        isPublic: presPublicFilter,
      });
      if (res.success && res.data) {
        setPresentations(res.data);
        if (res.pagination) setPresentationPagination(res.pagination);
      }
    } catch (err) {
      console.error("Lỗi khi tải bản trình chiếu:", err);
    } finally {
      setLoadingPresentations(false);
    }
  };

  const handleTogglePresVisibility = async (p: AdminPresentation) => {
    const nextPublic = !p.isPublic;
    const res = await togglePresentationVisibilityApi(p._id, nextPublic);
    if (res.success) {
      setPresentations((prev) =>
        prev.map((item) => (item._id === p._id ? { ...item, isPublic: nextPublic } : item))
      );
    } else {
      alert("Lỗi: " + (res.message || "Không thể cập nhật"));
    }
  };

  const handleDeletePresentation = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản trình chiếu này khỏi hệ thống?")) return;
    const res = await deleteAdminPresentationApi(id);
    if (res.success) {
      setPresentations((prev) => prev.filter((p) => p._id !== id));
      setPresentationPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } else {
      alert("Lỗi: " + (res.message || "Không thể xóa"));
    }
  };

  const loadTemplates = async (page = 1) => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminTemplatesApi({
      page,
      limit: pagination.limit,
      search,
      category,
      isSystem,
      isPublic,
    });

    if (res.success && res.data) {
      setTemplates(res.data);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || "Không thể tải danh sách mẫu thiết kế");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates(1);
  }, [category, isSystem, isPublic]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates(1);
  };

  // 1. Create System Template
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError("Vui lòng nhập tiêu đề mẫu");
      return;
    }

    setActionBusy(true);
    setModalError(null);

    // Minimal valid docData structure compatible with PickMe3D 3D Editor
    const defaultDocData = {
      title: formTitle.trim(),
      brief: formDesc.trim() || "Mẫu hệ thống 3D chính thức",
      frames: [
        {
          id: `frame_${Date.now()}`,
          name: "Main Canvas",
          x: 40,
          y: 40,
          w: 440,
          h: 956,
          bg: "surface",
        },
      ],
      groups: [],
    };

    const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await createSystemTemplateApi({
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      tags: tagsArray,
      thumbnailUrl: formThumbnail.trim(),
      docData: defaultDocData,
      isFeatured: formIsFeatured,
      isPublic: formIsPublic,
    });

    if (res.success) {
      setCreateModalOpen(false);
      resetForm();
      loadTemplates(1);
    } else {
      setModalError(res.message || "Không thể tạo mẫu hệ thống");
    }
    setActionBusy(false);
  };

  // 2. Open Edit Modal
  const openEditModal = (tmpl: AdminTemplate) => {
    setEditModalTemplate(tmpl);
    setFormTitle(tmpl.title);
    setFormDesc(tmpl.description || "");
    setFormCategory(tmpl.category || "Outfit");
    setFormTags((tmpl.tags || []).join(", "));
    setFormThumbnail(tmpl.thumbnailUrl || "");
    setFormIsFeatured(tmpl.isFeatured || false);
    setFormIsPublic(tmpl.isPublic);
    setFormIsSystem(tmpl.isSystem || false);
    setModalError(null);
  };

  // 3. Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTemplate) return;
    if (!formTitle.trim()) {
      setModalError("Tiêu đề không được để trống");
      return;
    }

    setActionBusy(true);
    setModalError(null);

    const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await updateAdminTemplateApi(editModalTemplate._id, {
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      tags: tagsArray,
      thumbnailUrl: formThumbnail.trim(),
      isFeatured: formIsFeatured,
      isPublic: formIsPublic,
      isSystem: formIsSystem,
    });

    if (res.success) {
      setEditModalTemplate(null);
      resetForm();
      loadTemplates(pagination.page);
    } else {
      setModalError(res.message || "Không thể cập nhật mẫu thiết kế");
    }
    setActionBusy(false);
  };

  // 4. Delete Template
  const handleDeleteSubmit = async () => {
    if (!deleteModalTemplate) return;
    setActionBusy(true);
    const res = await deleteAdminTemplateApi(deleteModalTemplate._id);
    if (res.success) {
      setDeleteModalTemplate(null);
      loadTemplates(pagination.page);
    } else {
      alert("Lỗi: " + res.message);
    }
    setActionBusy(false);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("Official 3D Asset");
    setFormTags("");
    setFormThumbnail("");
    setFormIsFeatured(false);
    setFormIsPublic(true);
    setFormIsSystem(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quản Lý Mẫu & Tài Sản 3D
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Quản lý mẫu hệ thống chính thức và kiểm duyệt toàn bộ tài nguyên thiết kế 3D cộng đồng.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
            setModalError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
        >
          <span className="material-symbols-rounded text-lg">add_box</span>
          Tạo Mẫu Hệ Thống Mới
        </button>
      </div>

      {/* Tab Switcher: 3D Templates vs Slide Presentations */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "templates"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
          }`}
        >
          <span className="material-symbols-rounded text-base">view_in_ar</span>
          <span>Mẫu 3D Canvas ({pagination.total})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("presentations");
            loadPresentations(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "presentations"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
          }`}
        >
          <span className="material-symbols-rounded text-base">slideshow</span>
          <span>Bản Trình Chiếu Slide Studio ({presentationPagination.total})</span>
        </button>
      </div>

      {activeTab === "presentations" ? (
        <div className="space-y-6">
          {/* Presentations Filters */}
          <div className="p-4 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm bản trình chiếu theo tiêu đề hoặc tác giả..."
                  value={presSearch}
                  onChange={(e) => setPresSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadPresentations(1);
                  }}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700/60 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={() => loadPresentations(1)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Tìm
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Hiển thị:</span>
              <select
                value={presPublicFilter}
                onChange={(e) => {
                  setPresPublicFilter(e.target.value);
                  setTimeout(() => loadPresentations(1), 0);
                }}
                className="bg-[#1b2030] border border-neutral-700/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="true">Công khai</option>
                <option value="false">Riêng tư</option>
              </select>
            </div>
          </div>

          {/* Presentations Grid */}
          {loadingPresentations ? (
            <div className="p-16 text-center text-neutral-400 text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-3" />
              Đang tải danh sách bài trình chiếu...
            </div>
          ) : presentations.length === 0 ? (
            <div className="p-16 text-center text-neutral-400 bg-[#141824] border border-neutral-800 rounded-3xl">
              <span className="material-symbols-rounded text-4xl text-neutral-600 block mb-2">slideshow</span>
              <p className="font-medium text-white text-sm">Không có bản trình chiếu nào</p>
              <p className="text-xs text-neutral-500 mt-1">Người dùng tạo slide trong Slide Studio sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {presentations.map((p) => (
                <div key={p._id} className="rounded-2xl bg-[#141824] border border-neutral-800/80 overflow-hidden hover:border-neutral-700 transition-all flex flex-col">
                  <div className="aspect-video bg-neutral-900 relative overflow-hidden flex items-center justify-center">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-neutral-600 flex flex-col items-center">
                        <span className="material-symbols-rounded text-3xl">slideshow</span>
                        <span className="text-[10px] mt-1">Chưa có thumbnail</span>
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      p.isPublic
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-neutral-800 text-neutral-400 border-neutral-700"
                    }`}>
                      {p.isPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{p.title}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Tác giả: {p.authorName || "Ẩn danh"}</p>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-2">
                        <span>{p.slidesCount} trang slide</span>
                        <span>•</span>
                        <span>{p.viewsCount} xem</span>
                        <span>•</span>
                        <span>{p.likesCount} thích</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-800">
                      <button
                        onClick={() => handleTogglePresVisibility(p)}
                        className="text-xs text-neutral-300 hover:text-white flex items-center gap-1"
                      >
                        <span className="material-symbols-rounded text-sm">
                          {p.isPublic ? "visibility_off" : "visibility"}
                        </span>
                        <span>{p.isPublic ? "Ẩn đi" : "Công khai"}</span>
                      </button>

                      <button
                        onClick={() => handleDeletePresentation(p._id)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <span className="material-symbols-rounded text-sm">delete</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, tác giả, mô tả hoặc tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1b2030] border border-neutral-700/60 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors border border-neutral-700/50"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Danh mục:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat === "Tất cả" ? "all" : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* System vs User */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Nguồn:</span>
            <select
              value={isSystem}
              onChange={(e) => setIsSystem(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả nguồn</option>
              <option value="true">Chính thức (System)</option>
              <option value="false">Cộng đồng (User)</option>
            </select>
          </div>

          {/* Public vs Private */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Hiển thị:</span>
            <select
              value={isPublic}
              onChange={(e) => setIsPublic(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="true">Công khai</option>
              <option value="false">Riêng tư</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-16 text-center text-neutral-400 text-sm bg-[#141824] rounded-2xl border border-neutral-800">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
          Đang tải danh sách mẫu thiết kế...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400 text-sm bg-[#141824] rounded-2xl border border-red-500/20">
          {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="p-16 text-center text-neutral-400 text-sm bg-[#141824] rounded-2xl border border-neutral-800">
          Không tìm thấy mẫu thiết kế nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <div
              key={t._id}
              className="rounded-2xl bg-[#141824] border border-neutral-800/80 hover:border-neutral-700/80 overflow-hidden flex flex-col justify-between transition-all group shadow-sm"
            >
              <div>
                {/* Thumbnail Preview Area */}
                <div className="h-44 bg-[#0f121d] relative overflow-hidden flex items-center justify-center border-b border-neutral-800">
                  {t.thumbnailUrl ? (
                    <img
                      src={t.thumbnailUrl}
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="material-symbols-rounded text-4xl text-neutral-600 block mb-1">
                        view_in_ar
                      </span>
                      <span className="text-[11px] text-neutral-500">3D Interactive Preview</span>
                    </div>
                  )}

                  {/* System & Featured Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    {t.isSystem && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm shadow">
                        Hệ thống
                      </span>
                    )}
                    {t.isFeatured && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-white font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm shadow">
                        Nổi bật
                      </span>
                    )}
                  </div>

                  {/* Visibility Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-sm ${
                        t.isPublic
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-neutral-800/90 text-neutral-300 border border-neutral-700"
                      }`}
                    >
                      {t.isPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-semibold text-indigo-400">{t.category}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>

                  <h3 className="font-bold text-white text-sm truncate" title={t.title}>
                    {t.title}
                  </h3>

                  <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">
                    {t.description || "Không có mô tả chi tiết."}
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
                    <span className="material-symbols-rounded text-sm text-neutral-500">person</span>
                    <span className="truncate">{t.authorName || "PickMe3D Creator"}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 pt-2 text-[11px] text-neutral-400 border-t border-neutral-800/80">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm text-red-400">favorite</span>
                      {t.likesCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm text-blue-400">visibility</span>
                      {t.viewsCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm text-purple-400">fork_right</span>
                      {t.forksCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-[#161a28] border-t border-neutral-800 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => openEditModal(t)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-rounded text-sm">edit</span>
                  Sửa
                </button>
                <button
                  onClick={() => setDeleteModalTemplate(t)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-rounded text-sm">delete</span>
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.pages > 1 && (
        <div className="p-4 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs text-neutral-400 bg-[#141824]">
          <div>
            Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
            {pagination.pages} (Tổng {pagination.total} mẫu)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadTemplates(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
            >
              Trước
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => loadTemplates(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      </>
      )}

      {/* ── MODAL: CREATE SYSTEM TEMPLATE ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">add_box</span>
                Tạo Mẫu Hệ Thống 3D Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Tiêu đề mẫu *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Áo Khoác Cyberpunk 3D Nam"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Mô tả phong cách, chất liệu, hướng dẫn phối trang phục..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Danh mục</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.filter((c) => c !== "Tất cả").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Tags (cách nhau dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="streetwear, 3d, jacket"
                    className="w-full px-3 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Đường dẫn ảnh Thumbnail (URL)
                </label>
                <input
                  type="url"
                  value={formThumbnail}
                  onChange={(e) => setFormThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Đặt làm mẫu Nổi bật (Featured)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Công khai trong thư viện</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  {actionBusy ? "Đang tạo..." : "Lưu Mẫu Hệ Thống"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT TEMPLATE ── */}
      {editModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">edit</span>
                Chỉnh Sửa Thuộc Tính Mẫu
              </h3>
              <button
                onClick={() => setEditModalTemplate(null)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Tiêu đề mẫu *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Danh mục</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.filter((c) => c !== "Tất cả").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Tags</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Ảnh Thumbnail (URL)</label>
                <input
                  type="url"
                  value={formThumbnail}
                  onChange={(e) => setFormThumbnail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={formIsSystem}
                    onChange={(e) => setFormIsSystem(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Mẫu Hệ Thống (System)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Nổi bật (Featured)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Công khai</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditModalTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  {actionBusy ? "Đang lưu..." : "Cập Nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE CONFIRMATION ── */}
      {deleteModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-red-400">warning</span>
              Xóa Mẫu Thiết Kế
            </h3>

            <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
              Bạn có chắc chắn muốn xóa mẫu:{" "}
              <span className="font-bold text-white">{deleteModalTemplate.title}</span>?
            </p>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 space-y-1">
              <div>⚠️ Kiểm tra phụ thuộc:</div>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                Thao tác này sẽ xóa vĩnh viễn mẫu thiết kế, gỡ bỏ mẫu khỏi các bộ sưu tập liên quan và xóa tất cả bình luận đính kèm. Thao tác không thể hoàn tác.
              </p>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalTemplate(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleDeleteSubmit}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/30"
              >
                {actionBusy ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
