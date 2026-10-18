"use client";

import React, { useEffect, useState } from "react";
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
import styles from "./page.module.css";

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
    <div className={styles.page} lang="en">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="PickMe3D — Home">
          <svg viewBox="0 0 40 44" fill="currentColor" aria-hidden="true">
            <path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" />
          </svg>
          <span>PickMe3D</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/templates/">Template</Link>
          <div className={styles.shared}>
            <NotificationBell />
          </div>
          <Link href="/profile/" aria-current="page" className={`${styles.activeNav} ${styles.profileName}`}>
            {user.name || "Profile"}
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Sign out">
            Sign out
          </button>
          <Link href="/editor/" className={styles.primary}>
            Open Canvas <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      {/* Main Container */}
      <main className={styles.main}>
        {/* User Profile Hero */}
        <section className={styles.hero} aria-labelledby="creator-title">
          <div className={styles.heroLeft}>
            <div className={styles.avatarWrap}>
              {user.picture ? (
                <img src={user.picture} alt={user.name} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>{user.name ? user.name[0] : "P"}</div>
              )}
              <span className={styles.onlineBadge} title="Online" />
            </div>

            <div className={styles.heroDetails}>
              <p className={styles.eyebrow}>YOUR CREATIVE WORKSPACE</p>

              <div className={styles.nameRow}>
                {isEditingName ? (
                  <div className={styles.inlineForm}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.textInput}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveProfileName}
                      disabled={savingProfile}
                      className={styles.smallPrimaryBtn}
                    >
                      {savingProfile ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditName(user.name);
                        setIsEditingName(false);
                      }}
                      className={styles.smallGhostBtn}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 id="creator-title" className={styles.userName}>
                      {user.name}
                    </h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className={styles.editNameBtn}
                      title="Edit name"
                      aria-label="Edit name"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  </>
                )}
                <span className={styles.roleBadge}>
                  {user.role === "admin" ? "ADMIN CREATOR" : user.jobRole || "FASHION CREATOR"}
                </span>
              </div>

              <p className={styles.userEmail}>{user.email}</p>

              {/* Bio & Username */}
              <div className={styles.userBioWrap}>
                {isEditingBio ? (
                  <div className={styles.bioForm}>
                    <label>
                      Username
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) =>
                          setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                        }
                        placeholder="e.g. fashionista_99"
                        className={styles.textInput}
                        maxLength={30}
                      />
                    </label>
                    <label>
                      Bio & Introduction
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Share a few words about your creative style..."
                        className={styles.bioTextarea}
                        rows={3}
                        maxLength={500}
                      />
                    </label>
                    <div className={styles.bioBtnRow}>
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className={styles.smallPrimaryBtn}
                      >
                        {savingBio ? "Saving…" : "Save profile"}
                      </button>
                      <button
                        onClick={() => {
                          setEditBio(user.bio || "");
                          setEditUsername(user.username || "");
                          setIsEditingBio(false);
                        }}
                        className={styles.smallGhostBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {user.username && <p className={styles.userHandle}>@{user.username}</p>}
                    {user.bio ? (
                      <p className={styles.bioText}>{user.bio}</p>
                    ) : (
                      <p className={styles.bioText} style={{ color: "#777", fontStyle: "italic" }}>
                        Chưa có phần giới thiệu. Thêm thông tin cá nhân để cộng đồng biết thêm về bạn.
                      </p>
                    )}
                    <div className={styles.bioActions}>
                      <button onClick={() => setIsEditingBio(true)} className={styles.editBioBtn}>
                        {user.bio ? "Chỉnh sửa bio & username" : "Thêm bio & username"}
                      </button>
                      {user.username && (
                        <Link href={`/creator/${user.username}`} className={styles.publicProfileLink}>
                          <span>Xem hồ sơ công khai</span>
                          <span aria-hidden="true">↗</span>
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Group */}
          <div className={styles.statsGroup}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{designs.length}</span>
              <span className={styles.statLabel}>Thiết kế</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber} style={{ color: "#34d399" }}>
                {publicCount}
              </span>
              <span className={styles.statLabel}>Công khai</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber} style={{ color: "#fbbf24" }}>
                {collections.length}
              </span>
              <span className={styles.statLabel}>Bộ sưu tập</span>
            </div>
          </div>
        </section>

        {/* Tab Switcher: Designs | Collections */}
        <div className={styles.tabRow} role="tablist">
          <button
            role="tab"
            aria-selected={profileTab === "designs"}
            onClick={() => setProfileTab("designs")}
            className={styles.tabBtn}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z" />
            </svg>
            <span>Thiết kế ({designs.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={profileTab === "collections"}
            onClick={() => setProfileTab("collections")}
            className={styles.tabBtn}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            <span>Bộ sưu tập ({collections.length})</span>
          </button>
        </div>

        {/* Section: Designs */}
        {profileTab === "designs" && (
          <section aria-labelledby="designs-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="designs-heading" className={styles.sectionTitle}>
                  Các mẫu đã chỉnh sửa ({designs.length})
                </h2>
                <p className={styles.sectionDesc}>
                  Quản lý quyền công khai/riêng tư và gắn hashtag cho từng thiết kế của bạn.
                </p>
              </div>

              {/* Filters & Actions */}
              <div className={styles.controlsRow}>
                <div className={styles.filtersGroup} role="group" aria-label="Lọc trạng thái">
                  <button
                    aria-pressed={filterMode === "all"}
                    onClick={() => setFilterMode("all")}
                    className={styles.filterBtn}
                  >
                    Tất cả ({designs.length})
                  </button>
                  <button
                    aria-pressed={filterMode === "public"}
                    onClick={() => setFilterMode("public")}
                    className={styles.filterBtn}
                  >
                    Công khai ({publicCount})
                  </button>
                  <button
                    aria-pressed={filterMode === "private"}
                    onClick={() => setFilterMode("private")}
                    className={styles.filterBtn}
                  >
                    Riêng tư ({privateCount})
                  </button>
                </div>

                <div className={styles.searchBox}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Lọc theo hashtag/tên..."
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                  />
                  {searchTag && (
                    <button onClick={() => setSearchTag("")} aria-label="Xóa tìm kiếm">
                      ×
                    </button>
                  )}
                </div>

                <Link href="/editor/" className={styles.newDesignBtn}>
                  <span>+ Tạo mới</span>
                </Link>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className={styles.loadingState}>
                <span className={styles.spinner} />
                <p style={{ color: "#aaa", fontSize: 13 }}>Đang tải danh sách thiết kế của bạn…</p>
              </div>
            ) : filteredDesigns.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.eyebrow}>YOUR CANVAS IS READY</p>
                <h3>{searchTag ? "Không tìm thấy thiết kế phù hợp." : "Chưa có thiết kế nào được lưu."}</h3>
                <p>
                  {searchTag
                    ? "Hãy thử tìm với từ khóa hoặc hashtag khác."
                    : "Mở Canvas Editor để tạo tác phẩm đầu tiên và lưu vào thư viện cá nhân của bạn."}
                </p>
                <Link href="/editor/" className={styles.primary}>
                  Bắt đầu thiết kế <span aria-hidden="true">↗</span>
                </Link>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredDesigns.map((design) => {
                  const designId = (design._id || design.id)!;

                  return (
                    <article key={designId} className={styles.card}>
                      {/* Preview Image */}
                      <div className={styles.cardPreview}>
                        <img
                          src={design.thumbnailUrl || "/hero/card-couture.png"}
                          alt={design.title}
                          loading="lazy"
                        />

                        {/* Public / Private toggle badge */}
                        <button
                          type="button"
                          onClick={() => handleTogglePrivacy(design)}
                          className={styles.privacyBadge}
                          data-public={design.isPublic ? "true" : "false"}
                          title={
                            design.isPublic
                              ? "Nhấn để chuyển sang Riêng tư (Private)"
                              : "Nhấn để Công khai lên Thư viện mẫu (Public)"
                          }
                        >
                          <span>{design.isPublic ? "🌐 Công khai" : "🔒 Riêng tư"}</span>
                          <span aria-hidden="true" style={{ opacity: 0.7 }}>⇄</span>
                        </button>

                        {/* Category badge */}
                        <span className={styles.categoryBadge}>
                          {design.category || "Outfit"}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className={styles.cardBody}>
                        <h3 className={styles.cardTitle} title={design.title}>
                          {design.title}
                        </h3>
                        <p className={styles.cardDesc}>
                          {design.description || "Bản thiết kế thời trang từ PickMe3D Canvas Editor."}
                        </p>

                        {/* Hashtags */}
                        <div className={styles.tagsSection}>
                          <div className={styles.tagsHeader}>
                            <span># HASHTAGS</span>
                            {editingTagId !== designId && (
                              <button
                                onClick={() => {
                                  setEditingTagId(designId);
                                  setNewTagInput("");
                                }}
                                className={styles.addTagTrigger}
                              >
                                + Thêm tag
                              </button>
                            )}
                          </div>

                          <div className={styles.tagPills}>
                            {design.tags && design.tags.length > 0 ? (
                              design.tags.map((tag, idx) => (
                                <span key={idx} className={styles.tagPill}>
                                  <span>#{tag}</span>
                                  <button
                                    onClick={() => handleRemoveTag(designId, tag)}
                                    className={styles.tagRemoveBtn}
                                    title={`Xóa #${tag}`}
                                    aria-label={`Xóa #${tag}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className={styles.emptyTags}>Chưa gắn hashtag</span>
                            )}
                          </div>

                          {editingTagId === designId && (
                            <div className={styles.inlineTagInput}>
                              <input
                                type="text"
                                placeholder="Nhập tag (VD: couture)..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddTag(designId);
                                  if (e.key === "Escape") setEditingTagId(null);
                                }}
                                autoFocus
                              />
                              <button onClick={() => handleAddTag(designId)}>Thêm</button>
                              <button onClick={() => setEditingTagId(null)}>Hủy</button>
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions */}
                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            onClick={() => handleEditDesign(design)}
                            className={styles.editActionBtn}
                            title="Tải thiết kế vào Canvas Editor để chỉnh sửa"
                          >
                            <span>Chỉnh sửa tiếp</span>
                            <span aria-hidden="true">↗</span>
                          </button>

                          {design.isPublic && (
                            <Link
                              href={`/templates/${designId}`}
                              className={styles.iconActionBtn}
                              title="Xem trang chi tiết công khai"
                              aria-label="Xem chi tiết"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>
                          )}

                          {deleteConfirmId === designId ? (
                            <div className={styles.deleteConfirmGroup}>
                              <button
                                onClick={() => handleDeleteDesign(designId)}
                                className={styles.confirmDeleteBtn}
                                title="Xác nhận xóa"
                              >
                                Xóa?
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={styles.cancelDeleteBtn}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(designId)}
                              className={styles.iconActionBtn}
                              title="Xóa thiết kế này"
                              aria-label="Xóa thiết kế"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section: Collections */}
        {profileTab === "collections" && (
          <section aria-labelledby="collections-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="collections-heading" className={styles.sectionTitle}>
                  Bộ Sưu Tập Của Tôi ({collections.length})
                </h2>
                <p className={styles.sectionDesc}>
                  Quản lý các bộ sưu tập thiết kế và thư mục mẫu đã ghim của bạn.
                </p>
              </div>
            </div>

            {loadingCollections ? (
              <div className={styles.loadingState}>
                <span className={styles.spinner} />
                <p style={{ color: "#aaa", fontSize: 13 }}>Đang tải bộ sưu tập…</p>
              </div>
            ) : collections.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.eyebrow}>CURATE YOUR FAVORITES</p>
                <h3>Bạn chưa tạo bộ sưu tập nào.</h3>
                <p>Khám phá các thiết kế mẫu từ cộng đồng và lưu vào bộ sưu tập cá nhân của bạn.</p>
                <Link href="/templates/" className={styles.primary}>
                  Khám phá mẫu thiết kế <span aria-hidden="true">↗</span>
                </Link>
              </div>
            ) : (
              <div className={styles.grid}>
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

      {/* Footer */}
      <footer className={styles.footer}>
        <Link href="/">PickMe3D</Link>
        <p>A space for original ideas.</p>
        <Link href="/editor/">Start designing ↗</Link>
        <span>© {new Date().getFullYear()} PickMe3D</span>
      </footer>
    </div>
  );
}
