"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollCanvas from "@/components/ScrollCanvas";

// Ensure GSAP plugins are registered on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/$/, "");

interface LandingPageProps {
  onLoginSuccess?: (token: string, user: any) => void;
  user?: any;
  onStartNow?: () => void;
  onLogout?: () => void;
}

export default function LandingPage({
  onLoginSuccess,
  user,
  onStartNow,
}: LandingPageProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(user || null);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTheme, setActiveTheme] = useState<"light" | "noir">("light");

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else {
      const stored = localStorage.getItem("pickme3d_user");
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, [user]);

  const handleGoToEditor = () => {
    if (onStartNow) {
      onStartNow();
    } else {
      router.push("/editor/");
    }
  };



  // DOM Refs for GSAP Pinning and Story Choreography
  const containerRef = useRef<HTMLDivElement>(null);
  const pinSectionRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  // Auth handler
  const handleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = `${API_BASE}/auth/google`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("pickme3d_token", data.token);
        localStorage.setItem("pickme3d_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setAuthOpen(false);
        if (onLoginSuccess) {
          onLoginSuccess(data.token, data.user);
        }
      } else {
        setError("Sign-in failed: " + (data.message || "Invalid authentication response"));
      }
    } catch (err) {
      console.error(err);
      setError("A server connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Initial Hero Entrance Tweens
      const introTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      introTl
        .from(".landing-nav", { y: -30, opacity: 0, duration: 1.0 })
        .fromTo(phoneFrameRef.current, { y: 50, scale: 0.78, opacity: 0 }, { y: 0, scale: 0.92, opacity: 1, duration: 1.4 }, "-=0.5");

      // 2. Master Storytelling Pinned Scrubbed Timeline
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: pinSectionRef.current,
          start: "top top",
          end: "+=3200", // 3200px scroll duration for 5 rich story beats
          pin: true,
          scrub: 1, // Smooth cinematic scrub
          anticipatePin: 1,
        },
      });

      // BEAT 1 -> BEAT 2: Dragging the Hero Banner into Phone
      masterTl
        // Fade out beat 1 narrative, fade in beat 2
        .to(".beat-1-text", { opacity: 0, y: -30, duration: 0.4 })
        .to(".beat-2-text", { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        // Animate floating tray item lifting off and moving into phone top slot
        .to(".drag-source-banner", {
          x: 210,
          y: -10,
          scale: 0.92,
          rotation: -2,
          opacity: 0.85,
          duration: 0.8,
          ease: "power2.inOut",
        })
        .to(".phone-drop-slot-banner", {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.4)",
        })
        .to(".drag-source-banner", { opacity: 0, duration: 0.2 }, "-=0.2")

        // BEAT 2 -> BEAT 3: Dragging & Snapping Clothes Product Cards
        .to(".beat-2-text", { opacity: 0, y: -30, duration: 0.4 }, "+=0.3")
        .to(".beat-3-text", { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        // Phone tilts slightly to celebrate 3D depth
        .to(phoneFrameRef.current, {
          rotateY: -8,
          rotateX: 4,
          scale: 0.92,
          duration: 0.8,
          ease: "power2.out",
        })
        // Snap product cards into the mobile grid
        .to(".phone-product-card-1", {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
        })
        .to(
          ".phone-product-card-2",
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.3"
        )
        .to(
          ".phone-product-card-3",
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.3"
        )

        // BEAT 3 -> BEAT 4: Theme Customizer & Inspector Reveal
        .to(".beat-3-text", { opacity: 0, y: -30, duration: 0.4 }, "+=0.3")
        .to(".beat-4-text", { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        // Inspector slides in from right side
        .to(".inspector-panel", {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
        })
        // Phone colors shift to luxury Obsidian Noir
        .to(".phone-inner-bg", {
          backgroundColor: "#0b0f17",
          duration: 0.8,
        })
        .to(
          ".phone-dynamic-text",
          {
            color: "#ffffff",
            duration: 0.8,
          },
          "-=0.8"
        )
        .to(
          ".phone-accent-btn",
          {
            backgroundColor: "#e52b2b",
            color: "#ffffff",
            duration: 0.8,
          },
          "-=0.8"
        )

        // BEAT 4 -> BEAT 5: Shopper Interaction & Zoom In (Add to Cart)
        .to(".beat-4-text", { opacity: 0, y: -30, duration: 0.4 }, "+=0.3")
        .to(".beat-5-text", { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        // Dismiss inspector panel
        .to(".inspector-panel", { x: 60, opacity: 0, duration: 0.5 })
        // Zoom phone into comfortable focus (balanced zoom-out to ensure bottom is fully visible)
        .to(
          phoneFrameRef.current,
          {
            rotateY: 0,
            rotateX: 0,
            scale: 0.98,
            duration: 1.0,
            ease: "power3.inOut",
          },
          "-=0.4"
        )
        // Simulated tap on the "Add to cart" button
        .to(".tap-ripple", { scale: 2.5, opacity: 0, duration: 0.6 }, "-=0.3")
        .to(".phone-cart-badge", { scale: 1.3, duration: 0.2, yoyo: true, repeat: 1 })
        .to(".phone-cart-count", { innerText: "1", duration: 0.1 }, "-=0.2")
        .to(".phone-success-toast", { y: 0, opacity: 1, duration: 0.4 })

        // BEAT 5 -> BEAT 6: Publish Aura & Live Sync
        .to(".beat-5-text", { opacity: 0, y: -30, duration: 0.4 }, "+=0.3")
        .to(".beat-6-text", { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        // Radiate aura rings around phone
        .to(".phone-aura-glow", { opacity: 0.85, scale: 1.25, duration: 0.8 })
        .to(".publish-badge-floating", { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, "-=0.5");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-[#090d16] text-white selection:bg-red-500 selection:text-white font-sans overflow-x-clip">
      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION BAR */}
      {/* ------------------------------------------------------------- */}



      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: HERO TALL SCROLL AREA WITH STICKY 3D CANVAS (344F) */}
      {/* ------------------------------------------------------------- */}
      <section id="hero-3d-canvas" className="relative w-full">
        <ScrollCanvas
          totalFrames={344}
          framePrefix="/frames/frame-"
          frameExtension=".webp"
          scrollHeight="400vh"
          lerpFactor={0.12}
          fit="cover"
          showHud={false}
        />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: THE PINNED STORYTELLING CANVAS (Beat 1 -> Beat 6) */}
      {/* ------------------------------------------------------------- */}
      <section
        id="story"
        ref={pinSectionRef}
        className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#070a12]"
        style={{ perspective: "1200px" }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient colored lighting behind phone */}
        <div className="phone-aura-glow absolute w-[380px] h-[550px] rounded-full bg-gradient-to-tr from-red-600/30 via-indigo-600/20 to-teal-400/25 blur-3xl pointer-events-none opacity-40 transition-opacity" />

        {/* ----------------------------------------------------------- */}
        {/* NARRATIVE BEAT LABELS (Dedicated Left Editorial Card) */}
        {/* ----------------------------------------------------------- */}
        <div className="absolute left-6 sm:left-10 lg:left-16 top-1/2 -translate-y-1/2 w-[300px] sm:w-[350px] lg:w-[380px] p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl z-30 pointer-events-none shadow-2xl">
          {/* BEAT 1 */}
          <div className="beat-1-text transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">01 / The Canvas</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Your phone screen becomes a creative canvas.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every screen starts with a standard 412 × 892 smartphone. A minimal titanium frame lets you see the product just as your customers will.
            </p>
          </div>

          {/* BEAT 2 */}
          <div className="beat-2-text absolute inset-0 p-6 opacity-0 transform translate-y-6 transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">02 / Drag Banner</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Add a Haute Couture banner in one step.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Drag the fashion cover module from the left toolbar to the top of the page. It snaps into place with perfectly rounded corners.
            </p>
          </div>

          {/* BEAT 3 */}
          <div className="beat-3-text absolute inset-0 p-6 opacity-0 transform translate-y-6 transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">03 / Apparel Catalog</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Arrange clothing automatically in a product grid.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Trench coats, silk dresses, and tailored trousers drop into a tidy two-column grid with price labels, category tags, and customizable color swatches.
            </p>
          </div>

          {/* BEAT 4 */}
          <div className="beat-4-text absolute inset-0 p-6 opacity-0 transform translate-y-6 transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">04 / Theme Tuning</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Shape your brand colors and typography.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Open the inspector on the right and switch from a bright, refined minimalist style to mysterious Obsidian Noir to bring out each garment’s contrast.
            </p>
          </div>

          {/* BEAT 5 */}
          <div className="beat-5-text absolute inset-0 p-6 opacity-0 transform translate-y-6 transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">05 / Live Experience</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Test touch interactions and the cart instantly.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Zoom in and interact with the screen: tap &ldquo;Add to cart&rdquo; to see a smooth ripple effect and the cart count update like a native app.
            </p>
          </div>

          {/* BEAT 6 */}
          <div className="beat-6-text absolute inset-0 p-6 opacity-0 transform translate-y-6 transition-all">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest block mb-2">06 / Ship & Sync</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white mb-3"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Publish to your store and website in one tap.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Your online store is ready. Export React/Tailwind source code or sync directly to your commerce platform with one click.
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* COMPONENT DRAG TRAY (Docked cleanly beside phone) */}
        {/* ----------------------------------------------------------- */}
        <div className="hidden xl:flex flex-col gap-3 absolute left-[31%] 2xl:left-[33%] top-1/2 -translate-y-1/2 -translate-x-full w-48 p-3 rounded-2xl bg-[#111726]/80 border border-white/10 backdrop-blur-xl z-20 pointer-events-auto shadow-xl">
          <div className="flex items-center gap-1.5 pb-2 border-b border-white/10 text-[11px] font-mono tracking-wider text-slate-400">
            <span className="material-symbols-rounded text-sm text-red-400">widgets</span>
            <span>COMPONENT LIBRARY</span>
          </div>

          {/* Draggable Item 1: Banner */}
          <div className="drag-source-banner p-2.5 rounded-xl bg-white/10 border border-white/15 cursor-grab hover:scale-105 transition-all flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: "url('/hero/card-couture.png')" }} />
            <div className="text-left overflow-hidden">
              <span className="text-[11px] font-medium text-white block truncate">Banner Editorial</span>
              <span className="text-[9px] text-slate-400 font-mono">Header block</span>
            </div>
          </div>

          {/* Draggable Item 2: Cloth 1 */}
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 cursor-grab hover:scale-105 transition-all flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: "url('/hero/card-noir.png')" }} />
            <div className="text-left overflow-hidden">
              <span className="text-[11px] font-medium text-white block truncate">Noir Wool Coat</span>
              <span className="text-[9px] text-red-400 font-mono">$240.00</span>
            </div>
          </div>

          {/* Draggable Item 3: Cloth 2 */}
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 cursor-grab hover:scale-105 transition-all flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: "url('/hero/card-still-life.png')" }} />
            <div className="text-left overflow-hidden">
              <span className="text-[11px] font-medium text-white block truncate">Silk Shirt</span>
              <span className="text-[9px] text-red-400 font-mono">$180.00</span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* CENTER STAGE: REALISTIC 3D IPHONE SMARTPHONE FRAME */}
        {/* ----------------------------------------------------------- */}
        <div
          ref={phoneFrameRef}
          className="relative w-[275px] sm:w-[295px] md:w-[315px] h-[495px] sm:h-[525px] md:h-[555px] rounded-[44px] p-2.5 bg-gradient-to-b from-[#2a303c] via-[#161a23] to-[#0c0f17] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(229,43,43,0.15)] border-[3px] border-[#4b5563]/60 transition-transform z-20 flex flex-col justify-between"
          style={{ willChange: "transform" }}
        >
          {/* Outer Titanium Rim Buttons */}
          <div className="absolute -left-[5px] top-20 w-[3px] h-9 rounded-l-sm bg-slate-600" />
          <div className="absolute -left-[5px] top-32 w-[3px] h-9 rounded-l-sm bg-slate-600" />
          <div className="absolute -right-[5px] top-26 w-[3px] h-12 rounded-r-sm bg-slate-600" />

          {/* Inner Display Screen */}
          <div className="phone-inner-bg relative w-full h-full rounded-[34px] overflow-hidden bg-slate-100 text-slate-900 flex flex-col transition-colors duration-700 shadow-inner">
            {/* Top Speaker / Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black flex items-center justify-between px-2 z-40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-mono text-white/90">Aura</span>
              </div>
            </div>

            {/* Mobile Header Bar */}
            <div className="pt-7 px-3.5 pb-1.5 flex items-center justify-between z-30">
              <span className="material-symbols-rounded text-base phone-dynamic-text text-slate-800">menu</span>
              <span
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
                className="text-base font-bold tracking-wider phone-dynamic-text text-slate-900"
              >
                AURA ATELIER
              </span>
              <div className="relative cursor-pointer phone-cart-badge">
                <span className="material-symbols-rounded text-base phone-dynamic-text text-slate-800">shopping_bag</span>
                <span className="phone-cart-count absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                  0
                </span>
              </div>
            </div>

            {/* Scrollable Store Canvas Inside Phone */}
            <div className="flex-1 overflow-y-auto px-3 pb-10 space-y-2.5 scrollbar-none">
              {/* SLOT 1: Editorial Fashion Banner (Target for Drag & Drop) */}
              <div className="phone-drop-slot-banner relative w-full h-28 rounded-2xl overflow-hidden shadow-sm opacity-20 scale-95 transition-all">
                <img src="/hero/card-couture.png" alt="Haute Couture" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-red-400">Spring Capsule</span>
                  <span
                    style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
                    className="text-base text-white font-normal leading-tight"
                  >
                    The Tailored Silhouette
                  </span>
                </div>
              </div>

              {/* SECTION TITLE: New-season apparel collection */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs font-semibold tracking-wide phone-dynamic-text text-slate-900">
                  Apparel Collection
                </span>
                <Link href="/templates" className="text-[10px] text-red-500 font-semibold hover:underline">
                  View all
                </Link>
              </div>

              {/* PRODUCT GRID: 2 Columns of Fashion Clothing */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Product 1: Noir coat */}
                <div className="phone-product-card-1 opacity-0 transform translate-y-6 scale-90 rounded-xl p-2 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm flex flex-col transition-all">
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-slate-200">
                    <img src="/hero/card-noir.png" alt="Noir coat" className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono bg-black/75 text-white">NEW</span>
                  </div>
                  <span className="text-[11px] font-medium phone-dynamic-text text-slate-900 truncate">Noir Chiffon Coat</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-bold text-red-600">$240</span>
                    <button className="relative overflow-hidden w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs phone-accent-btn">
                      <span className="material-symbols-rounded text-sm">add</span>
                      <span className="tap-ripple absolute inset-0 rounded-full bg-red-400 opacity-60 scale-0 pointer-events-none" />
                    </button>
                  </div>
                </div>

                {/* Product 2: Still Life silk shirt */}
                <div className="phone-product-card-2 opacity-0 transform translate-y-6 scale-90 rounded-xl p-2 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm flex flex-col transition-all">
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-slate-200">
                    <img src="/hero/card-still-life.png" alt="Silk shirt" className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-700 text-white">ORGANIC</span>
                  </div>
                  <span className="text-[11px] font-medium phone-dynamic-text text-slate-900 truncate">L&apos;Heure Silk Shirt</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-bold text-red-600">$180</span>
                    <button className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs phone-accent-btn">
                      <span className="material-symbols-rounded text-sm">add</span>
                    </button>
                  </div>
                </div>

                {/* Product 3: Pleated trousers */}
                <div className="phone-product-card-3 col-span-2 opacity-0 transform translate-y-6 scale-90 rounded-xl p-2.5 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm flex items-center gap-3 transition-all">
                  <div className="w-14 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                    <img src="/hero/card-kinetic.png" alt="Kinetic trousers" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold phone-dynamic-text text-slate-900 block">Kinetic Tailored Trousers</span>
                    <span className="text-[10px] text-slate-400 block mb-1">Premium Italian wool</span>
                    <span className="text-xs font-bold text-red-600">$210</span>
                  </div>
                  <button className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold phone-accent-btn">
                    Mua ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Success Toast Notification inside Phone */}
            <div className="phone-success-toast absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-emerald-600 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg transform translate-y-16 opacity-0 transition-all z-40">
              <span className="material-symbols-rounded text-sm">check_circle</span>
              <span>Noir Chiffon Coat added to cart!</span>
            </div>

            {/* Bottom Home Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-slate-400/50" />
          </div>

          {/* Floating Badges for BEAT 6 (Publish Anywhere) */}
          <div className="publish-badge-floating absolute -top-8 -right-8 px-4 py-2 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold shadow-xl border border-white/20 backdrop-blur-md flex items-center gap-2 opacity-0 transform translate-y-4">
            <span className="material-symbols-rounded text-base">verified</span>
            <span>Online Store Live!</span>
          </div>

          <div className="publish-badge-floating absolute -bottom-6 -left-8 px-4 py-2 rounded-2xl bg-[#0d131f]/95 text-white text-xs font-mono border border-white/20 shadow-xl backdrop-blur-md flex items-center gap-2 opacity-0 transform translate-y-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>React + Tailwind Clean Code</span>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* INSPECTOR PANEL (Right Side Floating Customizer) */}
        {/* ----------------------------------------------------------- */}
        <div className="inspector-panel hidden lg:flex flex-col gap-3 absolute right-12 top-1/2 -translate-y-1/2 w-56 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md z-20 opacity-0 transform translate-x-12 transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] font-mono text-slate-300">
            <span>THEME INSPECTOR</span>
            <span className="material-symbols-rounded text-sm text-red-400">tune</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Palette</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTheme("light")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${activeTheme === "light" ? "border-red-500 bg-white/20 text-white" : "border-white/10 bg-white/5 text-slate-400"}`}
              >
                Milk White
              </button>
              <button
                onClick={() => setActiveTheme("noir")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${activeTheme === "noir" ? "border-red-500 bg-white/20 text-white" : "border-white/10 bg-white/5 text-slate-400"}`}
              >
                Obsidian
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Typography</span>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-between">
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>Instrument Serif</span>
              <span className="text-[10px] font-mono text-red-400">H1 Display</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Grid Layout</span>
            <span className="text-white font-mono">2-Col Fluid</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2.5: COMMUNITY TEMPLATES SHOWCASE */}
      {/* ------------------------------------------------------------- */}
      <section id="templates" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>COMMUNITY DESIGNS</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Ready-to-use templates
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Browse popular designs shared by the community. Choose a favorite to open in Canvas Editor and tailor it to your style.
            </p>
          </div>

          <Link
            href="/templates"
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-2 self-start md:self-auto shrink-0 shadow-lg"
          >
            <span>Explore the full collection</span>
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* 3 Featured Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="group rounded-2xl bg-[#0f1626]/80 border border-white/10 hover:border-red-500/50 shadow-lg hover:shadow-[0_8px_30px_rgba(229,43,43,0.2)] transition-all overflow-hidden flex flex-col justify-between">
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
              <img src="/hero/card-couture.png" alt="Haute Couture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-black/60 text-red-400 border border-red-500/30 backdrop-blur-md">
                Haute Couture
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-rose-500">favorite</span> 142</span>
                <span>•</span>
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-slate-400">visibility</span> 1.2k</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">Haute Couture Spring Blossom</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">An elegant Haute Couture eveningwear collection in soft pastels with refined, minimal tailoring.</p>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">By <strong>Atelier Vivienne</strong></span>
                <Link href="/templates" className="px-3 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-[11px] font-semibold transition-all">
                  View template
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group rounded-2xl bg-[#0f1626]/80 border border-white/10 hover:border-red-500/50 shadow-lg hover:shadow-[0_8px_30px_rgba(229,43,43,0.2)] transition-all overflow-hidden flex flex-col justify-between">
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
              <img src="/hero/card-noir.png" alt="Streetwear Noir" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-black/60 text-red-400 border border-red-500/30 backdrop-blur-md">
                Streetwear
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-rose-500">favorite</span> 230</span>
                <span>•</span>
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-slate-400">visibility</span> 2.1k</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">Cyberpunk Streetwear Noir</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">A futuristic streetwear style with metallic black tones, a Noir Chiffon coat, and reflective materials.</p>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">By <strong>Neo Tokyo Studio</strong></span>
                <Link href="/templates" className="px-3 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-[11px] font-semibold transition-all">
                  View template
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group rounded-2xl bg-[#0f1626]/80 border border-white/10 hover:border-red-500/50 shadow-lg hover:shadow-[0_8px_30px_rgba(229,43,43,0.2)] transition-all overflow-hidden flex flex-col justify-between">
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
              <img src="/hero/card-still-life.png" alt="Silk Organic" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-black/60 text-red-400 border border-red-500/30 backdrop-blur-md">
                Organic Silk
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-rose-500">favorite</span> 175</span>
                <span>•</span>
                <span className="flex items-center gap-1"><span className="material-symbols-rounded text-xs text-slate-400">visibility</span> 1.6k</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">Silk L&apos;Heure Organic Blouse</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">The lightweight, eco-conscious L&apos;Heure silk shirt is perfect for an elegant office look.</p>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">By <strong>Élégance Paris</strong></span>
                <Link href="/templates" className="px-3 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-[11px] font-semibold transition-all">
                  View template
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: KEY PRODUCT PILLARS & FEATURES */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-red-400 font-mono text-xs uppercase tracking-widest block mb-2">Designed for Creators</span>
          <h2
            className="text-4xl sm:text-5xl font-normal text-white mb-4"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            Everything you need to sell fashion online.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Combine Figma-like creative freedom, modern commerce, and the speed of an AI studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-2xl">drag_indicator</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No-code drag and drop</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Freely arrange fashion components: image sliders, size charts, color filters, and a mini cart.
              </p>
            </div>
            <span className="text-xs font-mono text-red-400 flex items-center gap-1">
              <span>Zero-code builder</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </span>
          </div>

          {/* Feature 2 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-2xl">sync_alt</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Sync across commerce channels</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Connect your online store with an API token. Products, prices, and inventory map automatically to your mobile storefront.
              </p>
            </div>
            <span className="text-xs font-mono text-blue-400 flex items-center gap-1">
              <span>Storefront E-Commerce API</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </span>
          </div>

          {/* Feature 3 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-2xl">auto_awesome</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Vibe-Coding AI Prompting</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Turn your design into a high-quality prompt for Claude, Gemini, or Cursor to build a complete app.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span>Export Vibe Prompts</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: CALL TO ACTION (Earned Final Action) */}
      {/* ------------------------------------------------------------- */}
      <section className="py-24 px-6 sm:px-12 flex justify-center">
        <div className="relative w-full max-w-5xl rounded-[36px] p-10 sm:p-16 bg-gradient-to-tr from-[#161d2d] to-[#0c101a] border border-white/15 shadow-2xl flex flex-col items-center text-center overflow-hidden">
          {/* Radiant background highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-red-600/20 blur-3xl pointer-events-none rounded-full" />

          <span className="text-red-400 text-xs font-mono uppercase tracking-widest mb-3">GET STARTED TODAY</span>

          <h2
            className="text-4xl sm:text-6xl font-normal text-white max-w-2xl mb-4 leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            Bring your fashion brand into the 3D era.
          </h2>

          <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
            Sign in with Google to explore the mobile design studio and download free design templates.
          </p>

          {currentUser ? (
            <button
              onClick={handleGoToEditor}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-white text-sm font-bold tracking-wider shadow-[0_10px_40px_rgba(229,43,43,0.65)] hover:shadow-[0_10px_50px_rgba(229,43,43,0.9)] transition-all cursor-pointer flex items-center gap-3 group animate-pulse hover:animate-none"
            >
              <span>START NOW — OPEN CANVAS</span>
              <span className="material-symbols-rounded text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="px-9 py-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-semibold tracking-wider shadow-[0_10px_35px_rgba(229,43,43,0.5)] hover:shadow-[0_10px_45px_rgba(229,43,43,0.7)] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>SIGN IN WITH GOOGLE</span>
              <span className="material-symbols-rounded text-lg">login</span>
            </button>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-10 px-6 sm:px-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <span
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            className="text-base text-white"
          >
            PICK ME 3D
          </span>
          <span>© 2026 PickMe3DPlatform. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">API documentation</a>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* AUTHENTICATION MODAL */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {authOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthOpen(false)}
              className="absolute inset-0 bg-black/75"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-[32px] p-8 sm:p-10 flex flex-col items-center text-center border shadow-2xl z-10"
              style={{
                backgroundColor: "#0d131f",
                borderColor: "rgba(255, 255, 255, 0.14)",
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(229, 43, 43, 0.18)",
              }}
            >
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer outline-none"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 border border-white/10 bg-white/5">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-[10px] tracking-widest text-slate-300 font-mono uppercase">
                  Pick Me 3D Studio
                </span>
              </div>

              <h3
                className="text-3xl sm:text-4xl font-normal text-white mb-2"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
              >
                Sign in to PickMe
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-xs leading-relaxed">
                Sign in with Google to start designing mobile interfaces and sync your creative workspace.
              </p>

              {error && (
                <div className="mb-5 px-4 py-2.5 rounded-xl border text-xs text-rose-300 bg-rose-500/10 border-rose-500/30 flex items-center gap-2 w-full text-left">
                  <span className="material-symbols-rounded text-rose-400 text-base">error</span>
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center h-14 w-full gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-red-500 border-r-white" />
                  <span className="text-xs text-slate-400 animate-pulse">Connecting to Google authentication...</span>
                </div>
              ) : (
                <div className="w-full flex justify-center py-2">
                  <div className="p-1 rounded-full border border-white/20 hover:border-red-500/60 transition-all">
                    <GoogleLogin
                      onSuccess={handleSuccess}
                      onError={() => setError("Google sign-in failed.")}
                      theme="filled_black"
                      size="large"
                      shape="pill"
                      text="continue_with"
                      width="300"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <span className="material-symbols-rounded text-emerald-400 text-sm">lock</span>
                <span>PickMe3D Platform security & encryption</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
