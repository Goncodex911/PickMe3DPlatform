"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FollowState, getFollow, setFollow } from "@/lib/socialService";
import styles from "./FollowCreator.module.css";

function followErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/unauthorized|not authorized|\b401\b|session has expired/i.test(message)) {
    return "Your session has expired. Sign in again to follow this creator.";
  }
  return "Couldn’t load follow status. Please try again.";
}

export default function FollowCreator({ creatorId }: { creatorId: string }) {
  const [state, setState] = useState<FollowState | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [self, setSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const syncAuth = () => setSignedIn(Boolean(localStorage.getItem("pickme3d_token")));
    window.addEventListener("storage", syncAuth);
    setState(null);
    setError("");
    const token = localStorage.getItem("pickme3d_token");
    syncAuth();
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
    return () => {
      active = false;
      window.removeEventListener("storage", syncAuth);
    };
  }, [creatorId]);

  async function toggle() {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      setState(await setFollow(creatorId, !state.following));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t update the follow status.");
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
          {busy ? "Saving…" : state?.following ? "Following" : "Follow creator"}
        </button>
      ) : (
        <Link href="/login/" className={styles.followButton}>
          <span className="material-symbols-rounded" aria-hidden="true">person_add</span>
          Sign in to follow
        </Link>
      )}

      {state && <span className={styles.followers}>{new Intl.NumberFormat("en-US").format(state.followersCount)} followers</span>}
      <Link className={styles.feedLink} href="/activity/">Activity feed</Link>
      {error && (
        <p className={styles.error} role="alert">
          <span>{error}</span>{" "}
          {error.includes("Sign in again") ? (
            <Link href="/login/">Sign in</Link>
          ) : (
            <button type="button" onClick={() => getFollow(creatorId).then(setState).catch((reason) => setError(followErrorMessage(reason)))}>
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
