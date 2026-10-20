"use client";

export default function PlanBadge({ plan }: { plan?: string }) {
  const label = plan === "studio" ? "Studio" : plan === "pro" ? "Pro" : "Free";
  const tone = plan === "studio" ? "bg-amber-400 text-black" : plan === "pro" ? "bg-rose-600 text-white" : "bg-white/10 text-white";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tone}`}>{label}</span>;
}
