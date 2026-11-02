"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import styles from "@/app/landing/page.module.css";
import { Logo } from "@/components/Logo";

// Navigation is rendered once by the root layout.

export function Brand() {
  return <span className={styles.brand}><Logo size={35} color="currentColor" /><span>PickMe<span className={styles.brandLight}>3D</span></span></span>;
}

function Arrow() { return <span aria-hidden="true">↗</span>; }

export interface AuthState {
  authenticated: boolean;
  name: string;
  role: string;
  logout: () => void;
}

// Trạng thái đăng nhập lấy từ localStorage (token + user), đồng bộ giữa các tab
export function useAuthState(): AuthState {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    function syncAuth() {
      const token = localStorage.getItem("pickme3d_token");
      setAuthenticated(Boolean(token));
      try {
        const user = JSON.parse(localStorage.getItem("pickme3d_user") ?? "null");
        setName(typeof user?.name === "string" ? user.name : "Account");
        setRole(typeof user?.role === "string" ? user.role : "");
      } catch {
        setName("Account");
        setRole("");
      }
    }
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, [pathname]);

  function logout() {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    setAuthenticated(false);
    setName("");
    setRole("");
    window.dispatchEvent(new Event("storage"));
  }

  return { authenticated, name, role, logout };
}

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const ownAuth = useAuthState();
  const { authenticated, name, role, logout } = ownAuth;
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = pathname === "/" || pathname === "/landing" || pathname === "/landing/";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const syncScroll = () => setScrolled(window.scrollY > 24);
    syncScroll();
    window.addEventListener("scroll", syncScroll, { passive: true });
    return () => window.removeEventListener("scroll", syncScroll);
  }, []);
  const current = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const header = (
    <header className={`${styles.header} ${styles.headerBarIn}`} onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
      <Link href="/" aria-label="PickMe3D — Home"><Brand/></Link>
      <div className={styles.headerActions}>
      <button className={styles.menuToggle} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close −" : "Menu +"}</button>
      <nav id="site-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Main navigation">
        <Link href="/" aria-current={pathname === "/" || pathname === "/landing/" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link href="/templates/" aria-current={current("/templates") ? "page" : undefined} onClick={() => setMenuOpen(false)}>Templates</Link>
        <Link href="/blueprint-3d/" aria-current={current("/blueprint-3d") ? "page" : undefined} onClick={() => setMenuOpen(false)}>Bản Vẽ 3D</Link>
        <Link href="/ui-marketplace/" aria-current={current("/ui-marketplace") ? "page" : undefined} onClick={() => setMenuOpen(false)}>UI Marketplace</Link>
        <Link href={authenticated ? "/slides/" : "/login/"} aria-current={current("/slides") ? "page" : undefined} onClick={() => setMenuOpen(false)}>Slides</Link>
        <Link href="/pricing/" aria-current={current("/pricing") ? "page" : undefined} onClick={() => setMenuOpen(false)}>Pricing</Link>
        {authenticated && role === "admin" && (
          <Link
            href="/admin"
            aria-current={current("/admin") ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            style={{
              color: "#a5b4fc",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>admin_panel_settings</span>
            Admin
          </Link>
        )}
        {authenticated && <NotificationBell />}
        {authenticated
          ? <><Link href="/profile/" aria-current={current("/profile") ? "page" : undefined} className={styles.account} title={name}>{name || "Account"}</Link><button onClick={() => { logout(); setMenuOpen(false); router.push("/"); router.refresh(); }} className={styles.logout}>Sign out</button></>
          : <Link className={styles.login} href="/login/">Sign in <Arrow/></Link>}
        <Link className={styles.login} href={authenticated ? "/editor/" : "/login/"} onClick={() => setMenuOpen(false)}>Open Canvas <Arrow/></Link>
      </nav>
      </div>
    </header>
  );

  return <div className={`${styles.headerBar} ${isLanding ? styles.headerOverlay : ""} ${isLanding && scrolled ? styles.headerScrolled : ""}`}>{header}</div>;
}
