"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TemplateItem } from "@/lib/templateService";
import { fetchMyDesignsApi, updateDesignApi, deleteDesignApi, prepareEditorSession } from "@/lib/templateService";
import { CollectionItem, fetchMyCollectionsApi, deleteCollectionApi } from "@/lib/collectionService";
import { fetchMyProfileApi, mergeCurrentUserProfile, updateMyProfileApi } from "@/lib/userService";
import UserAvatar from "@/components/UserAvatar";
import styles from "./page.module.css";

type ProfileTab = "overview" | "designs" | "collections";
type DesignFilter = "all" | "public" | "private";

function formatDate(value?: string | Date | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: value > 999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value || 0);
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [designs, setDesigns] = useState<TemplateItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [filterMode, setFilterMode] = useState<DesignFilter>("all");
  const [searchTag, setSearchTag] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    const list = await fetchMyDesignsApi();
    setDesigns(list);
    setLoading(false);
  }, []);

  const loadCollections = useCallback(async () => {
    setLoadingCollections(true);
    const list = await fetchMyCollectionsApi();
    setCollections(list);
    setLoadingCollections(false);
  }, []);

  useEffect(() => {
    let active = true;
    const storedUser = localStorage.getItem("pickme3d_user");
    if (!storedUser) {
      router.push("/");
      return () => { active = false; };
    }

    const cachedUser = JSON.parse(storedUser);
    setUser(cachedUser);
    setEditName(cachedUser.name || "");
    setEditBio(cachedUser.bio || "");
    setEditUsername(cachedUser.username || "");
    void loadDesigns();
    void loadCollections();

    void fetchMyProfileApi().then((profile) => {
      if (!active || !profile) return;
      const refreshedUser = mergeCurrentUserProfile(cachedUser, profile);
      setUser(refreshedUser);
      setEditName(refreshedUser.name || "");
      setEditBio(refreshedUser.bio || "");
      setEditUsername(refreshedUser.username || "");
      localStorage.setItem("pickme3d_user", JSON.stringify(refreshedUser));
      window.dispatchEvent(new Event("storage"));
    });

    return () => { active = false; };
  }, [loadCollections, loadDesigns, router]);

  const publicCount = designs.filter((design) => design.isPublic).length;
  const privateCount = designs.length - publicCount;
  const totalViews = designs.reduce((sum, design) => sum + (design.viewsCount || 0), 0);
  const totalLikes = designs.reduce((sum, design) => sum + (design.likesCount || 0), 0);
  const latestDesign = useMemo(
    () => [...designs].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())[0],
    [designs],
  );
  const recentActivity = latestDesign?.updatedAt || latestDesign?.createdAt || user?.updatedAt || user?.createdAt;

  const handleSaveProfileName = async () => {
    if (!editName.trim() || editName.trim() === user.name) {
      setIsEditingName(false);
      return;
    }
    setSavingProfile(true);
    const result = await updateMyProfileApi({ name: editName.trim() });
    if (result.success && result.data) {
      const updated = mergeCurrentUserProfile(user, result.data);
      setUser(updated);
      localStorage.setItem("pickme3d_user", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      showToast("Đã cập nhật tên tài khoản.");
    } else {
      showToast(result.message || "Không thể cập nhật tên lúc này.");
    }
    setSavingProfile(false);
    setIsEditingName(false);
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    const updates: Record<string, string> = {};
    if (editBio !== (user.bio || "")) updates.bio = editBio.trim();
    if (editUsername !== (user.username || "")) updates.username = editUsername.trim();
    if (!Object.keys(updates).length) {
      setIsEditingBio(false);
      setSavingBio(false);
      return;
    }

    const result = await updateMyProfileApi(updates);
    if (result.success && result.data) {
      const updated = mergeCurrentUserProfile(user, result.data);
      setUser(updated);
      localStorage.setItem("pickme3d_user", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      showToast("Đã cập nhật hồ sơ.");
    } else {
      showToast(result.message || "Không thể cập nhật hồ sơ.");
    }
    setSavingBio(false);
    setIsEditingBio(false);
  };

  const handleTogglePrivacy = async (design: TemplateItem) => {
    const id = (design._id || design.id)!;
    const isPublic = !design.isPublic;
    setDesigns((current) => current.map((item) => (item._id || item.id) === id ? { ...item, isPublic } : item));
    const result = await updateDesignApi(id, { isPublic });
    showToast(result.success ? (isPublic ? "Thiết kế đã được công khai." : "Thiết kế đã chuyển sang riêng tư.") : "Đã cập nhật trạng thái trong phiên này.");
  };

  const handleAddTag = async (designId: string) => {
    const tag = newTagInput.trim().replace(/^#/, "");
    const design = designs.find((item) => (item._id || item.id) === designId);
    if (!design || !tag) return;
    if (design.tags?.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setNewTagInput("");
      setEditingTagId(null);
      return;
    }
    const tags = [...(design.tags || []), tag];
    setDesigns((current) => current.map((item) => (item._id || item.id) === designId ? { ...item, tags } : item));
    setNewTagInput("");
    setEditingTagId(null);
    await updateDesignApi(designId, { tags });
    showToast(`Đã thêm #${tag}.`);
  };

  const handleRemoveTag = async (designId: string, tag: string) => {
    const design = designs.find((item) => (item._id || item.id) === designId);
    if (!design) return;
    const tags = (design.tags || []).filter((item) => item !== tag);
    setDesigns((current) => current.map((item) => (item._id || item.id) === designId ? { ...item, tags } : item));
    await updateDesignApi(designId, { tags });
    showToast(`Đã xóa #${tag}.`);
  };

  const handleEditDesign = (design: TemplateItem) => {
    prepareEditorSession(design, true);
    router.push(`/editor?editId=${design._id || design.id}`);
  };

  const handleDeleteDesign = async (id: string) => {
    await deleteDesignApi(id);
    setDesigns((current) => current.filter((design) => (design._id || design.id) !== id));
    setDeleteConfirmId(null);
    showToast("Đã xóa thiết kế.");
  };

  const handleDeleteCollection = async (id: string) => {
    if (await deleteCollectionApi(id)) {
      setCollections((current) => current.filter((collection) => collection._id !== id));
      showToast("Đã xóa bộ sưu tập.");
    } else {
      showToast("Không thể xóa bộ sưu tập.");
    }
  };



  const filteredDesigns = designs.filter((design) => {
    if (filterMode === "public" && !design.isPublic) return false;
    if (filterMode === "private" && design.isPublic) return false;
    const query = searchTag.trim().toLowerCase().replace(/^#/, "");
    if (!query) return true;
    return design.title.toLowerCase().includes(query) || design.tags?.some((tag) => tag.toLowerCase().includes(query));
  });

  if (!user) return null;

  return (
    <div className={styles.page}>
      {toastMessage && (
        <div className={styles.toast} role="status">
          <span className="material-symbols-rounded">check_circle</span>
          {toastMessage}
        </div>
      )}




      <main className={styles.main}>
        <section className={styles.profileCard} aria-labelledby="profile-name">
          <div className={styles.profileMain}>
            <UserAvatar
              picture={user.picture}
              googlePicture={user.googlePicture}
              name={user.name}
              email={user.email}
              size={152}
              alt={user.name || "Ảnh đại diện"}
              className={styles.avatar}
              style={{ width: "clamp(88px, 14vw, 152px)", height: "clamp(88px, 14vw, 152px)", borderRadius: 14 }}
            />

            <div className={styles.identity}>
              <div className={styles.identityTitle}>
                {isEditingName ? (
                  <div className={styles.nameEditor}>
                    <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Tên hiển thị" />
                    <button className={styles.smallPrimary} onClick={handleSaveProfileName} disabled={savingProfile}>{savingProfile ? "Đang lưu" : "Lưu"}</button>
                    <button className={styles.smallButton} onClick={() => { setEditName(user.name || ""); setIsEditingName(false); }}>Hủy</button>
                  </div>
                ) : <h1 id="profile-name">{user.name || "Nhà thiết kế PickMe3D"}</h1>}
                <span className={styles.roleBadge}>{user.role === "admin" ? "Quản trị viên" : "Nhà sáng tạo"}</span>
              </div>

              <div className={styles.metaRow}>
                {user.email && <span><i className="material-symbols-rounded">mail</i>{user.email}</span>}
                <span><i className="material-symbols-rounded">work</i>{user.jobRole || "Nhà thiết kế số"}</span>
                <span><i className="material-symbols-rounded">calendar_month</i>Tham gia {formatDate(user.createdAt)}</span>
              </div>

              {!isEditingBio && <p className={styles.bioPreview}>{user.bio || "Thêm vài dòng giới thiệu để cộng đồng biết thêm về bạn và những ý tưởng bạn đang thực hiện."}</p>}
              {user.username && <Link className={styles.publicLink} href={`/creator/${user.username}`}><span className="material-symbols-rounded">open_in_new</span>pickme3d.com/creator/{user.username}</Link>}
            </div>

            <div className={styles.profileActions}>
              {user.role === "admin" && (
                <Link
                  className={styles.editButton}
                  href="/admin"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
                  }}
                  title="Truy cập Bảng Quản trị Admin"
                >
                  <span className="material-symbols-rounded">admin_panel_settings</span>
                  <span>Admin Console</span>
                </Link>
              )}
              <button className={styles.outlineButton} onClick={() => window.print()}><span className="material-symbols-rounded">print</span><span>In hồ sơ</span></button>
              <button className={styles.editButton} onClick={() => { setIsEditingName(true); setIsEditingBio(true); }}><span className="material-symbols-rounded">edit</span><span>Chỉnh sửa</span></button>
            </div>
          </div>

          <div className={styles.profileFacts}>
            <div><span>Vai trò</span><strong>{user.jobRole || "Nhà thiết kế số"}</strong></div>
            <div><span>Tên người dùng</span><strong>{user.username ? `@${user.username}` : "Chưa thiết lập"}</strong></div>
            <div><span>Thiết kế công khai</span><strong>{publicCount} tác phẩm</strong></div>
            <div><span>Bộ sưu tập</span><strong>{collections.length} bộ sưu tập</strong></div>
          </div>
        </section>

        <div className={styles.updatedLine}>
          <span />
          <p><i className="material-symbols-rounded">visibility</i>Hoạt động gần đây: {formatDate(recentActivity)}</p>
          <span />
        </div>

        <nav className={styles.tabs} aria-label="Các mục hồ sơ">
          <button className={tab === "overview" ? styles.activeTab : ""} onClick={() => setTab("overview")} aria-current={tab === "overview" ? "page" : undefined}>
            <span>Tổng quan</span><strong>Hồ sơ</strong>
          </button>
          <button className={tab === "designs" ? styles.activeTab : ""} onClick={() => setTab("designs")} aria-current={tab === "designs" ? "page" : undefined}>
            <span>Thiết kế</span><strong>{designs.length}</strong>
          </button>
          <button className={tab === "collections" ? styles.activeTab : ""} onClick={() => setTab("collections")} aria-current={tab === "collections" ? "page" : undefined}>
            <span>Bộ sưu tập</span><strong>{collections.length}</strong>
          </button>
        </nav>

        {tab === "overview" && (
          <section className={styles.overviewGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Thông tin hồ sơ</h2><p>Thông tin hiển thị trong không gian sáng tạo của bạn.</p></div>
                {!isEditingBio && <button className={styles.textButton} onClick={() => setIsEditingBio(true)}><span className="material-symbols-rounded">edit</span>Chỉnh sửa</button>}
              </div>
              {isEditingBio ? (
                <div className={styles.formGrid}>
                  <label>Tên người dùng
                    <input value={editUsername} onChange={(event) => setEditUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="ten_nguoi_dung" maxLength={30} />
                  </label>
                  <label className={styles.fullField}>Giới thiệu
                    <textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} placeholder="Chia sẻ một chút về phong cách và ý tưởng của bạn..." rows={5} maxLength={500} />
                    <small>{editBio.length}/500</small>
                  </label>
                  <div className={styles.formActions}>
                    <button className={styles.editButton} onClick={handleSaveBio} disabled={savingBio}>{savingBio ? "Đang lưu..." : "Lưu thay đổi"}</button>
                    <button className={styles.outlineButton} onClick={() => { setEditBio(user.bio || ""); setEditUsername(user.username || ""); setIsEditingBio(false); }}>Hủy</button>
                  </div>
                </div>
              ) : (
                <div className={styles.detailGrid}>
                  <div><span>Họ tên</span><strong>{user.name || "Chưa cập nhật"}</strong></div>
                  <div><span>Email</span><strong>{user.email || "Chưa cập nhật"}</strong></div>
                  <div><span>Tên người dùng</span><strong>{user.username ? `@${user.username}` : "Chưa thiết lập"}</strong></div>
                  <div><span>Lĩnh vực</span><strong>{user.jobRole || "Nhà thiết kế số"}</strong></div>
                  <div className={styles.fullField}><span>Giới thiệu</span><p>{user.bio || "Chưa có phần giới thiệu."}</p></div>
                </div>
              )}
            </article>

            <div className={styles.sidePanels}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Hoạt động sáng tạo</h2><p>Tổng quan các thiết kế của bạn.</p></div><span className={`material-symbols-rounded ${styles.panelIcon}`}>insights</span></div>
                <div className={styles.metricsGrid}>
                  <div><span className="material-symbols-rounded">dashboard</span><strong>{designs.length}</strong><small>Thiết kế</small></div>
                  <div><span className="material-symbols-rounded">public</span><strong>{publicCount}</strong><small>Công khai</small></div>
                  <div><span className="material-symbols-rounded">visibility</span><strong>{formatCompact(totalViews)}</strong><small>Lượt xem</small></div>
                  <div><span className="material-symbols-rounded">favorite</span><strong>{formatCompact(totalLikes)}</strong><small>Lượt thích</small></div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Thiết kế gần đây</h2><p>Tiếp tục hoàn thiện ý tưởng của bạn.</p></div></div>
                {latestDesign ? (
                  <button className={styles.recentDesign} onClick={() => handleEditDesign(latestDesign)}>
                    <img src={latestDesign.thumbnailUrl || "/hero/card-couture.png"} alt="" />
                    <span><strong>{latestDesign.title}</strong><small>Cập nhật {formatDate(latestDesign.updatedAt || latestDesign.createdAt)}</small></span>
                    <i className="material-symbols-rounded">arrow_forward</i>
                  </button>
                ) : <p className={styles.noRecent}>Thiết kế đã lưu sẽ xuất hiện ở đây.</p>}
                <Link href="/editor/" className={styles.inlineLink}>Mở Canvas Editor <span className="material-symbols-rounded">arrow_outward</span></Link>
              </article>
            </div>
          </section>
        )}

        {tab === "designs" && (
          <section className={styles.contentPanel}>
            <div className={styles.sectionHeading}>
              <div><h2>Thiết kế của tôi</h2><p>Quản lý thiết kế, quyền hiển thị và hashtag.</p></div>
              <Link href="/editor/" className={styles.editButton}><span className="material-symbols-rounded">add</span>Tạo thiết kế</Link>
            </div>

            <div className={styles.designTools}>
              <div className={styles.filterGroup} aria-label="Lọc thiết kế">
                {(["all", "public", "private"] as DesignFilter[]).map((filter) => (
                  <button key={filter} className={filterMode === filter ? styles.selectedFilter : ""} onClick={() => setFilterMode(filter)}>
                    {filter === "all" ? `Tất cả ${designs.length}` : filter === "public" ? `Công khai ${publicCount}` : `Riêng tư ${privateCount}`}
                  </button>
                ))}
              </div>
              <label className={styles.searchBox}><span className="material-symbols-rounded">search</span><input value={searchTag} onChange={(event) => setSearchTag(event.target.value)} placeholder="Tìm theo tên hoặc hashtag" /></label>
            </div>

            {loading ? (
              <div className={styles.loadingState}><span className={styles.spinner} /><p>Đang tải thiết kế...</p></div>
            ) : filteredDesigns.length === 0 ? (
              <div className={styles.emptyState}><span className="material-symbols-rounded">palette</span><h3>{searchTag ? "Không tìm thấy thiết kế" : "Chưa có thiết kế nào"}</h3><p>{searchTag ? "Thử một tên hoặc hashtag khác." : "Lưu thiết kế đầu tiên từ Canvas Editor để quản lý tại đây."}</p><Link href="/editor/" className={styles.editButton}>Mở Canvas Editor</Link></div>
            ) : (
              <div className={styles.designGrid}>
                {filteredDesigns.map((design) => {
                  const id = (design._id || design.id)!;
                  return (
                    <article className={styles.designCard} key={id}>
                      <div className={styles.designImage}>
                        <img src={design.thumbnailUrl || "/hero/card-couture.png"} alt={design.title} />
                        <button className={`${styles.visibilityBadge} ${design.isPublic ? styles.publicBadge : ""}`} onClick={() => handleTogglePrivacy(design)} title="Đổi quyền hiển thị">
                          <span className="material-symbols-rounded">{design.isPublic ? "public" : "lock"}</span>{design.isPublic ? "Công khai" : "Riêng tư"}
                        </button>
                        <span className={styles.categoryBadge}>{design.category || "Thiết kế"}</span>
                      </div>
                      <div className={styles.designBody}>
                        <div><h3 title={design.title}>{design.title}</h3><p>{design.description || "Một thiết kế được tạo bằng PickMe3D Canvas Editor."}</p></div>
                        <div className={styles.designStats}><span><i className="material-symbols-rounded">visibility</i>{formatCompact(design.viewsCount || 0)}</span><span><i className="material-symbols-rounded">favorite</i>{formatCompact(design.likesCount || 0)}</span><span>{formatDate(design.updatedAt || design.createdAt)}</span></div>
                        <div className={styles.tagsBlock}>
                          <div className={styles.tagsHeading}><span>Hashtag</span>{editingTagId !== id && <button onClick={() => { setEditingTagId(id); setNewTagInput(""); }}>+ Thêm tag</button>}</div>
                          <div className={styles.tagsList}>
                            {(design.tags || []).map((tag) => <span className={styles.tag} key={tag}>#{tag}<button onClick={() => handleRemoveTag(id, tag)} aria-label={`Xóa hashtag ${tag}`}>×</button></span>)}
                            {!(design.tags || []).length && <small>Chưa có hashtag</small>}
                          </div>
                          {editingTagId === id && <form className={styles.tagForm} onSubmit={(event) => { event.preventDefault(); void handleAddTag(id); }}><input autoFocus value={newTagInput} onChange={(event) => setNewTagInput(event.target.value)} placeholder="Tên hashtag" /><button type="submit">Thêm</button><button type="button" onClick={() => setEditingTagId(null)}>Hủy</button></form>}
                        </div>
                        <div className={styles.designActions}>
                          <button className={styles.continueButton} onClick={() => handleEditDesign(design)}><span className="material-symbols-rounded">edit</span>Chỉnh sửa tiếp</button>
                          {design.isPublic && <Link className={styles.squareAction} href={`/templates/${id}`} title="Xem thiết kế công khai"><span className="material-symbols-rounded">open_in_new</span></Link>}
                          {deleteConfirmId === id ? <div className={styles.confirmActions}><button onClick={() => void handleDeleteDesign(id)}>Xóa</button><button onClick={() => setDeleteConfirmId(null)}>Hủy</button></div> : <button className={styles.squareAction} onClick={() => setDeleteConfirmId(id)} title="Xóa thiết kế"><span className="material-symbols-rounded">delete</span></button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "collections" && (
          <section className={styles.contentPanel}>
            <div className={styles.sectionHeading}><div><h2>Bộ sưu tập của tôi</h2><p>Các nhóm thiết kế bạn đã lưu và sắp xếp.</p></div><Link href="/templates/" className={styles.outlineButton}><span className="material-symbols-rounded">explore</span>Khám phá mẫu</Link></div>
            {loadingCollections ? (
              <div className={styles.loadingState}><span className={styles.spinner} /><p>Đang tải bộ sưu tập...</p></div>
            ) : collections.length === 0 ? (
              <div className={styles.emptyState}><span className="material-symbols-rounded">collections_bookmark</span><h3>Chưa có bộ sưu tập</h3><p>Lưu những thiết kế yêu thích vào bộ sưu tập để tìm lại dễ dàng.</p><Link href="/templates/" className={styles.editButton}>Khám phá thiết kế</Link></div>
            ) : (
              <div className={styles.collectionGrid}>
                {collections.map((collection) => (
                  <article className={styles.collectionCard} key={collection._id}>
                    <div className={styles.collectionCover}>{collection.coverImage ? <img src={collection.coverImage} alt="" /> : <span className="material-symbols-rounded">collections_bookmark</span>}<span className={styles.collectionVisibility}>{collection.isPublic ? "Công khai" : "Riêng tư"}</span></div>
                    <div className={styles.collectionInfo}><div><h3>{collection.name}</h3><p>{collection.templates.length} thiết kế · Tạo {formatDate(collection.createdAt)}</p>{collection.description && <small>{collection.description}</small>}</div><button className={styles.squareAction} onClick={() => void handleDeleteCollection(collection._id)} title="Xóa bộ sưu tập"><span className="material-symbols-rounded">delete</span></button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
