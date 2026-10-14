"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface ScrollCanvasProps {
  /** Total number of frames in the sequence (default: 344) */
  totalFrames?: number;
  /** Base path for the frame images */
  framePrefix?: string;
  /** Image extension (default: '.webp') */
  frameExtension?: string;
  /** Number of digits for zero-padding (default: 3) */
  padDigits?: number;
  /** CSS height for the scroll container track (default: '400vh') */
  scrollHeight?: string;
  /** Smoothing lerp factor (default: 0.12) */
  lerpFactor?: number;
  /** Object fit mode for the canvas (default: 'cover') */
  fit?: "cover" | "contain";
  /** Show the futuristic HUD overlay (default: true) */
  showHud?: boolean;
  /** Optional custom overlay content (can be a node or render function receiving progress & frame) */
  children?:
  | React.ReactNode
  | ((props: { progress: number; currentFrame: number }) => React.ReactNode);
  /** Custom class name for the wrapper */
  className?: string;
  /** Callback fired on scroll progress change */
  onProgressChange?: (progress: number, frame: number) => void;
}

export default function ScrollCanvas({
  totalFrames = 344,
  framePrefix = "/frames/frame-",
  frameExtension = ".webp",
  padDigits = 3,
  scrollHeight = "400vh",
  lerpFactor = 0.8,
  fit = "cover",
  showHud = true,
  children,
  className = "",
  onProgressChange,
}: ScrollCanvasProps) {
  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation & Rendering state refs (kept in refs to avoid React re-render lag)
  const currentFrameRef = useRef<number>(1);
  const targetFrameRef = useRef<number>(1);
  const lastDrawnFrameRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(true);
  const reducedMotionRef = useRef<boolean>(false);
  const fitRef = useRef<"cover" | "contain">(fit);
  fitRef.current = fit;

  // Frame Cache
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedIndicesRef = useRef<Set<number>>(new Set());
  const loadingPromisesRef = useRef<Map<number, Promise<HTMLImageElement>>>(new Map());

  // Reactive UI State (for HUD)
  const [activeFrameDisplay, setActiveFrameDisplay] = useState<number>(1);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [loadPercentage, setLoadPercentage] = useState<number>(0);
  const [isFirstFrameLoaded, setIsFirstFrameLoaded] = useState<boolean>(false);
  const [hudVisible, setHudVisible] = useState<boolean>(true);

  // Construct frame URL helper (handles .webp and .webg, dash and underscore formats)
  const getFrameUrl = useCallback(
    (index: number, alternate = false): string => {
      const pad = String(index).padStart(padDigits, "0");
      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      // Handle extension (sanitize webg -> webp)
      const ext = (frameExtension || ".webp").toLowerCase().replace("webg", "webp");
      // If alternate format is needed (e.g. frame_001 instead of frame-001 or vice-versa)
      let prefix = framePrefix;
      if (alternate) {
        if (prefix.endsWith("-")) {
          prefix = prefix.slice(0, -1) + "_";
        } else if (prefix.endsWith("_")) {
          prefix = prefix.slice(0, -1) + "-";
        }
      }
      return `${base}${prefix}${pad}${ext}`;
    },
    [framePrefix, padDigits, frameExtension]
  );

  // Search for the closest loaded frame to avoid blank screens/flickers
  const getBestAvailableImage = useCallback((targetIdx: number): HTMLImageElement | null => {
    const images = imagesRef.current;
    const loaded = loadedIndicesRef.current;

    // 1. Direct hit
    if (loaded.has(targetIdx) && images[targetIdx]?.complete) {
      return images[targetIdx];
    }

    // 2. Search outward in both directions for closest neighbor
    let bestIdx = -1;
    let minDistance = Infinity;

    for (const idx of loaded) {
      const dist = Math.abs(idx - targetIdx);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = idx;
        if (dist === 1) break; // Found immediate adjacent frame
      }
    }

    if (bestIdx !== -1 && images[bestIdx]?.complete) {
      return images[bestIdx];
    }

    return null;
  }, []);

  // Canvas drawing function with Retina/DPR and cover/contain fitting
  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const img = getBestAvailableImage(frameIndex);
      if (!img) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      if (!imgWidth || !imgHeight) return;

      // Calculate aspect ratio fit
      let scale = 1;
      if (fitRef.current === "cover") {
        scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
      } else {
        scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
      }

      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const offsetX = (canvasWidth - drawWidth) / 2;
      const offsetY = (canvasHeight - drawHeight) / 2;

      // Clear previous frame to ensure crisp borders
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // High-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill background if not full cover to avoid transparent/black borders
      if (offsetX > 0 || offsetY > 0 || drawWidth < canvasWidth || drawHeight < canvasHeight) {
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }

      // Draw the frame
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      lastDrawnFrameRef.current = frameIndex;
    },
    [getBestAvailableImage]
  );

  // Resize canvas for sharp Retina / DPR screens
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Immediately redraw current frame at new resolution
      const currentIdx = Math.max(1, Math.min(totalFrames, Math.round(currentFrameRef.current)));
      drawFrame(currentIdx);
    }
  }, [totalFrames, drawFrame]);

  // Load a single frame with retry and decoding
  const loadSingleFrame = useCallback(
    (index: number): Promise<HTMLImageElement> => {
      if (index < 1 || index > totalFrames) {
        return Promise.reject(new Error(`Index ${index} out of bounds`));
      }

      if (imagesRef.current[index]?.complete && loadedIndicesRef.current.has(index)) {
        return Promise.resolve(imagesRef.current[index]!);
      }

      if (loadingPromisesRef.current.has(index)) {
        return loadingPromisesRef.current.get(index)!;
      }

      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        let triedAlternate = false;

        img.onload = async () => {
          try {
            // Pre-decode off the main thread if supported
            if ("decode" in img) {
              await img.decode().catch(() => { });
            }
          } finally {
            imagesRef.current[index] = img;
            loadedIndicesRef.current.add(index);
            loadingPromisesRef.current.delete(index);

            // Update loaded count for UI HUD
            const count = loadedIndicesRef.current.size;
            setLoadPercentage(Math.round((count / totalFrames) * 100));

            if (index === 1) {
              setIsFirstFrameLoaded(true);
              // Immediately render frame 1 if canvas hasn't drawn anything yet
              if (lastDrawnFrameRef.current === -1) {
                drawFrame(1);
              }
            }

            // If the loaded frame is close to current position, trigger a redraw
            const currentRound = Math.round(currentFrameRef.current);
            if (Math.abs(currentRound - index) <= 1) {
              drawFrame(currentRound);
            }

            resolve(img);
          }
        };

        img.onerror = () => {
          if (!triedAlternate) {
            triedAlternate = true;
            // Retry with alternate underscore format
            img.src = getFrameUrl(index, true);
          } else {
            loadingPromisesRef.current.delete(index);
            reject(new Error(`Failed to load frame ${index}`));
          }
        };

        img.src = getFrameUrl(index, false);
      });

      loadingPromisesRef.current.set(index, promise);
      return promise;
    },
    [totalFrames, getFrameUrl, drawFrame]
  );

  // Progressive Preloader: Prioritized multi-tier pipeline
  useEffect(() => {
    let cancelled = false;

    async function startProgressivePreload() {
      // TIER 1: Load Frame 1 immediately
      try {
        await loadSingleFrame(1);
      } catch (err) {
        console.warn("Frame 1 preload warning:", err);
      }

      if (cancelled) return;

      // TIER 2: Load Keyframes across the timeline (every 10 frames + frame 390)
      const keyframes: number[] = [];
      const step = 10;
      for (let i = 1; i <= totalFrames; i += step) {
        if (i !== 1) keyframes.push(i);
      }
      if (!keyframes.includes(totalFrames)) {
        keyframes.push(totalFrames);
      }

      await Promise.allSettled(keyframes.map((idx) => loadSingleFrame(idx)));
      if (cancelled) return;

      // TIER 3: Fill in remaining frames with bounded concurrency
      const remaining: number[] = [];
      for (let i = 1; i <= totalFrames; i++) {
        if (!loadedIndicesRef.current.has(i)) {
          remaining.push(i);
        }
      }

      const concurrency = 5;
      let currentIndex = 0;

      async function worker() {
        while (currentIndex < remaining.length && !cancelled) {
          const idx = remaining[currentIndex++];
          try {
            await loadSingleFrame(idx);
          } catch { }
        }
      }

      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);
    }

    startProgressivePreload();

    return () => {
      cancelled = true;
    };
  }, [totalFrames, loadSingleFrame]);

  // Handle Scroll Progress Calculation
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const totalScrollable = container.offsetHeight - viewportHeight;

    if (totalScrollable <= 0) return;

    // Scroll progress 0.0 -> 1.0
    const rawProgress = -rect.top / totalScrollable;
    const clampedProgress = Math.min(1, Math.max(0, rawProgress));

    // Map: 0% scroll -> frame 1, 100% scroll -> totalFrames (390)
    const target = 1 + clampedProgress * (totalFrames - 1);
    targetFrameRef.current = target;

    setScrollProgress(clampedProgress);
    if (onProgressChange) {
      onProgressChange(clampedProgress, Math.round(target));
    }

    // Dynamic queue booster: prioritize loading next 25 frames in scroll direction
    const currentTarget = Math.round(target);
    for (let offset = -5; offset <= 25; offset++) {
      const priorityIdx = currentTarget + offset;
      if (priorityIdx >= 1 && priorityIdx <= totalFrames && !loadedIndicesRef.current.has(priorityIdx)) {
        loadSingleFrame(priorityIdx);
      }
    }
  }, [totalFrames, onProgressChange, loadSingleFrame]);

  // Persistent Animation Loop with smooth lerp interpolation
  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mediaQuery.matches;

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener("change", onMotionChange);

    isRunningRef.current = true;

    function tick() {
      if (!isRunningRef.current) return;

      // Ensure target frame is freshly synced with container scroll position
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const totalScrollable = container.offsetHeight - viewportHeight;
        if (totalScrollable > 0) {
          const rawProgress = -rect.top / totalScrollable;
          const clampedProgress = Math.min(1, Math.max(0, rawProgress));
          targetFrameRef.current = 1 + clampedProgress * (totalFrames - 1);
        }
      }

      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      if (reducedMotionRef.current) {
        // Direct jump without lerp if reduced motion is preferred
        currentFrameRef.current = target;
      } else {
        // Smooth lerp: current moves toward target
        const diff = target - current;
        if (Math.abs(diff) < 0.002) {
          currentFrameRef.current = target;
        } else {
          currentFrameRef.current += diff * lerpFactor;
        }
      }

      const frameToDraw = Math.max(1, Math.min(totalFrames, Math.round(currentFrameRef.current)));

      // Redraw canvas if frame changed or if not yet painted
      if (frameToDraw !== lastDrawnFrameRef.current || lastDrawnFrameRef.current === -1) {
        drawFrame(frameToDraw);
        setActiveFrameDisplay((prev) => (prev !== frameToDraw ? frameToDraw : prev));
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    // Initial canvas sizing and first render
    resizeCanvas();
    handleScroll();
    rafIdRef.current = requestAnimationFrame(tick);

    // Event listeners
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resizeCanvas);

    // ResizeObserver on sticky viewport
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && stickyRef.current) {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(stickyRef.current);
    }

    return () => {
      isRunningRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      mediaQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [totalFrames, lerpFactor, drawFrame, resizeCanvas, handleScroll]);

  // Narrative Story checkpoints based on scroll progress
  const getStoryBeat = (p: number) => {
    if (p < 0.25) {
      return {
        step: "01",
        title: "Bàn Làm Việc Studio",
        subtitle: "Khởi đầu sáng tạo từ bản thảo & chiếc điện thoại trên bàn vẽ.",
      };
    } else if (p < 0.55) {
      return {
        step: "02",
        title: "Chuyển Động Đa Chiều",
        subtitle: "Góc quay 3D kinetic lướt qua các mảng phối màu và linh kiện.",
      };
    } else if (p < 0.82) {
      return {
        step: "03",
        title: "Định Hình Không Gian",
        subtitle: "Từng đường nét thiết kế hòa quyện vào phong cách Haute Couture.",
      };
    } else {
      return {
        step: "04",
        title: "SaaSWave Brand Reveal",
        subtitle: "Bộ nhận diện hoàn thiện, sẵn sàng mở khóa tiềm năng thương hiệu.",
      };
    }
  };

  const storyBeat = getStoryBeat(scrollProgress);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#070a12] text-white selection:bg-red-500 selection:text-white ${className}`}
      style={{ height: scrollHeight }}
    >
      {/* Pinned Full-Screen Sticky Viewport */}
      <div
        ref={stickyRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden flex items-center justify-center bg-[#070a12]"
      >
        {/* HTML5 Canvas Element */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block object-cover select-none cursor-default"
          style={{ willChange: "transform" }}
        />

        {/* Ambient Subtle Vignette / Studio Lighting */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-black/30" />

        {/* First Frame Loading Placeholder / Splash */}
        {!isFirstFrameLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a12] z-40 transition-opacity duration-500">
            <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin mb-4" />
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              Initializing 3D Frame Sequence...
            </span>
          </div>
        )}

        {/* Custom User Children Overlay (if provided) */}
        {typeof children === "function"
          ? children({ progress: scrollProgress, currentFrame: activeFrameDisplay })
          : children}

        {/* Built-in Futuristic Studio HUD */}
        {showHud && (
          <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between z-30">
            {/* Top Bar: Sequence Info & Live Preload Gauge */}
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                <span className="text-[11px] font-mono tracking-wider text-slate-300 uppercase">
                  Scroll-Driven 3D Canvas
                </span>
                <span className="text-[10px] text-slate-500 font-mono">|</span>
                <span className="text-[11px] font-mono text-red-400 font-bold">{totalFrames} FRAMES</span>
              </div>

              {/* Buffer / Preload Status */}
              <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-mono">
                <span className="text-slate-400">BUFFER</span>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${loadPercentage}%` }}
                  />
                </div>
                <span className="text-white font-medium">{loadPercentage}%</span>
              </div>
            </div>

            {/* Middle Left: Narrative Story Beat Cards */}
            <div className="max-w-md pointer-events-auto transition-all duration-300">
              <div className="p-6 rounded-3xl bg-black/55 border border-white/15 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono tracking-widest text-red-400 uppercase font-semibold">
                    PHASE {storyBeat.step} / 04
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round(scrollProgress * 100)}% SCROLLED
                  </span>
                </div>
                <h3
                  className="text-2xl sm:text-3xl font-normal text-white mb-2 leading-tight"
                  style={{ fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif", fontStyle: "italic" }}
                >
                  {storyBeat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                  {storyBeat.subtitle}
                </p>
              </div>
            </div>

            {/* Bottom Bar: Frame Readout & Scrub Progress Bar */}
            <div className="flex flex-col gap-3 pointer-events-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold tracking-wider">
                    FRAME {String(activeFrameDisplay).padStart(3, "0")}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-500">{totalFrames}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Lerp Easing: {lerpFactor}
                  </span>
                  <button
                    onClick={() => setHudVisible(!hudVisible)}
                    className="hover:text-white transition-colors cursor-pointer text-[10px] border border-white/15 px-2 py-0.5 rounded"
                  >
                    {hudVisible ? "HIDE UI" : "SHOW UI"}
                  </button>
                </div>
              </div>

              {/* High-precision Scrub Progress Track */}
              <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/10 backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-75"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>

              {/* Scroll cue hint */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>0% START</span>
                <span className="flex items-center gap-1 text-slate-400 animate-pulse">
                  <span className="material-symbols-rounded text-xs">keyboard_double_arrow_down</span>
                  <span>CUỘN ĐỂ TIẾP TỤC TRẢI NGHIỆM</span>
                </span>
                <span>100% BRAND REVEAL</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
