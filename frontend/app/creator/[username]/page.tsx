import React, { Suspense } from "react";
import CreatorProfileClient from "./CreatorProfileClient";

export async function generateStaticParams() {
  // For static export, provide fallback params.
  // Dynamic usernames are resolved at client-side via the API.
  try {
    const res = await fetch("http://localhost:5001/api/users", {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data
          .filter((u: any) => u.username)
          .map((u: any) => ({ username: u.username }));
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
