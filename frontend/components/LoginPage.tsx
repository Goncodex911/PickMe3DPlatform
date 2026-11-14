"use client";

import Link from "next/link";
import type { CredentialResponse } from "@react-oauth/google";
import GoogleSignInButton from "./GoogleSignInButton";
import { useState } from "react";
import styles from "./LoginPage.module.css";
import { trackEvent } from "@/lib/gtag";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/$/, "");

type LoginPageProps = {
  onLoginSuccess: (token: string, user: Record<string, unknown>) => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("Designer");

  async function handleSuccess({ credential }: CredentialResponse) {
    if (!credential || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.token !== "string" || !result.token || !result.user || typeof result.user !== "object" || Array.isArray(result.user)) {
        throw new Error("Unable to sign in. Please try again.");
      }
      trackEvent.login("google", (result.user as any)?.email);
      onLoginSuccess(result.token, result.user);
    } catch {
      setError("Unable to sign in. Please check your connection and try again.");
      setLoading(false);
    }
  }

  // Đăng nhập bằng email + mật khẩu (mock DB ở backend: admin / creator / buyer)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || typeof result.token !== "string" || !result.token || !result.user) {
        throw new Error(result.message || "Unable to sign in. Please try again.");
      }
      trackEvent.login("email", result.user?.email);
      onLoginSuccess(result.token, result.user);
    } catch (err) {
      const message = err instanceof Error && err.name !== "TypeError" && err.name !== "TimeoutError"
        ? err.message
        : "Unable to sign in. Please check your connection and try again.";
      setError(message);
      setLoading(false);
    }
  }

  // Đăng nhập khách: tạo tài khoản theo tên, không cần Google (dùng để thử Slide Studio và thanh toán)
  async function handleGuest() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName.trim() || "Designer" }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.token !== "string" || !result.token || !result.user) {
        throw new Error(result.message || "Unable to continue as guest.");
      }
      trackEvent.login("guest");
      onLoginSuccess(result.token, result.user);
    } catch {
      setError("Unable to continue as guest. Please check your connection and try again.");
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

        {/* Email + password login */}
        <form className={styles.emailForm} onSubmit={handleEmailLogin} inert={loading}>
          <span className={styles.or}>or sign in with email</span>
          <label className={styles.guestLabel} htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className={styles.guestInput}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />
          <label className={styles.guestLabel} htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className={styles.guestInput}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button type="submit" className={styles.emailButton}>Sign in</button>
          {process.env.NODE_ENV !== "production" && (
            <p className={styles.demoAccounts}>
              Demo: admin@ / creator@ / buyer@ / customer@ / user1@ / user2@pickme3d.local (mật khẩu đặt trong backend/.env)
            </p>
          )}
        </form>

        {/* Guest Login */}
        <form className={styles.guest} onSubmit={(event) => { event.preventDefault(); handleGuest(); }} inert={loading}>
          <span className={styles.or}>or</span>
          <label className={styles.guestLabel} htmlFor="guest-name">Display name</label>
          <div className={styles.guestRow}>
            <input
              id="guest-name"
              className={styles.guestInput}
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              maxLength={30}
              placeholder="Display name"
              autoComplete="nickname"
            />
            <button type="submit" className={styles.guestButton}>Continue as guest</button>
          </div>
        </form>

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
