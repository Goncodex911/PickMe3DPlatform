import React, { Suspense } from "react";
import CreatorProfileClient from "../../creator/[username]/CreatorProfileClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/users/public-creators`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const routes = json.data.flatMap((creator: { id?: string; username?: string }) => {
          const id = creator.id || creator.username;
          return id ? [{ id }] : [];
        });
        if (routes.length > 0) return routes;
      }
    }
  } catch {}

  // Keep static export valid if the API is unavailable during the build.
  return [{ id: "creator" }, { id: "demo" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CreatorByIdPage({ params }: PageProps) {
  const { id } = await params;
  const looksLikeObjectId = /^[a-f\d]{24}$/i.test(id);

  return (
    <Suspense fallback={<div role="status" className="min-h-screen bg-[#070b14]" />}>
      {looksLikeObjectId
        ? <CreatorProfileClient userId={id} />
        : <CreatorProfileClient username={id} />}
    </Suspense>
  );
}
