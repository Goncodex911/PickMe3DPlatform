"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActivityItem, getActivity } from "@/lib/socialService";
import { getCreatorProfileHref } from "@/lib/userService";
import styles from "./activity.module.css";

function creatorHref(creator: ActivityItem["creator"]) {
  return getCreatorProfileHref(creator, creator.name) || "/templates/";
}

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just updated";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function feedErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/unauthorized|not authorized|\b401\b|session has expired/i.test(message)) {
    return "Your session has expired. Sign in again to view your activity feed.";
  }
  return "Couldn’t load the activity feed. Please try again.";
}

function FeedCard({ item }: { item: ActivityItem }) {
  const name = item.creator.name || "Creator";
  const image = item.thumbnailUrl;

  return (
    <article className={styles.activityCard}>
      <header className={styles.authorRow}>
        <Link className={styles.avatarLink} href={creatorHref(item.creator)} aria-label={`View ${name}’s profile`}>
          {item.creator.picture ? (
            <img src={item.creator.picture} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase("en-US") || "C"}</span>
          )}
        </Link>
        <div className={styles.authorInfo}>
          <Link href={creatorHref(item.creator)}>{name}</Link>
          <span>{item.creator.username ? `@${item.creator.username}` : "PickMe3D Creator"}</span>
        </div>
        <time className={styles.timestamp} dateTime={item.createdAt}>{displayDate(item.createdAt)}</time>
      </header>

      <p className={styles.activityLine}>
        <span className="material-symbols-rounded" aria-hidden="true">palette</span>
        shared a design
      </p>

      <Link className={styles.designCard} href={`/templates/${item._id}/`}>
        <div className={styles.designCover}>
          {image ? (
            <img src={image} alt={`Cover image for ${item.title}`} loading="lazy" />
          ) : (
            <div className={styles.coverFallback} aria-hidden="true">
              <span className="material-symbols-rounded">auto_awesome</span>
              <span>PickMe3D</span>
            </div>
          )}
          <span className={styles.newBadge}>New design</span>
        </div>
        <div className={styles.designInfo}>
          <div>
            <h2>{item.title || "Untitled design"}</h2>
            <p>Explore the design and view creator details.</p>
          </div>
          <span className={`material-symbols-rounded ${styles.openIcon}`} aria-hidden="true">arrow_outward</span>
        </div>
      </Link>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Loading activity feed">
      {[0, 1, 2].map((item) => <div className={styles.skeletonCard} key={item} />)}
    </div>
  );
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("pickme3d_token");
    setSignedIn(Boolean(token));
    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");
    getActivity(page)
      .then((result) => {
        if (!active) return;
        setItems((previous) => page === 1
          ? result.data
          : [...previous, ...result.data.filter((item) => !previous.some((existing) => existing._id === item._id))]);
        setMore(result.hasMore);
      })
      .catch((reason) => { if (active) setError(feedErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [page, retry]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}><span className="material-symbols-rounded" aria-hidden="true">forum</span>THE PICKME3D COMMUNITY</p>
            <h1>Activity feed</h1>
            <p className={styles.lede}>New designs from creators you follow.</p>
          </div>
          <Link className={styles.discoverButton} href="/templates/">
            <span className="material-symbols-rounded" aria-hidden="true">explore</span>
            Explore creators
          </Link>
        </header>

        <section className={styles.feed} aria-label="Designs from creators you follow">
          <div className={styles.feedHeading}>
            <span className="material-symbols-rounded" aria-hidden="true">schedule</span>
            <h2>Latest</h2>
            {items.length > 0 && <span className={styles.itemCount}>{items.length} posts</span>}
          </div>

          {!signedIn && !loading && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true"><span className="material-symbols-rounded">person_add</span></span>
              <h2>Sign in to view your activity feed</h2>
              <p>Follow creators to keep up with their latest designs.</p>
              <Link href="/login/" className={styles.discoverButton}>Sign in</Link>
            </div>
          )}

          {error && (
            <div className={styles.errorState} role="alert">
              <span className="material-symbols-rounded" aria-hidden="true">cloud_off</span>
              <p>{error}</p>
              {error.includes("Sign in again")
                ? <Link href="/login/" className={styles.errorLink}>Sign in</Link>
                : <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>}
            </div>
          )}

          {loading && page === 1 && <FeedSkeleton />}

          {signedIn && !loading && !error && items.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true"><span className="material-symbols-rounded">dynamic_feed</span></span>
              <h2>Your feed is quiet</h2>
              <p>Follow creators to see their new designs here.</p>
              <Link href="/templates/" className={styles.discoverButton}>
                <span className="material-symbols-rounded" aria-hidden="true">person_search</span>
                Find creators
              </Link>
            </div>
          )}

          {!error && items.length > 0 && (
            <div className={styles.activityList}>
              {items.map((item) => <FeedCard key={item._id} item={item} />)}
            </div>
          )}

          {more && !error && (
            <button className={styles.loadMore} type="button" disabled={loading} onClick={() => setPage((value) => value + 1)}>
              {loading ? "Loading…" : "Load more"}
              <span className="material-symbols-rounded" aria-hidden="true">expand_more</span>
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
