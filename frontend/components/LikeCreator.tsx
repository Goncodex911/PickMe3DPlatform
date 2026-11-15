"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCreatorLike, setCreatorLike } from "@/lib/socialService";
import type { CreatorLikeState } from "@/lib/socialService";
import styles from "./LikeCreator.module.css";

export default function LikeCreator({ creatorId }: { creatorId: string }) {
  const [state, setState] = useState<CreatorLikeState | null>(null);
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
    getCreatorLike(creatorId)
      .then((result) => { if (active) setState(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Không thể tải lượt thích."); });
    return () => { active = false; };
  }, [creatorId]);

  async function toggle() {
    if (!state || busy) return;
    setBusy(true);
    setError("");
    try {
      setState(await setCreatorLike(creatorId, !state.liked));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật lượt thích.");
    } finally {
      setBusy(false);
    }
  }

  if (self) return null;

  return (
    <div className={styles.like}>
      {signedIn ? (
        <button
          type="button"
          className={styles.button}
          data-liked={state?.liked || false}
          disabled={busy || !state}
          aria-pressed={state?.liked || false}
          aria-label={state?.liked ? "Bỏ thích Creator" : "Thích Creator"}
          onClick={toggle}
          title={state?.liked ? "Bỏ thích Creator" : "Thích Creator"}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontVariationSettings: state?.liked ? '"FILL" 1' : '"FILL" 0' }}
          >
            {busy ? "progress_activity" : state?.liked ? "favorite" : "favorite_border"}
          </span>
        </button>
      ) : (
        <Link href="/login/" className={styles.button} aria-label="Đăng nhập để thích Creator" title="Đăng nhập để thích Creator">
          <span className="material-symbols-rounded" aria-hidden="true">favorite_border</span>
        </Link>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
