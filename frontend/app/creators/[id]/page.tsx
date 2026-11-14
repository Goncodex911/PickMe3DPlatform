import React, { Suspense } from "react";
import CreatorProfileClient from "../../creator/[username]/CreatorProfileClient";

export async function generateStaticParams() {
  try {
    const res = await fetch("http://localhost:5001/api/users", {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data
          .filter((u: any) => u._id)
          .map((u: any) => ({ id: String(u._id) }));
      }
    }
  } catch {}

  return [{ id: "creator" }, { id: "demo" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CreatorsDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawId = decodeURIComponent(resolvedParams.id || "").trim();
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <CreatorProfileClient
        userId={isObjectId ? rawId : ""}
        username={rawId}
      />
    </Suspense>
  );
}

