"use client";

import Link from "next/link";
import type { CredentialResponse } from "@react-oauth/google";
import GoogleSignInButton from "./GoogleSignInButton";
import { useState } from "react";
import styles from "./LoginPage.module.css";
import { trackEvent } from "@/lib/gtag";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
      trackEvent.login("google", (result.user as any)?.email);
      onLoginSuccess(result.token, result.user);
    } catch {
      setError("Unable to sign in. Please check your connection and try again.");
      setLoading(false);
    }
  }

  // Đăng nhập khách: tạo tài khoản theo tên, không cần Google (dùng để thử Slide Studio và thanh toán)
  async function handleGuest() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${basePath}/api/auth/guest`, {
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

  // Admin login: đăng nhập tài khoản quản trị viên bằng email phantrongquy23032005@gmail.com
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("phantrongquy23032005@gmail.com");

  async function handleAdminLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${basePath}/api/auth/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.token !== "string" || !result.token || !result.user) {
        throw new Error(result.message || "Email không hợp lệ hoặc không có quyền quản trị viên.");
      }
      trackEvent.login("admin", adminEmail);
      onLoginSuccess(result.token, result.user);
    } catch (err: any) {
      setError(err.message || "Không thể đăng nhập tài khoản quản trị viên.");
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

        {/* Admin Login Toggle & Form */}
        <div style={{ marginTop: "18px", width: "100%", maxWidth: "340px", textAlign: "center" }}>
          {!showAdminLogin ? (
            <button
              type="button"
              onClick={() => setShowAdminLogin(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "#999",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              🔐 Đăng nhập Quản trị viên (Admin)
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.4)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>
                Đăng nhập Admin bằng Email
              </div>
              <input
                type="email"
                placeholder="phantrongquy23032005@gmail.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #444", background: "#111", color: "#fff", fontSize: "12px" }}
                required
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #444", background: "#222", color: "#aaa", fontSize: "12px", cursor: "pointer" }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: "8px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "#fff", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}
                >
                  Xác nhận Admin
                </button>
              </div>
            </form>
          )}
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
