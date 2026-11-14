"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CreatorProfileClient from "../creator/[username]/CreatorProfileClient";

function CreatorsQueryPageContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() || "";
  const userId = searchParams.get("id")?.trim() || "";

  if (!username && !userId) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-300">
          <span className="material-symbols-rounded text-3xl">person_search</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Public creator profiles</h1>
        <p className="text-xs text-slate-400 mb-6 max-w-md">
          Select a creator’s name or profile picture on any design to view their profile, reviews, and reports.
        </p>
        <Link
          href="/templates/"
          className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors"
        >
          Explore designs
        </Link>
      </main>
    );
  }

  return <CreatorProfileClient username={username} userId={userId} />;
}

export default function CreatorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
          <p role="status" className="text-xs text-slate-400 font-mono">Loading profile…</p>
        </div>
      }
    >
      <CreatorsQueryPageContent />
    </Suspense>
  );
}

