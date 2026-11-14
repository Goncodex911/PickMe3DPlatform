"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TemplateItem } from "@/lib/templateService";
import { fetchMyDesignsApi, updateDesignApi, deleteDesignApi, prepareEditorSession } from "@/lib/templateService";
import { CollectionItem, fetchMyCollectionsApi, deleteCollectionApi } from "@/lib/collectionService";
import { fetchMyProfileApi, mergeCurrentUserProfile, updateMyProfileApi } from "@/lib/userService";
import UserAvatar from "@/components/UserAvatar";
import DesignThumbnail from "@/components/DesignThumbnail";
import styles from "./page.module.css";

type ProfileTab = "overview" | "designs" | "collections";
type DesignFilter = "all" | "public" | "private";

function formatDate(value?: string | Date | null) {
  if (!value) return "Not updated";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not updated"
    : new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value > 999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value || 0);
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [designs, setDesigns] = useState<TemplateItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("overview");
  useEffect(() => {
    const sync = () => { if (window.location.hash === "#designs") setTab("designs"); };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
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
      showToast("Account name updated.");
    } else {
      showToast("Couldn’t update the account name.");
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
      showToast("Profile updated.");
    } else {
      showToast("Couldn’t update the profile.");
    }
    setSavingBio(false);
    setIsEditingBio(false);
  };

  const handleTogglePrivacy = async (design: TemplateItem) => {
    const id = (design._id || design.id)!;
    const isPublic = !design.isPublic;
    setDesigns((current) => current.map((item) => (item._id || item.id) === id ? { ...item, isPublic } : item));
    const result = await updateDesignApi(id, { isPublic });
    showToast(result.success ? (isPublic ? "Design is now public." : "Design is now private.") : "Visibility updated for this session.");
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
    showToast(`Added #${tag}.`);
  };

  const handleRemoveTag = async (designId: string, tag: string) => {
    const design = designs.find((item) => (item._id || item.id) === designId);
    if (!design) return;
    const tags = (design.tags || []).filter((item) => item !== tag);
    setDesigns((current) => current.map((item) => (item._id || item.id) === designId ? { ...item, tags } : item));
    await updateDesignApi(designId, { tags });
    showToast(`Removed #${tag}.`);
  };

  const handleEditDesign = (design: TemplateItem) => {
    prepareEditorSession(design, true);
    router.push(`/editor?editId=${design._id || design.id}`);
  };

  const handleDeleteDesign = async (id: string) => {
    await deleteDesignApi(id);
    setDesigns((current) => current.filter((design) => (design._id || design.id) !== id));
    setDeleteConfirmId(null);
    showToast("Design deleted.");
  };

  const handleDeleteCollection = async (id: string) => {
    if (await deleteCollectionApi(id)) {
      setCollections((current) => current.filter((collection) => collection._id !== id));
      showToast("Collection deleted.");
    } else {
      showToast("Couldn’t delete the collection.");
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
              alt={user.name || "Profile picture"}
              className={styles.avatar}
              style={{ width: "clamp(88px, 14vw, 152px)", height: "clamp(88px, 14vw, 152px)", borderRadius: 14 }}
            />

            <div className={styles.identity}>
              <div className={styles.identityTitle}>
                {isEditingName ? (
                  <div className={styles.nameEditor}>
                    <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Display name" />
                    <button className={styles.smallPrimary} onClick={handleSaveProfileName} disabled={savingProfile}>{savingProfile ? "Saving" : "Save"}</button>
                    <button className={styles.smallButton} onClick={() => { setEditName(user.name || ""); setIsEditingName(false); }}>Cancel</button>
                  </div>
                ) : <h1 id="profile-name">{user.name || "PickMe3D designer"}</h1>}
                <span className={styles.roleBadge}>{user.role === "admin" ? "Administrator" : "Creator"}</span>
              </div>

              <div className={styles.metaRow}>
                {user.email && <span><i className="material-symbols-rounded">mail</i>{user.email}</span>}
                <span><i className="material-symbols-rounded">work</i>{user.jobRole || "Digital designer"}</span>
                <span><i className="material-symbols-rounded">calendar_month</i>Joined {formatDate(user.createdAt)}</span>
              </div>

              {!isEditingBio && <p className={styles.bioPreview}>{user.bio || "Add a short bio to introduce yourself and the ideas you’re working on."}</p>}
              {(user.username || user._id || user.id) && (
                <Link
                  className={styles.publicLink}
                  href={
                    user.username
                      ? `/creator/?username=${encodeURIComponent(user.username)}`
                      : `/creator/?id=${encodeURIComponent(user._id || user.id)}`
                  }
                >
                  <span className="material-symbols-rounded">open_in_new</span>
                  {user.username ? `pickme3d.com/creator/${user.username}` : "View public profile"}
                </Link>
              )}
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
              title="Open the admin dashboard"
                >
                  <span className="material-symbols-rounded">admin_panel_settings</span>
                  <span>Admin Console</span>
                </Link>
              )}
              <Link className={styles.outlineButton} href="/settings/" aria-label="Open settings">
                <span className="material-symbols-rounded" aria-hidden="true">settings</span>
                <span>Settings</span>
              </Link>
              <button className={styles.outlineButton} onClick={() => window.print()}><span className="material-symbols-rounded">print</span><span>Print profile</span></button>
              <button className={styles.editButton} onClick={() => { setIsEditingName(true); setIsEditingBio(true); }}><span className="material-symbols-rounded">edit</span><span>Edit</span></button>
            </div>
          </div>

          <div className={styles.profileFacts}>
            <div><span>Role</span><strong>{user.jobRole || "Digital designer"}</strong></div>
            <div><span>Username</span><strong>{user.username ? `@${user.username}` : "Not set"}</strong></div>
            <div><span>Public designs</span><strong>{publicCount} designs</strong></div>
            <div><span>Collections</span><strong>{collections.length} collections</strong></div>
          </div>
        </section>

        <div className={styles.updatedLine}>
          <span />
          <p><i className="material-symbols-rounded">visibility</i>Recent activity: {formatDate(recentActivity)}</p>
          <span />
        </div>

        <nav className={styles.tabs} aria-label="Profile sections">
          <button className={tab === "overview" ? styles.activeTab : ""} onClick={() => setTab("overview")} aria-current={tab === "overview" ? "page" : undefined}>
            <span>Overview</span><strong>Profile</strong>
          </button>
          <button className={tab === "designs" ? styles.activeTab : ""} onClick={() => setTab("designs")} aria-current={tab === "designs" ? "page" : undefined}>
            <span>Designs</span><strong>{designs.length}</strong>
          </button>
          <button className={tab === "collections" ? styles.activeTab : ""} onClick={() => setTab("collections")} aria-current={tab === "collections" ? "page" : undefined}>
            <span>Collections</span><strong>{collections.length}</strong>
          </button>
        </nav>

        {tab === "overview" && (
          <section className={styles.overviewGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Profile information</h2><p>Information shown in your creative workspace.</p></div>
                {!isEditingBio && <button className={styles.textButton} onClick={() => setIsEditingBio(true)}><span className="material-symbols-rounded">edit</span>Edit</button>}
              </div>
              {isEditingBio ? (
                <div className={styles.formGrid}>
                  <label>Username
                    <input value={editUsername} onChange={(event) => setEditUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="your_username" maxLength={30} />
                  </label>
                  <label className={styles.fullField}>Bio
                    <textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} placeholder="Share a little about your style and the ideas you’re working on..." rows={5} maxLength={500} />
                    <small>{editBio.length}/500</small>
                  </label>
                  <div className={styles.formActions}>
                    <button className={styles.editButton} onClick={handleSaveBio} disabled={savingBio}>{savingBio ? "Saving..." : "Save changes"}</button>
                    <button className={styles.outlineButton} onClick={() => { setEditBio(user.bio || ""); setEditUsername(user.username || ""); setIsEditingBio(false); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={styles.detailGrid}>
                  <div><span>Full name</span><strong>{user.name || "Not updated"}</strong></div>
                  <div><span>Email</span><strong>{user.email || "Not updated"}</strong></div>
                  <div><span>Username</span><strong>{user.username ? `@${user.username}` : "Not set"}</strong></div>
                  <div><span>Field</span><strong>{user.jobRole || "Digital designer"}</strong></div>
                  <div className={styles.fullField}><span>Bio</span><p>{user.bio || "No bio yet."}</p></div>
                </div>
              )}
            </article>

            <div className={styles.sidePanels}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Creative activity</h2><p>An overview of your designs.</p></div><span className={`material-symbols-rounded ${styles.panelIcon}`}>insights</span></div>
                <div className={styles.metricsGrid}>
                  <div><span className="material-symbols-rounded">dashboard</span><strong>{designs.length}</strong><small>Designs</small></div>
                  <div><span className="material-symbols-rounded">public</span><strong>{publicCount}</strong><small>Public</small></div>
                  <div><span className="material-symbols-rounded">visibility</span><strong>{formatCompact(totalViews)}</strong><small>Views</small></div>
                  <div><span className="material-symbols-rounded">favorite</span><strong>{formatCompact(totalLikes)}</strong><small>Likes</small></div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Recent designs</h2><p>Keep working on your ideas.</p></div></div>
                {latestDesign ? (
                  <button className={styles.recentDesign} onClick={() => handleEditDesign(latestDesign)}>
                    <DesignThumbnail className={styles.recentPreview} docData={latestDesign.docData} thumbnailUrl={latestDesign.thumbnailUrl} title={latestDesign.title} />
                    <span><strong>{latestDesign.title}</strong><small>Updated {formatDate(latestDesign.updatedAt || latestDesign.createdAt)}</small></span>
                    <i className="material-symbols-rounded">arrow_forward</i>
                  </button>
                ) : <p className={styles.noRecent}>Saved designs will appear here.</p>}
                <Link href="/editor/" className={styles.inlineLink}>Open Canvas Editor <span className="material-symbols-rounded">arrow_outward</span></Link>
              </article>
            </div>
          </section>
        )}

        {tab === "designs" && (
          <section className={styles.contentPanel}>
            <div className={styles.sectionHeading}>
              <div><h2>My designs</h2><p>Manage designs, visibility, and hashtags.</p></div>
              <Link href="/editor/" className={styles.editButton}><span className="material-symbols-rounded">add</span>Create design</Link>
            </div>

            <div className={styles.designTools}>
              <div className={styles.filterGroup} aria-label="Filter designs">
                {(["all", "public", "private"] as DesignFilter[]).map((filter) => (
                  <button key={filter} className={filterMode === filter ? styles.selectedFilter : ""} onClick={() => setFilterMode(filter)}>
                    {filter === "all" ? `All ${designs.length}` : filter === "public" ? `Public ${publicCount}` : `Private ${privateCount}`}
                  </button>
                ))}
              </div>
              <label className={styles.searchBox}><span className="material-symbols-rounded">search</span><input value={searchTag} onChange={(event) => setSearchTag(event.target.value)} placeholder="Search by name or hashtag" /></label>
            </div>

            {loading ? (
              <div className={styles.loadingState}><span className={styles.spinner} /><p>Loading designs...</p></div>
            ) : filteredDesigns.length === 0 ? (
              <div className={styles.emptyState}><span className="material-symbols-rounded">palette</span><h3>{searchTag ? "No designs found" : "No designs yet"}</h3><p>{searchTag ? "Try a different name or hashtag." : "Save your first design from Canvas Editor to manage it here."}</p><Link href="/editor/" className={styles.editButton}>Open Canvas Editor</Link></div>
            ) : (
              <div className={styles.designGrid}>
                {filteredDesigns.map((design) => {
                  const id = (design._id || design.id)!;
                  return (
                    <article className={styles.designCard} key={id}>
                      <div className={styles.designImage}>
                        <DesignThumbnail docData={design.docData} thumbnailUrl={design.thumbnailUrl} title={design.title} />
                        <button className={`${styles.visibilityBadge} ${design.isPublic ? styles.publicBadge : ""}`} onClick={() => handleTogglePrivacy(design)} title="Change visibility">
                          <span className="material-symbols-rounded">{design.isPublic ? "public" : "lock"}</span>{design.isPublic ? "Public" : "Private"}
                        </button>
                        <span className={styles.categoryBadge}>{design.category || "Design"}</span>
                      </div>
                      <div className={styles.designBody}>
                        <div><h3 title={design.title}>{design.title}</h3><p>{design.description || "A design created with PickMe3D Canvas Editor."}</p></div>
                        <div className={styles.designStats}><span><i className="material-symbols-rounded">visibility</i>{formatCompact(design.viewsCount || 0)}</span><span><i className="material-symbols-rounded">favorite</i>{formatCompact(design.likesCount || 0)}</span><span>{formatDate(design.updatedAt || design.createdAt)}</span></div>
                        <div className={styles.tagsBlock}>
                          <div className={styles.tagsHeading}><span>Hashtags</span>{editingTagId !== id && <button onClick={() => { setEditingTagId(id); setNewTagInput(""); }}>+ Add tag</button>}</div>
                          <div className={styles.tagsList}>
                            {(design.tags || []).map((tag) => <span className={styles.tag} key={tag}>#{tag}<button onClick={() => handleRemoveTag(id, tag)} aria-label={`Remove hashtag ${tag}`}>×</button></span>)}
                            {!(design.tags || []).length && <small>No hashtags yet</small>}
                          </div>
                          {editingTagId === id && <form className={styles.tagForm} onSubmit={(event) => { event.preventDefault(); void handleAddTag(id); }}><input autoFocus value={newTagInput} onChange={(event) => setNewTagInput(event.target.value)} placeholder="Hashtag name" /><button type="submit">Add</button><button type="button" onClick={() => setEditingTagId(null)}>Cancel</button></form>}
                        </div>
                        <div className={styles.designActions}>
                          <button className={styles.continueButton} onClick={() => handleEditDesign(design)}><span className="material-symbols-rounded">edit</span>Continue editing</button>
                          {design.isPublic && <Link className={styles.squareAction} href={`/templates/${id}`} title="View public design"><span className="material-symbols-rounded">open_in_new</span></Link>}
                          {deleteConfirmId === id ? <div className={styles.confirmActions}><button onClick={() => void handleDeleteDesign(id)}>Delete</button><button onClick={() => setDeleteConfirmId(null)}>Cancel</button></div> : <button className={styles.squareAction} onClick={() => setDeleteConfirmId(id)} title="Delete design"><span className="material-symbols-rounded">delete</span></button>}
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
            <div className={styles.sectionHeading}><div><h2>My collections</h2><p>Groups of designs you’ve saved and organized.</p></div><Link href="/templates/" className={styles.outlineButton}><span className="material-symbols-rounded">explore</span>Explore designs</Link></div>
            {loadingCollections ? (
              <div className={styles.loadingState}><span className={styles.spinner} /><p>Loading collections...</p></div>
            ) : collections.length === 0 ? (
              <div className={styles.emptyState}><span className="material-symbols-rounded">collections_bookmark</span><h3>No collections yet</h3><p>Save your favorite designs to a collection so you can find them easily.</p><Link href="/templates/" className={styles.editButton}>Explore designs</Link></div>
            ) : (
              <div className={styles.collectionGrid}>
                {collections.map((collection) => (
                  <article className={styles.collectionCard} key={collection._id}>
                    <div className={styles.collectionCover}>{collection.coverImage ? <img src={collection.coverImage} alt="" /> : <span className="material-symbols-rounded">collections_bookmark</span>}<span className={styles.collectionVisibility}>{collection.isPublic ? "Public" : "Private"}</span></div>
                    <div className={styles.collectionInfo}><div><h3>{collection.name}</h3><p>{collection.templates.length} designs · Created {formatDate(collection.createdAt)}</p>{collection.description && <small>{collection.description}</small>}</div><button className={styles.squareAction} onClick={() => void handleDeleteCollection(collection._id)} title="Delete collection"><span className="material-symbols-rounded">delete</span></button></div>
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
