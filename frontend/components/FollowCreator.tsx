"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FollowState, getFollow, setFollow } from "@/lib/socialService";
import styles from "./FollowCreator.module.css";

function followErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/unauthorized|not authorized|\b401\b|session has expired/i.test(message)) {
    return "Phiên đăng nhập đã hết hạn. Đăng nhập lại để theo dõi.";
  }
  return "Không thể tải trạng thái theo dõi. Vui lòng thử lại.";
}

export default function FollowCreator({ creatorId }: { creatorId: string }) {
  const [state, setState] = useState<FollowState | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [self, setSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setState(null);
    setError("");
    const token = localStorage.getItem("pickme3d_token");
    setSignedIn(Boolean(token));
    try {
      const user = JSON.parse(localStorage.getItem("pickme3d_user") || "null");
      setSelf((user?._id || user?.id) === creatorId);
    } catch {
      setSelf(false);
    }

    if (token) {
      getFollow(creatorId)
        .then((result) => { if (active) setState(result); })
        .catch((reason) => { if (active) setError(followErrorMessage(reason)); });
    }
    return () => { active = false; };
  }, [creatorId]);

  async function toggle() {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      setState(await setFollow(creatorId, !state.following));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật theo dõi.");
    } finally {
      setBusy(false);
    }
  }

  if (self) return null;

  return (
    <div className={styles.follow}>
      {signedIn ? (
        <button
          type="button"
          className={styles.followButton}
          data-following={state?.following || false}
          disabled={busy || !state}
          aria-pressed={state?.following || false}
          onClick={toggle}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {busy ? "progress_activity" : state?.following ? "check" : "person_add"}
          </span>
          {busy ? "Đang lưu…" : state?.following ? "Đang theo dõi" : "Theo dõi Creator"}
        </button>
      ) : (
        <Link href="/login/" className={styles.followButton}>
          <span className="material-symbols-rounded" aria-hidden="true">person_add</span>
          Đăng nhập để theo dõi
        </Link>
      )}

      {state && <span className={styles.followers}>{new Intl.NumberFormat("vi-VN").format(state.followersCount)} người theo dõi</span>}
      <Link className={styles.feedLink} href="/activity/">Bảng tin hoạt động</Link>
      {error && (
        <p className={styles.error} role="alert">
          <span>{error}</span>{" "}
          {error.includes("Đăng nhập lại") ? (
            <Link href="/login/">Đăng nhập</Link>
          ) : (
            <button type="button" onClick={() => getFollow(creatorId).then(setState).catch((reason) => setError(followErrorMessage(reason)))}>
              Thử lại
            </button>
          )}
        </p>
      )}
    </div>
  );
}
