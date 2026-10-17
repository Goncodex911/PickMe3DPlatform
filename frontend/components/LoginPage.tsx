"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";

interface ProjectDetail {
  title: string;
  tag: string;
  year: string;
  desc: string;
}

const PROJECTS_DATA: Record<string, ProjectDetail> = {
  card1: {
    title: "Haute Couture Editorial",
    tag: "Visual Story · Paris",
    year: "2026",
    desc: "A cinematic street-style exploration merging human tailoring with generative volumetric lighting.",
  },
  card2: {
    title: "L'Heure Verte Still Life",
    tag: "Product Campaign",
    year: "2026",
    desc: "Sensory ambient product rendering with realistic smoke diffusion and tactile marble textures.",
  },
  card3: {
    title: "Veil & Shadows Noir",
    tag: "Monochrome Portrait",
    year: "2026",
    desc: "Fine-art photographic study on translucency, gaze, and algorithmic chiffon simulation.",
  },
  card4: {
    title: "Ceremonial Matcha Ritual",
    tag: "Beverage Campaign",
    year: "2026",
    desc: "Macro condensation details and textured ceramic styling under warm directional spotlights.",
  },
  card5: {
    title: "Wimbledon Kinetic Motion",
    tag: "Sports High-Speed",
    year: "2026",
    desc: "Long-exposure kinetic blur capturing physical athletic power through generative motion synthesis.",
  },
  card6: {
    title: "Golden Hour Cruiser",
    tag: "Automotive Dusk",
    year: "2026",
    desc: "Atmospheric twilight lighting along highway horizons with anamorphic lens flares.",
  },
  card7: {
    title: "Nocturne Profile",
    tag: "Jewelry Campaign",
    year: "2026",
    desc: "Specular metallic reflections on silver jewelry with deep obsidian chiaroscuro shadows.",
  },
};

interface FloatingCardConfig {
  id: string;
  src: string;
  alt: string;
  className: string;
  parallaxX: number;
  parallaxY: number;
  lerpSpeed: number;
  projectKey: string;
}

const FLOATING_CARDS: FloatingCardConfig[] = [
  {
    id: "card1",
    src: "/hero/card-couture.png",
    alt: "Haute Couture Editorial",
    className: "top-[5%] left-[8.5%] w-[8.2%] aspect-[3/4]",
    parallaxX: -26,
    parallaxY: -20,
    lerpSpeed: 0.06,
    projectKey: "card1",
  },
  {
    id: "card2",
    src: "/hero/card-still-life.png",
    alt: "L'Heure Verte Still Life",
    className: "top-[41%] left-[1.2%] w-[10.2%] aspect-[4/3]",
    parallaxX: 18,
    parallaxY: 15,
    lerpSpeed: 0.05,
    projectKey: "card2",
  },
  {
    id: "card3",
    src: "/hero/card-noir.png",
    alt: "Veil & Shadows Noir",
    className: "top-[71.5%] left-[8.5%] w-[8.2%] aspect-[3/4]",
    parallaxX: -28,
    parallaxY: 22,
    lerpSpeed: 0.07,
    projectKey: "card3",
  },
  {
    id: "card4",
    src: "/hero/card-matcha.png",
    alt: "Ceremonial Matcha Ritual",
    className: "top-[1.2%] right-[8.8%] w-[8%] aspect-[4/4.8]",
    parallaxX: 15,
    parallaxY: -12,
    lerpSpeed: 0.045,
    projectKey: "card4",
  },
  {
    id: "card5",
    src: "/hero/card-kinetic.png",
    alt: "Wimbledon Kinetic Motion",
    className: "top-[19%] right-[1.2%] w-[10.2%] aspect-[1/1]",
    parallaxX: -22,
    parallaxY: -25,
    lerpSpeed: 0.06,
    projectKey: "card5",
  },
  {
    id: "card6",
    src: "/hero/card-cruiser.png",
    alt: "Golden Hour Cruiser",
    className: "top-[59.5%] right-[8.8%] w-[8.2%] aspect-[4/3]",
    parallaxX: 30,
    parallaxY: 24,
    lerpSpeed: 0.075,
    projectKey: "card6",
  },
  {
    id: "card7",
    src: "/hero/card-nocturne.jpg",
    alt: "Nocturne Profile",
    className: "top-[79.5%] right-[1.2%] w-[10.2%] aspect-[3/4]",
    parallaxX: -16,
    parallaxY: 18,
    lerpSpeed: 0.05,
    projectKey: "card7",
  },
];

