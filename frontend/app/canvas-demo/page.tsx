"use client";

import React, { useState } from "react";
import Link from "next/link";
import ScrollCanvas from "@/components/ScrollCanvas";

export default function CanvasDemoPage() {
  const [lerpSpeed, setLerpSpeed] = useState<number>(0.12);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");

  return (
    <main className="relative w-full min-h-screen bg-[#070a12] text-white">
      {/* Floating Demo Top Nav */}
      <nav className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-6 py-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Trang Chủ</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono text-red-400 font-semibold uppercase tracking-wider">
            Sticky Canvas 390 Frames
          </span>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-400">FIT:</span>
            <button
              onClick={() => setFitMode(fitMode === "cover" ? "contain" : "cover")}
              className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer uppercase"
            >
              {fitMode}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-slate-400">LERP:</span>
            <input
              type="range"
              min="0.05"
              max="0.4"
              step="0.01"
              value={lerpSpeed}
              onChange={(e) => setLerpSpeed(parseFloat(e.target.value))}
              className="w-20 accent-red-500 cursor-pointer"
            />
            <span className="text-red-400 w-8">{lerpSpeed.toFixed(2)}</span>
          </div>
        </div>
      </nav>

      {/* The Sticky HTML5 Canvas Component */}
      <ScrollCanvas
        totalFrames={390}
        framePrefix="/frames/frame-"
        frameExtension=".webp"
        scrollHeight="400vh"
        lerpFactor={lerpSpeed}
        fit={fitMode}
        showHud={true}
      />

      {/* Trailing Section to confirm sticky release */}
      <section className="relative py-28 px-6 sm:px-12 bg-[#090d16] border-t border-white/10 flex flex-col items-center text-center">
        <div className="max-w-2xl">
          <span className="text-red-400 font-mono text-xs uppercase tracking-widest block mb-3">
            Sequence Complete
          </span>
          <h2
            className="text-4xl sm:text-5xl font-normal text-white mb-4"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            Cuộn ngược lại để đảo chiều khung hình.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            Canvas sticky mượt mà tự động giải phóng vị trí khi cuộn hết timeline và giữ nguyên frame 390. Cuộn lên để xem lại toàn bộ quá trình bay 3D mượt mà.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold tracking-wider transition-all"
            >
              VỀ TRANG CHÍNH
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
