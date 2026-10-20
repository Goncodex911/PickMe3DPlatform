"use client";

import PlanBadge from "@/components/PlanBadge";
import { paymentCopy } from "@/lib/i18n.payment";

export default function BillingNav({ plan }: { plan?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 py-4 text-white">
      <a href="/" className="text-sm tracking-[0.2em] uppercase text-white/70">Pick Me</a>
      <nav className="flex items-center gap-4 text-sm">
        <a href="/pricing/">{paymentCopy.pricing}</a>
        <a href="/slides/">{paymentCopy.slides}</a>
        <PlanBadge plan={plan} />
      </nav>
    </header>
  );
}
