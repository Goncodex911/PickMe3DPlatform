"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TemplateItem, fetchTemplatesApi } from "@/lib/templateService";
import TemplateCard from "@/components/TemplateCard";
import TemplateDetailModal from "@/components/TemplateDetailModal";
import AdvancedSearchFilters from "@/components/AdvancedSearchFilters";
import NotificationBell from "@/components/NotificationBell";
import styles from "./page.module.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const CATEGORIES = [
  "Tất cả",
  "Haute Couture",
  "Streetwear",
  "Casual",
  "Dạ hội",
];

const SORT_OPTIONS = [
  { key: "trending", label: "Trending", icon: "local_fire_department" },
  { key: "rating", label: "Top rated", icon: "star" },
  { key: "likes", label: "Most liked", icon: "favorite" },
  { key: "newest", label: "Newest", icon: "schedule" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("trending");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Advanced search filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("all");
  const [forkable, setForkable] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("pickme3d_user");
      if (u && localStorage.getItem("pickme3d_token")) setCurrentUser(JSON.parse(u));
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
        tags: selectedTags,
        dateRange,
        forkable,
      });
      if (isMounted) {
        setTemplates(res.templates);
        setIsOfflineMode(!!res.isOffline);
        setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [selectedCategory, searchQuery, sortBy, selectedTags, dateRange, forkable]);

  const hasFilters = Boolean(searchQuery || selectedCategory !== "Tất cả" || selectedTags.length || dateRange !== "all" || forkable);
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Tất cả");
    setSelectedTags([]);
    setDateRange("all");
    setForkable(false);
  };
  const editorHref = currentUser ? "/editor/" : "/login/";

  return (
    <div className={styles.page} lang="en">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="PickMe3D — Home">
          <svg viewBox="0 0 40 44" fill="currentColor" aria-hidden="true"><path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" /></svg>
          <span>PickMe3D</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" className={styles.homeLink}>Home</Link>
          <Link href="/templates/" aria-current="page" className={styles.activeNav}>Template</Link>
          {currentUser ? <><div className={styles.shared}><NotificationBell /></div><Link href="/profile/" className={styles.profile}>{currentUser.name || "Profile"}</Link></> : <Link href="/login/">Sign in</Link>}
          <Link href={editorHref} className={styles.primary}>Open Canvas <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="templates-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>THE COMMUNITY COLLECTION</p>
            <h1 id="templates-title">Fresh inspiration.<br /><em>Your signature.</em></h1>
            <p>Explore designs from the PickMe3D community.<br />Choose a template, reimagine it and make it your own.</p>
            <a href="#collection" className={styles.explore}>EXPLORE THE COLLECTION <span aria-hidden="true">↓</span></a>
          </div>
          <div className={styles.heroArt}>
            <img src={`${basePath}/landing/creative-sculpture.webp`} alt="Monochrome 3D sculpture inspiring creative ideas" fetchPriority="high" />
            <span>CURATED BY THE COMMUNITY / PICKME3D</span>
          </div>
        </section>

        <section id="collection" className={styles.collection} aria-label="Template library">
          <div className={styles.searchRow}>
            <div className={styles.search}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
              <label className={styles.srOnly} htmlFor="template-search">Search templates</label>
              <input id="template-search" type="search" placeholder="Search by name, style or material…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button aria-label="Clear search" onClick={() => setSearchQuery("")}>×</button>}
            </div>
            <label className={styles.sort}>Sort by
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>{SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select>
            </label>
          </div>
          <div className={styles.categories} role="group" aria-label="Template style">
            {CATEGORIES.map((category) => <button key={category} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category === "Tất cả" ? "All" : category === "Dạ hội" ? "Eveningwear" : category}</button>)}
          </div>
          <div className={styles.shared}>
            <AdvancedSearchFilters selectedTags={selectedTags} onTagsChange={setSelectedTags} dateRange={dateRange} onDateRangeChange={setDateRange} forkable={forkable} onForkableChange={setForkable} />
          </div>
          <div className={styles.resultsHeading}>
            <p aria-live="polite">{loading ? "Finding inspiration…" : `${templates.length} designs${hasFilters ? " matching your filters" : " from the community"}`}</p>
            {hasFilters && <button onClick={resetFilters}>Clear all filters <span aria-hidden="true">×</span></button>}
          </div>
          {isOfflineMode && <p className={styles.notice} role="status">Showing designs available on this device. The online library is currently unavailable.</p>}

          {loading ? (
            <div className={styles.loading} role="status"><span className={styles.spinner} /><p>Loading the collection…</p></div>
          ) : templates.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.eyebrow}>{hasFilters ? "TRY A DIFFERENT PERSPECTIVE" : "A BLANK CANVAS. ENDLESS POSSIBILITIES."}</p>
              <h2>{hasFilters ? "No matching templates yet." : "The first design could be yours."}</h2>
              <p>{hasFilters ? "Try another keyword or clear your filters to explore more designs." : "Create a design in Canvas Editor and make it public to share it with the community."}</p>
              {hasFilters ? <button className={styles.primary} onClick={resetFilters}>View all templates <span aria-hidden="true">↗</span></button> : <Link href={editorHref} className={styles.primary}>Start designing <span aria-hidden="true">↗</span></Link>}
            </div>
          ) : (
            <div className={styles.grid}>{templates.map((template) => <TemplateCard key={template.id || template._id || template.title} template={template} onSelect={setSelectedTemplate} />)}</div>
          )}
        </section>
      </main>

      <div className={styles.shared}>
        <TemplateDetailModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} onTemplateUpdated={(updated) => {
          setSelectedTemplate(updated);
          setTemplates((prev) => prev.map((item) => ((item._id || item.id) === (updated._id || updated.id) ? updated : item)));
        }} />
      </div>
      <footer className={styles.footer}><Link href="/">PickMe3D</Link><p>A space for original ideas.</p><Link href={editorHref}>Start designing ↗</Link><span>© {new Date().getFullYear()} PickMe3D</span></footer>
    </div>
  );
}
