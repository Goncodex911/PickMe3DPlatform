"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActivityItem, getActivity } from "@/lib/socialService";
import styles from "./activity.module.css";

function creatorHref(username?: string) {
  return username ? `/creator/?username=${encodeURIComponent(username)}` : "/templates/";
}

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function feedErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/unauthorized|not authorized|\b401\b|session has expired/i.test(message)) {
    return "Phiên đăng nhập đã hết hạn. Đăng nhập lại để xem bảng tin.";
  }
  return "Không thể tải bảng tin lúc này. Vui lòng thử lại.";
}

function FeedCard({ item }: { item: ActivityItem }) {
  const name = item.creator.name || "Creator";
  const image = item.thumbnailUrl;

  return (
    <article className={styles.activityCard}>
      <header className={styles.authorRow}>
        <Link className={styles.avatarLink} href={creatorHref(item.creator.username)} aria-label={`Xem hồ sơ ${name}`}>
          {item.creator.picture ? (
            <img src={item.creator.picture} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "C"}</span>
          )}
        </Link>
        <div className={styles.authorInfo}>
          <Link href={creatorHref(item.creator.username)}>{name}</Link>
          <span>{item.creator.username ? `@${item.creator.username}` : "PickMe3D Creator"}</span>
        </div>
        <time className={styles.timestamp} dateTime={item.createdAt}>{displayDate(item.createdAt)}</time>
      </header>

      <p className={styles.activityLine}>
        <span className="material-symbols-rounded" aria-hidden="true">palette</span>
        vừa chia sẻ một thiết kế
      </p>

      <Link className={styles.designCard} href={`/templates/${item._id}/`}>
        <div className={styles.designCover}>
          {image ? (
            <img src={image} alt={`Ảnh bìa thiết kế ${item.title}`} loading="lazy" />
          ) : (
            <div className={styles.coverFallback} aria-hidden="true">
              <span className="material-symbols-rounded">auto_awesome</span>
              <span>PickMe3D</span>
            </div>
          )}
          <span className={styles.newBadge}>Thiết kế mới</span>
        </div>
        <div className={styles.designInfo}>
          <div>
            <h2>{item.title || "Thiết kế chưa đặt tên"}</h2>
            <p>Khám phá thiết kế và xem thông tin Creator.</p>
          </div>
          <span className={`material-symbols-rounded ${styles.openIcon}`} aria-hidden="true">arrow_outward</span>
        </div>
      </Link>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Đang tải bảng tin">
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
            <p className={styles.eyebrow}><span className="material-symbols-rounded" aria-hidden="true">forum</span>CỘNG ĐỒNG PICKME3D</p>
            <h1>Bảng tin hoạt động</h1>
            <p className={styles.lede}>Thiết kế mới từ Creator bạn theo dõi.</p>
          </div>
          <Link className={styles.discoverButton} href="/templates/">
            <span className="material-symbols-rounded" aria-hidden="true">explore</span>
            Khám phá Creator
          </Link>
        </header>

        <section className={styles.feed} aria-label="Thiết kế từ Creator bạn theo dõi">
          <div className={styles.feedHeading}>
            <span className="material-symbols-rounded" aria-hidden="true">schedule</span>
            <h2>Mới nhất</h2>
            {items.length > 0 && <span className={styles.itemCount}>{items.length} bài đăng</span>}
          </div>

          {!signedIn && !loading && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true"><span className="material-symbols-rounded">person_add</span></span>
              <h2>Đăng nhập để xem bảng tin</h2>
              <p>Theo dõi Creator để cập nhật những thiết kế mới nhất.</p>
              <Link href="/login/" className={styles.discoverButton}>Đăng nhập</Link>
            </div>
          )}

          {error && (
            <div className={styles.errorState} role="alert">
              <span className="material-symbols-rounded" aria-hidden="true">cloud_off</span>
              <p>{error}</p>
              {error.includes("Đăng nhập lại")
                ? <Link href="/login/" className={styles.errorLink}>Đăng nhập</Link>
                : <button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>}
            </div>
          )}

          {loading && page === 1 && <FeedSkeleton />}

          {signedIn && !loading && !error && items.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true"><span className="material-symbols-rounded">dynamic_feed</span></span>
              <h2>Bảng tin đang yên ắng</h2>
              <p>Theo dõi Creator để thấy thiết kế mới của họ ở đây.</p>
              <Link href="/templates/" className={styles.discoverButton}>
                <span className="material-symbols-rounded" aria-hidden="true">person_search</span>
                Tìm Creator
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
              {loading ? "Đang tải…" : "Tải thêm"}
              <span className="material-symbols-rounded" aria-hidden="true">expand_more</span>
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
