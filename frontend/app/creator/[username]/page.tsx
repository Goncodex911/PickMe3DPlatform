import React, { Suspense } from "react";
import CreatorProfileClient from "./CreatorProfileClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export async function generateStaticParams() {
  // Pre-render known public creator slugs; query-based routes cover new accounts.
  try {
    const res = await fetch(`${API_BASE}/users/public-creators`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const usernames = json.data
          .filter((creator: { username?: string }) => creator.username)
          .map((creator: { username: string }) => ({ username: creator.username }));
        if (usernames.length > 0) return usernames;
      }
    }
  } catch {}

  // Fallback usernames so static export succeeds
  return [
    { username: "creator" },
    { username: "demo" },
    { username: "admin" },
  ];
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <CreatorProfileClient username={resolvedParams.username} />
    </Suspense>
  );
}
