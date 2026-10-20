"use client";

import Link from "next/link";
import styles from "@/app/landing/page.module.css";
import SiteNav, { Brand, useAuthState } from "@/components/SiteNav";

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

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function ProjectLanding() {
  const auth = useAuthState();
  const { authenticated } = auth;
  const startHref = authenticated ? "/editor/" : "/login/";

  return <main className={styles.page} lang="en" id="top">
    <section className={styles.hero} aria-labelledby="hero-title">
      <video className={styles.heroVideo} src={`${basePath}/landing/pickme3d-story.mp4`} poster={`${basePath}/hero/hero-portrait.png`} autoPlay muted loop playsInline preload="auto" aria-label="PickMe3D creative workspace demo" />
      <div className={styles.heroShade}/>

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

  </main>;
}
