"use client";

import Link from "next/link";
import type { CredentialResponse } from "@react-oauth/google";
import GoogleSignInButton from "./GoogleSignInButton";
import { useState } from "react";
import styles from "./LoginPage.module.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type LoginPageProps = {
  onLoginSuccess: (token: string, user: Record<string, unknown>) => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSuccess({ credential }: CredentialResponse) {
    if (!credential || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${basePath}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.token !== "string" || !result.token || !result.user || typeof result.user !== "object" || Array.isArray(result.user)) {
        throw new Error("Unable to sign in. Please try again.");
      }
      onLoginSuccess(result.token, result.user);
    } catch {
      setError("Unable to sign in. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.page} lang="en">
      <img
        className={styles.background}
        src={`${basePath}/landing/creative-sculpture.webp`}
        alt=""
        fetchPriority="high"
      />
      <div className={styles.shade} />

      <header className={styles.header}>
        <Link href="/" className={styles.home} aria-label="Back to PickMe3D home">
          <svg viewBox="0 0 40 44" fill="currentColor" aria-hidden="true">
            <path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" />
          </svg>
          <span>PickMe3D</span>
        </Link>
        <Link href="/" className={styles.back}>Back to home <span aria-hidden="true">↗</span></Link>
      </header>

      <section className={styles.content} aria-labelledby="login-title">
        <p className={styles.eyebrow}>YOUR CREATIVE SPACE</p>
        <h1 id="login-title">PickMe3D</h1>
        <p className={styles.subtitle}>Bring your ideas to life.</p>
        <p className={styles.description}>
          Sign in to start designing, explore templates{" "}<br className={styles.desktopBreak} />
          and make your creative mark.
        </p>

        <div className={styles.auth} aria-busy={loading}>
          <div inert={loading} style={{ display: loading ? "none" : undefined }}>
            <GoogleSignInButton
              onSuccess={handleSuccess}
              onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
            />
          </div>
          {loading && <div className={styles.loading} role="status"><span className={styles.spinner} />Signing in…</div>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
        <p className={styles.authNote}>One account. Every idea. All in PickMe3D.</p>
      </section>

      <footer className={styles.footer}>
        <nav aria-label="Explore PickMe3D">
          <Link href="/landing/#about">About PickMe3D <span aria-hidden="true">↗</span></Link>
          <Link href="/templates/">Template library <span aria-hidden="true">↗</span></Link>
          <Link href="/landing/#features">Creative tools <span aria-hidden="true">↗</span></Link>
        </nav>
        <p>FOR EVERY STYLE.<br />FOR EVERY ORIGINAL IDEA.</p>
      </footer>
    </main>
  );
}
