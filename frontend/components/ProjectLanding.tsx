"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/landing/page.module.css";
import { Logo } from "@/components/Logo";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const features = [
  ["Visual canvas", "Arrange screens, drag and drop components, and refine every detail in your own design space."],
  ["Template library", "Find inspiration in community designs. Choose a template and make it your own."],
  ["AI-powered creativity", "Turn designs into prompts and keep building with your favorite AI tools."],
  ["Multi-screen design", "Connect screens and preview the experience directly in the editor."],
  ["Your creative collection", "Manage designs and collections in your profile. Keep the ideas you want to develop."],
  ["Export and share", "Export designs from the editor and share templates with the creative community."],
];
const collections = [
  { image: "card-couture.png", title: "Fashion & style", detail: "Fashion / Editorial" },
  { image: "card-still-life.png", title: "Products & brands", detail: "Product / Still life" },
  { image: "card-noir.png", title: "Minimal & expressive", detail: "Portrait / Monochrome" },
];

function Brand() {
  return <span className={styles.brand}><Logo size={35} color="currentColor" /><span>PickMe<span className={styles.brandLight}>3D</span></span></span>;
}
function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function ProjectLanding() {
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pickme3d_landing_theme");
      setTheme(saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    } catch {}
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("pickme3d_landing_theme", next); } catch {}
  }

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
    setMenuOpen(false);
  }
  const startHref = authenticated ? "/editor/" : "/login/";

  return <main className={styles.page} data-theme={theme} lang="en" id="top" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
    <section className={styles.hero} aria-labelledby="hero-title">
      <video className={styles.heroVideo} src={`${basePath}/landing/pickme3d-story.mp4`} poster={`${basePath}/hero/hero-portrait.png`} autoPlay muted loop playsInline preload="auto" aria-label="PickMe3D creative workspace demo" />
      <div className={styles.heroShade}/>
      <header className={styles.header}>
        <Link href="/" aria-label="PickMe3D — Home"><Brand/></Link>
        <div className={styles.headerActions}>
        <button className={styles.themeToggle} onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            {theme === "dark" ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>}
          </svg>
        </button>
        <button className={styles.menuToggle} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="landing-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close −" : "Menu +"}</button>
        <nav id="landing-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Main navigation">
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <Link href="/templates/">Template <Arrow/></Link>
          {authenticated ? <><Link href="/profile/" className={styles.account} title={name}>{name || "Account"}</Link><button onClick={logout} className={styles.logout}>Sign out</button></> : <Link className={styles.login} href="/login/">Sign in <Arrow/></Link>}
        </nav>
        </div>
      </header>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>YOUR IDEAS. YOUR CANVAS.</p>
        <h1 id="hero-title">Your ideas.<br/>No limits.</h1>
        <p className={styles.heroDescription}>Design visually. Create with AI.<br/>Turn inspiration into experiences with PickMe3D.</p>
        <Link href={startHref} className={styles.button}>Start designing <Arrow/></Link>
      </div>
      <div className={styles.heroBottom}><a href="#about">DISCOVER PICKME3D <span aria-hidden="true">↓</span></a></div>
    </section>

    <section id="about" className={`${styles.section} ${styles.about}`} aria-labelledby="about-title">
      <div className={styles.aboutImage}><img src={`${basePath}/landing/creative-sculpture.webp`} alt="Animated monochrome 3D sculpture with flowing ribbons, glass and a metal frame" loading="lazy"/><span>01 / THE CREATIVE SPACE</span></div>
      <div className={styles.aboutCopy}><p className={styles.eyebrow}>YOUR CREATIVE SPACE</p><h2 id="about-title">From inspiration.<br/>To creation.</h2><p>PickMe3D brings ideas, tools and community together. Build interfaces with Canvas Editor, explore templates and shape every design your way.</p><p>Start with a blank canvas or a spark of inspiration. Make every detail your own.</p><a href="#features" className={styles.grayButton}>Explore the tools <Arrow/></a></div>
    </section>
    <section className={styles.manifesto} aria-label="Our creative philosophy"><p>“You bring the ideas.<br/>PickMe3D opens the possibilities.”</p><span>DESIGN IT YOUR WAY</span></section>

    <section id="features" className={`${styles.section} ${styles.features}`} aria-labelledby="features-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ONE PLATFORM. ENDLESS POSSIBILITIES.</p><h2 id="features-title">Tools for<br/>every idea.</h2></div><Link href={startHref} className={styles.textLink}>Open Canvas Editor <Arrow/></Link></div>
      <div className={styles.featureRow}><div className={styles.featureImage}><img src={`${basePath}/hero/card-still-life.png`} alt="Visual inspiration for interface design" loading="lazy"/></div><div className={styles.featureList}>{features.slice(0,3).map(([title,description],i)=><article className={styles.feature} key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></div>
      <div className={`${styles.featureRow} ${styles.featureRowReverse}`}><div className={styles.featureList}>{features.slice(3).map(([title,description],i)=><article className={styles.feature} key={title}><span>0{i+4}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div><div className={styles.featureImage}><img src={`${basePath}/hero/card-couture.png`} alt="Fashion inspiration for distinctive designs" loading="lazy"/></div></div>
    </section>

    <section className={`${styles.section} ${styles.inspiration}`} aria-labelledby="inspiration-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>START WITH INSPIRATION</p><h2 id="inspiration-title">Your style.<br/>Your starting point.</h2></div><p>Explore the visual styles you love, then find your next template in the community library.</p></div>
      <div className={styles.collectionGrid}>{collections.map(item=><Link href="/templates/" key={item.title} className={styles.collection}><div className={styles.collectionImage}><img src={`${basePath}/hero/${item.image}`} alt={item.title} loading="lazy"/></div><div className={styles.collectionLabel}><div><span>{item.detail}</span><h3>{item.title}</h3></div><Arrow/></div></Link>)}</div>
      <div className={styles.inspirationBottom}><p>Every idea starts somewhere.<br/>Find your inspiration in the template library.</p><Link href="/templates/" className={styles.darkButton}>Explore all templates <Arrow/></Link></div>
    </section>

    <section className={`${styles.section} ${styles.finalCta}`} aria-labelledby="cta-title"><div><p className={styles.eyebrow}>YOUR NEXT CREATIVE CHAPTER</p><h2 id="cta-title">Let’s create<br/>something different.</h2><p>Your next idea is waiting.<br/>Open a canvas and start today.</p><Link href={startHref} className={styles.button}>Start designing <Arrow/></Link></div><div className={styles.ctaImage}><img src={`${basePath}/hero/card-kinetic.png`} alt="Creative energy in motion" loading="lazy"/></div></section>
    <footer className={styles.footer}><Link href="/" aria-label="PickMe3D — Home"><Brand/></Link><p>A space for original ideas.</p><nav aria-label="Footer links"><Link href="/templates/">Template library</Link><Link href={authenticated ? "/profile/" : "/login/"}>{authenticated ? "My designs" : "Sign in"}</Link><a href="#top">Back to top ↑</a></nav><span>© {new Date().getFullYear()} PickMe3D</span></footer>
  </main>;
}
