"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styles from "@/app/landing/page.module.css";
import { Logo } from "@/components/Logo";

// Thanh điều hướng chung của PickMe3D: trang chủ (nổi trên video) và các trang Slides, Bảng giá, Thanh toán (thanh nền mực).

export function Brand() {
  return <span className={styles.brand}><Logo size={35} color="currentColor" /><span>PickMe<span className={styles.brandLight}>3D</span></span></span>;
}

function Arrow() { return <span aria-hidden="true">↗</span>; }

export interface AuthState {
  authenticated: boolean;
  name: string;
  logout: () => void;
}

// Trạng thái đăng nhập lấy từ localStorage (token + user), đồng bộ giữa các tab
export function useAuthState(): AuthState {
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    function syncAuth() {
      const token = localStorage.getItem("pickme3d_token");
      setAuthenticated(Boolean(token));
      try { const user = JSON.parse(localStorage.getItem("pickme3d_user") ?? "null"); setName(typeof user?.name === "string" ? user.name : "Account"); }
      catch { setName("Account"); }
    }
    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  function logout() {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    setAuthenticated(false);
    setName("");
  }

  return { authenticated, name, logout };
}

export default function SiteNav({
  variant = "bar",
  active,
  auth: authProp,
  actions,
}: {
  // overlay: nổi trên video ở trang chủ; bar: thanh nền mực dính đầu trang ở các trang khác
  variant?: "overlay" | "bar";
  active?: "slides" | "templates" | "pricing";
  // Trang chủ truyền trạng thái của nó vào để nút "Start designing" và thanh nav dùng chung một nguồn
  auth?: AuthState;
  actions?: ReactNode;
}) {
  const ownAuth = useAuthState();
  const { authenticated, name, logout } = authProp || ownAuth;
  const [menuOpen, setMenuOpen] = useState(false);
  // Ở trang chủ About/Features là neo trong trang; ở trang khác thì quay về trang chủ
  const anchor = variant === "overlay" ? "" : "/";

  const header = (
    <header className={`${styles.header} ${variant === "bar" ? styles.headerBarIn : ""}`} onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
      <Link href="/" aria-label="PickMe3D — Home"><Brand/></Link>
      <div className={styles.headerActions}>
      {actions}
      <button className={styles.menuToggle} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close −" : "Menu +"}</button>
      <nav id="site-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Main navigation">
        <a href={`${anchor}#about`} onClick={() => setMenuOpen(false)}>About</a>
        <a href={`${anchor}#features`} onClick={() => setMenuOpen(false)}>Features</a>
        <Link href="/templates/" aria-current={active === "templates" ? "page" : undefined}>Template <Arrow/></Link>
        <Link href={authenticated ? "/slides/" : "/login/"} aria-current={active === "slides" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Slides <Arrow/></Link>
        <Link href="/pricing/" aria-current={active === "pricing" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Pricing <Arrow/></Link>
        {authenticated
          ? <><Link href="/profile/" className={styles.account} title={name}>{name || "Account"}</Link><button onClick={() => { logout(); setMenuOpen(false); }} className={styles.logout}>Sign out</button></>
          : <Link className={styles.login} href="/login/">Sign in <Arrow/></Link>}
      </nav>
      </div>
    </header>
  );

  if (variant === "overlay") return header;
  return <div className={styles.headerBar}>{header}</div>;
}
