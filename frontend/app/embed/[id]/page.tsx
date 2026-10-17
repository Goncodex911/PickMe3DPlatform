import { Suspense } from "react";
import EmbedClient from "./EmbedClient";

export async function generateStaticParams() {
  const staticParams = [
    { id: "preview" },
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "default" },
    { id: "sample" },
  ];

  try {
    const res = await fetch("http://localhost:5001/api/templates", {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const dynamicParams = data.data.map((t: { _id?: string; id?: string }) => ({
          id: (t._id ?? t.id ?? "unknown").toString(),
        }));
        const merged = [...staticParams, ...dynamicParams];
        const unique = Array.from(new Set(merged.map((m) => m.id))).map((id) => ({ id }));
        return unique;
      }
    }
  } catch {
    // fall through to static fallback
  }

  return staticParams;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Minimal embed page — strips all app chrome, sets iframe-friendly headers */
export default async function EmbedPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100vw",
            height: "100vh",
            background: "#07090e",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid #ef4444",
              borderTopColor: "transparent",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }
    >
      <EmbedClient id={id} />
    </Suspense>
  );
}
