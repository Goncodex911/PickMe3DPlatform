"use client";

import { paymentCopy } from "@/lib/i18n.payment";

export default function UpgradeModal({
  open,
  feature,
  onClose,
}: {
  open: boolean;
  feature?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d131f] p-6 text-white shadow-2xl">
        <h2 className="text-2xl italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{paymentCopy.upgradeTitle}</h2>
        <p className="mt-2 text-sm text-slate-300">{paymentCopy.upgradeBody}{feature ? ` (${feature})` : ""}</p>
        <div className="mt-6 flex gap-2">
          <a href="/pricing/" className="flex-1 rounded-full bg-rose-600 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">{paymentCopy.upgrade}</a>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-4 text-xs uppercase tracking-wider">{paymentCopy.close}</button>
        </div>
      </div>
    </div>
  );
}