export default function LoginPage({
  onLoginSuccess,
}: {
  onLoginSuccess: (token: string, user: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("Designer");
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);

  // Stage element refs
  const heroStageRef = useRef<HTMLDivElement>(null);
  const portraitWrapRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const bottomLabelsRef = useRef<HTMLDivElement>(null);

  // Motion physics state
  const mouseStateRef = useRef({
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    targetOpacity: 0,
    targetChroma: 0,
    // Eased values for 0.6s lerp inertia
    currentOffsetX: 0,
    currentOffsetY: 0,
    currentOpacity: 0,
    currentChroma: 0,
    // Normalized cursor from center for parallax (-1 to 1)
    normX: 0,
    normY: 0,
    // Parallax positions for floating cards
    cardOffsets: FLOATING_CARDS.map(() => ({ x: 0, y: 0 })),
  });

  // Setup GSAP 1.5s intro animation on page load and lock body styles
  useEffect(() => {
    document.body.style.backgroundColor = "#5882a6";
    document.body.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      // Initial placement before intro settles
      gsap.set(portraitWrapRef.current, {
        y: 80,
        scale: 0.92,
        opacity: 0,
      });

      gsap.set(".hero-word", {
        y: 55,
        opacity: 0,
        rotate: 1.2,
      });

      gsap.set(".hero-kicker", {
        y: -15,
        opacity: 0,
      });

      gsap.set(".hero-floating-card-item", {
        opacity: 0,
        scale: 0.85,
        y: (i) => (i % 2 === 0 ? -40 : 40),
        x: (i) => (i < 3 ? -35 : 35),
      });

      gsap.set(navbarRef.current, {
        y: -35,
        opacity: 0,
      });

      gsap.set(bottomLabelsRef.current, {
        y: 25,
        opacity: 0,
      });

      // 1.5s orchestrated intro sequence
      tl.to(navbarRef.current, {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "power2.out",
      })
        .to(
          ".hero-kicker",
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
          },
          "-=0.9"
        )
        .to(
          ".hero-word",
          {
            y: 0,
            opacity: 1,
            rotate: 0,
            duration: 1.4,
            stagger: 0.1,
            ease: "power3.out",
          },
          "-=0.8"
        )
        .to(
          portraitWrapRef.current,
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 1.5,
            ease: "power3.out",
          },
          "-=1.3"
        )
        .to(
          ".hero-floating-card-item",
          {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            duration: 1.4,
            stagger: 0.08,
            ease: "power3.out",
          },
          "-=1.3"
        )
        .to(
          bottomLabelsRef.current,
          {
            y: 0,
            opacity: 1,
            duration: 1.0,
            ease: "power2.out",
          },
          "-=1.0"
        );
    });

    return () => {
      ctx.revert();
      document.body.style.backgroundColor = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Cursor-velocity tracking and 60fps lerp inertia loop
  useEffect(() => {
    let animId: number;
    const ms = mouseStateRef.current;

    // Cache DOM references once to ensure peak 60fps performance
    const redGhosts = Array.from(document.querySelectorAll<HTMLElement>(".motion-ghost-red"));
    const cyanGhosts = Array.from(document.querySelectorAll<HTMLElement>(".motion-ghost-cyan"));
    const cardElements = FLOATING_CARDS.map((cfg) => document.getElementById(`hero-card-${cfg.id}`));

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(now - ms.lastTime, 14);

      if (ms.lastTime > 0) {
        const dx = e.clientX - ms.lastX;
        const dy = e.clientY - ms.lastY;

        // Velocity in px per ~16.6ms frame
        const vx = (dx / dt) * 16.67;
        const vy = (dy / dt) * 16.67;
        const speed = Math.hypot(vx, vy);

        // Normalize direction with diagonal down-right bias
        const dirX = vx / (speed || 1);
        const dirY = vy / (speed || 1);

        // Down-right diagonal bias vector (0.7, 0.7) blended with motion direction
        const biasedX = dirX * 0.72 + 0.68;
        const biasedY = dirY * 0.72 + 0.68;
        const biasLen = Math.hypot(biasedX, biasedY) || 1;

        // Proportional to speed, max ~26px offset
        const speedRatio = Math.min(speed / 18, 1);
        const offsetMag = speedRatio * 26;

        ms.targetOffsetX = (biasedX / biasLen) * offsetMag;
        ms.targetOffsetY = (biasedY / biasLen) * offsetMag;
        ms.targetOpacity = speedRatio * 0.52;
        ms.targetChroma = speedRatio * 3.6;
      }

      ms.lastX = e.clientX;
      ms.lastY = e.clientY;
      ms.lastTime = now;

      // Normalized coordinates from center (-1 to 1) for parallax
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      ms.normX = (e.clientX - halfW) / halfW;
      ms.normY = (e.clientY - halfH) / halfH;
    };

    const onPointerLeave = () => {
      ms.targetOffsetX = 0;
      ms.targetOffsetY = 0;
      ms.targetOpacity = 0;
      ms.targetChroma = 0;
      ms.normX = 0;
      ms.normY = 0;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });

    // 60FPS RAF Loop: Lerp inertia easing (~0.6s decay: factor 0.08)
    const LERP_FACTOR = 0.08;

    const render = (time: number) => {
      // If mouse stopped moving for more than 45ms, ease targets smoothly back to 0
      if (time - ms.lastTime > 45) {
        ms.targetOffsetX = 0;
        ms.targetOffsetY = 0;
        ms.targetOpacity = 0;
        ms.targetChroma = 0;
      }

      // 1. Lerp cursor velocity ghost values
      ms.currentOffsetX += (ms.targetOffsetX - ms.currentOffsetX) * LERP_FACTOR;
      ms.currentOffsetY += (ms.targetOffsetY - ms.currentOffsetY) * LERP_FACTOR;
      ms.currentOpacity += (ms.targetOpacity - ms.currentOpacity) * LERP_FACTOR;
      ms.currentChroma += (ms.targetChroma - ms.currentChroma) * LERP_FACTOR;

      const gx = ms.currentOffsetX;
      const gy = ms.currentOffsetY;
      const gOp = ms.currentOpacity;
      const ch = ms.currentChroma;

      // Chromatic Red channel split (slightly accelerated & shifted)
      for (let i = 0; i < redGhosts.length; i++) {
        const el = redGhosts[i];
        if (el) {
          el.style.transform = `translate3d(${(gx * 1.1 + ch).toFixed(2)}px, ${(gy * 1.1 + ch * 0.5).toFixed(2)}px, 0)`;
          el.style.opacity = (gOp * 0.75).toFixed(3);
        }
      }

      // Chromatic Cyan/Blue channel split (slightly decelerated & opposite shift)
      for (let i = 0; i < cyanGhosts.length; i++) {
        const el = cyanGhosts[i];
        if (el) {
          el.style.transform = `translate3d(${(gx * 0.9 - ch).toFixed(2)}px, ${(gy * 0.9 - ch * 0.5).toFixed(2)}px, 0)`;
          el.style.opacity = (gOp * 0.75).toFixed(3);
        }
      }

      // 2. Lerp mouse parallax for floating side cards
      for (let idx = 0; idx < FLOATING_CARDS.length; idx++) {
        const cfg = FLOATING_CARDS[idx];
        const cardEl = cardElements[idx];
        if (!cardEl) continue;

        const targetCardX = ms.normX * cfg.parallaxX;
        const targetCardY = ms.normY * cfg.parallaxY;
        const cur = ms.cardOffsets[idx];

        cur.x += (targetCardX - cur.x) * cfg.lerpSpeed;
        cur.y += (targetCardY - cur.y) * cfg.lerpSpeed;

        cardEl.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const handleGuest = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName.trim() || "Designer" }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError("Không tạo được nick: " + (data.message || "Máy chủ từ chối"));
      }
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = "/api/auth/google";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError("Đăng nhập thất bại: " + (data.message || "Xác thực không hợp lệ"));
      }
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative w-full h-screen overflow-hidden flex items-center justify-center select-none"
      style={{
        backgroundColor: "#5882a6",
        background: "radial-gradient(circle at 50% 48%, #628ea8 0%, #4d7593 100%)",
      }}
    >
      {/* 
        Master 4:3 Proportional Stage Container:
        Scales fluidly to fit within any screen viewport while preserving 
        the exact editorial composition and pixel-perfect spatial relationship.
      */}
      <div
        ref={heroStageRef}
        className="relative w-full h-full max-w-[1360px] max-h-[1020px] aspect-[4/3] flex items-center justify-center overflow-hidden"
      >
        {/* ------------------------------------------------------------- */}
        {/* 1. LAYER: LARGE ITALIC SERIF HEADLINE (With Motion Ghost Trail) */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute top-[48%] -translate-y-1/2 left-0 right-0 flex flex-col items-center justify-center z-1 pointer-events-none px-4">
          {/* Subtitle / Kicker */}
          <div className="hero-kicker text-center mb-1">
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: "0.28em",
              }}
              className="text-white/85 text-[11px] sm:text-[13px] font-medium uppercase tracking-[0.28em]"
            >
              HUMAN X AI
            </span>
          </div>

          {/* Main Large Italic Serif Headline */}
          <div className="relative text-center w-full">
            {/* Base Crisp Headline */}
            <h1
              className="relative font-normal text-white text-center leading-[0.88] tracking-tight z-2"
              style={{
                fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "clamp(3.8rem, 8.8vw, 9.6rem)",
                textShadow: "0 4px 24px rgba(0, 0, 0, 0.14)",
              }}
            >
              <div className="hero-word">Generative Creative</div>
              <div className="hero-word">Studio</div>
            </h1>

            {/* Ghost Trail: Red Chromatic Echo */}
            <h1
              aria-hidden="true"
              className="motion-ghost-red absolute inset-0 font-normal text-center leading-[0.88] tracking-tight pointer-events-none z-1"
              style={{
                fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "clamp(3.8rem, 8.8vw, 9.6rem)",
                color: "rgba(255, 60, 80, 0.45)",
                filter: "drop-shadow(2px 1px 0px rgba(239, 68, 68, 0.5)) blur(0.6px)",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <div>Generative Creative</div>
              <div>Studio</div>
            </h1>

            {/* Ghost Trail: Cyan Chromatic Echo */}
            <h1
              aria-hidden="true"
              className="motion-ghost-cyan absolute inset-0 font-normal text-center leading-[0.88] tracking-tight pointer-events-none z-1"
              style={{
                fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "clamp(3.8rem, 8.8vw, 9.6rem)",
                color: "rgba(34, 211, 238, 0.45)",
                filter: "drop-shadow(-2px -1px 0px rgba(6, 182, 212, 0.5)) blur(0.6px)",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <div>Generative Creative</div>
              <div>Studio</div>
            </h1>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. LAYER: CENTRAL PORTRAIT (With Motion Ghost Trail) */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={portraitWrapRef}
          className="hero-portrait-wrap absolute bottom-[0%] left-1/2 -translate-x-1/2 w-[48%] max-w-[620px] aspect-[1800/1680] z-3 pointer-events-none flex items-end justify-center"
        >
          {/* Ghost Trail: Red Chromatic Duplicate */}
          <div
            className="motion-ghost-red absolute inset-0 pointer-events-none"
            style={{
              opacity: 0,
              willChange: "transform, opacity",
              filter: "drop-shadow(2.5px 1.5px 0px rgba(239, 68, 68, 0.65)) contrast(1.1)",
            }}
          >
            <img
              src="/hero/hero-portrait.png"
              alt=""
              className="w-full h-full object-contain pointer-events-none opacity-40 mix-blend-screen"
            />
          </div>

          {/* Ghost Trail: Cyan Chromatic Duplicate */}
          <div
            className="motion-ghost-cyan absolute inset-0 pointer-events-none"
            style={{
              opacity: 0,
              willChange: "transform, opacity",
              filter: "drop-shadow(-2.5px -1.5px 0px rgba(56, 189, 248, 0.65)) contrast(1.1)",
            }}
          >
            <img
              src="/hero/hero-portrait.png"
              alt=""
              className="w-full h-full object-contain pointer-events-none opacity-40 mix-blend-screen"
            />
          </div>

          {/* Main Crisp Central Portrait Cutout */}
          <img
            src="/hero/hero-portrait.png"
            alt="Pick Me Portrait"
            className="relative w-full h-full object-contain pointer-events-none z-2 drop-shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
          />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. LAYER: FLOATING SIDE IMAGES (Parallax + Ghost Motion Effect) */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 pointer-events-none z-4">
          {FLOATING_CARDS.map((card) => (
            <div
              key={card.id}
              id={`hero-card-${card.id}`}
              className={`hero-floating-card-item absolute ${card.className} pointer-events-auto cursor-pointer`}
              onClick={() => setActiveProject(PROJECTS_DATA[card.projectKey])}
              title={card.alt}
            >
              {/* Ghost Trail: Red Channel */}
              <div
                className="motion-ghost-red absolute inset-0 rounded-[10px] pointer-events-none overflow-hidden"
                style={{
                  opacity: 0,
                  willChange: "transform, opacity",
                  filter: "drop-shadow(2px 1px 0px rgba(239, 68, 68, 0.7))",
                }}
              >
                <img
                  src={card.src}
                  alt=""
                  className="w-full h-full object-cover opacity-50 mix-blend-screen"
                />
              </div>

              {/* Ghost Trail: Cyan Channel */}
              <div
                className="motion-ghost-cyan absolute inset-0 rounded-[10px] pointer-events-none overflow-hidden"
                style={{
                  opacity: 0,
                  willChange: "transform, opacity",
                  filter: "drop-shadow(-2px -1px 0px rgba(56, 189, 248, 0.7))",
                }}
              >
                <img
                  src={card.src}
                  alt=""
                  className="w-full h-full object-cover opacity-50 mix-blend-screen"
                />
              </div>

              {/* Base Crisp Floating Card */}
              <div className="relative w-full h-full rounded-[10px] overflow-hidden shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-transform duration-300 ring-1 ring-white/10 group">
                <img
                  src={card.src}
                  alt={card.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                />
                {/* Subtle soft glass sheen on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. LAYER: BOTTOM EDITORIAL LABELS & HOTSPOTS */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={bottomLabelsRef}
          className="absolute bottom-[2.5%] left-0 right-0 px-[2.8%] flex items-center justify-between text-white/90 z-10 pointer-events-none"
        >
          {/* Left: Visual Stories Hotspot */}
          <button
            type="button"
            onClick={() => setActiveProject(PROJECTS_DATA.card1)}
            className="pointer-events-auto text-left hover:text-white transition-colors cursor-pointer outline-none focus:outline-none ring-0 border-none group"
            title="Visual Stories"
          >
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-xs sm:text-[13px] font-medium tracking-wider group-hover:underline underline-offset-4"
            >
              Visual Stories
            </span>
          </button>

          {/* Center: Mission statement */}
          <div className="hidden sm:block text-center max-w-sm px-4">
            <p
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-[11px] text-white/75 leading-relaxed font-normal"
            >
              Creative studio merging human art direction with generative imagery, video, and motion.
            </p>
          </div>

          {/* Right: Brand Campaigns Hotspot */}
          <button
            type="button"
            onClick={() => setActiveProject(PROJECTS_DATA.card6)}
            className="pointer-events-auto text-right hover:text-white transition-colors cursor-pointer outline-none focus:outline-none ring-0 border-none group"
            title="Brand Campaigns"
          >
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-xs sm:text-[13px] font-medium tracking-wider group-hover:underline underline-offset-4"
            >
              Brand Campaigns
            </span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. LAYER: INTERACTIVE TOP PILL NAVBAR (PICK ME Branding) */}
        {/* ------------------------------------------------------------- */}
        <header
          ref={navbarRef}
          className="absolute top-[2.2%] left-1/2 -translate-x-1/2 w-[248px] sm:w-[264px] h-[44px] flex items-center justify-between px-2.5 z-20 cursor-pointer rounded-full backdrop-blur-md border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          style={{
            backgroundColor: "rgba(18, 25, 38, 0.45)",
          }}
          onClick={() => setMenuOpen(true)}
          title="Mở menu & Đăng nhập Pick Me"
        >
          {/* Left Theme Sun Button Area */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all outline-none focus:outline-none ring-0 border-none cursor-pointer"
            title="Theme / Menu"
          >
            <span
              className="material-symbols-rounded text-white/80 hover:text-white transition-colors"
              style={{ fontSize: "19px" }}
            >
              light_mode
            </span>
          </button>

          {/* Center Brand Text: PICK ME */}
          <div
            className="flex-1 flex items-center justify-center cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <span
              style={{
                fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                letterSpacing: "0.08em",
              }}
              className="text-white text-lg sm:text-[19px] font-normal hover:opacity-90 transition-opacity"
            >
              PICK ME
            </span>
          </div>

          {/* Right Red Hamburger Menu Pill (Active Login Trigger) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
            className="w-[44px] h-[32px] rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 transition-all outline-none focus:outline-none ring-0 border-none cursor-pointer shadow-[0_0_16px_rgba(229,43,43,0.55)]"
            title="Đăng nhập tài khoản Google"
          >
            <div className="flex flex-col gap-[3px] items-center justify-center">
              <span className="w-3.5 h-[1.5px] bg-white rounded-full" />
              <span className="w-3.5 h-[1.5px] bg-white rounded-full" />
            </div>
          </button>
        </header>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLOATING SUBTLE LOGIN CALLOUT AT VIEWPORT BOTTOM */}
      {/* ------------------------------------------------------------- */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        onClick={() => setMenuOpen(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full border border-white/20 bg-black/60 backdrop-blur-md text-white text-xs tracking-wider flex items-center gap-2.5 hover:bg-black/80 hover:border-white/40 transition-all z-30 shadow-xl cursor-pointer outline-none focus:outline-none ring-0"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
        <span className="font-medium font-sans">NHẤN NÚT ĐỎ HOẶC VÀO ĐÂY ĐỂ ĐĂNG NHẬP PICK ME</span>
      </motion.button>

      {/* ------------------------------------------------------------- */}
      {/* HIGH-FASHION EDITORIAL AUTHENTICATION MODAL */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-[32px] p-8 sm:p-10 flex flex-col items-center text-center border shadow-2xl z-10"
              style={{
                backgroundColor: "#0d131f",
                borderColor: "rgba(255, 255, 255, 0.14)",
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(229, 43, 43, 0.18)",
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer outline-none focus:outline-none ring-0"
                title="Đóng"
              >
                <span className="material-symbols-rounded" style={{ fontSize: "20px" }}>close</span>
              </button>

              {/* Top Editorial Label */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 border border-white/10 bg-white/5">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-[10px] tracking-widest text-slate-300 font-mono uppercase">
                  Pick Me Studio
                </span>
              </div>

              {/* Main Headline */}
              <h2
                className="text-3xl sm:text-4xl font-normal text-white mb-2"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                Welcome to Pick Me
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-xs leading-relaxed font-sans">
                Đăng nhập tài khoản Google để bắt đầu thiết kế 3D, tạo chiến dịch và đồng bộ hóa không gian sáng tạo.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-5 px-4 py-2.5 rounded-xl border text-xs text-rose-300 bg-rose-500/10 border-rose-500/30 flex items-center gap-2 w-full text-left">
                  <span className="material-symbols-rounded text-rose-400" style={{ fontSize: "18px" }}>error</span>
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Google Login Component */}
              {loading ? (
                <div className="flex flex-col items-center justify-center h-14 w-full gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-red-500 border-r-white" />
                  <span className="text-xs text-slate-400 animate-pulse">Đang kết nối xác thực Google...</span>
                </div>
              ) : (
                <div className="w-full flex justify-center py-2">
                  <div className="p-1 rounded-full border border-white/20 hover:border-red-500/60 hover:shadow-[0_0_25px_rgba(229,43,43,0.35)] transition-all">
                    <GoogleLogin
                      onSuccess={handleSuccess}
                      onError={() => setError("Đăng nhập bằng Google không thành công.")}
                      theme="filled_black"
                      size="large"
                      shape="pill"
                      text="continue_with"
                      width="300"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 w-full flex flex-col items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">hoặc</span>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={30}
                  placeholder="Tên nick"
                  className="w-full max-w-[300px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-red-500/60"
                />
                <button
                  type="button"
                  onClick={handleGuest}
                  className="w-full max-w-[300px] rounded-full bg-red-600 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-red-500 cursor-pointer border-none"
                >
                  Vào trang với nick này
                </button>
              </div>

              {/* Footer Trust Badge */}
              <div className="mt-8 pt-5 border-t border-white/10 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-sans">
                <span className="material-symbols-rounded text-emerald-400" style={{ fontSize: "14px" }}>
                  lock
                </span>
                <span>Bảo mật & mã hóa qua Google OAuth 2.0</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* PROJECT DETAILS PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProject(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm rounded-2xl p-6 bg-[#0d131f] border border-white/20 text-white shadow-2xl z-10 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono tracking-widest uppercase text-red-400">
                  {activeProject.tag} · {activeProject.year}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveProject(null)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer outline-none focus:outline-none ring-0 border-none"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: "16px" }}>close</span>
                </button>
              </div>

              <h3
                className="text-2xl font-normal mb-2"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {activeProject.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-5 font-sans">
                {activeProject.desc}
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveProject(null);
                  setMenuOpen(true);
                }}
                className="w-full py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer outline-none focus:outline-none ring-0 border-none"
              >
                Đăng nhập để vào Studio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
