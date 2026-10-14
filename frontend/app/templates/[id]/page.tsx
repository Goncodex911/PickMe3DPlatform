import React, { Suspense } from "react";
import TemplateDetailClient from "./TemplateDetailClient";

export async function generateStaticParams() {
  try {
    const res = await fetch("http://localhost:5001/api/templates", {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((t: any) => ({
          id: (t._id || t.id).toString(),
        }));
      }
    }
  } catch {}

  // Fallback preset template IDs so Next.js static export succeeds
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
    { id: "5" },
    { id: "6" },
    { id: "preview" },
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
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
      <TemplateDetailClient id={resolvedParams.id} />
    </Suspense>
  );
}
