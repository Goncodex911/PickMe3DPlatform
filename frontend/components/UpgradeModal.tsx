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
      <div className="w-full max-w-sm border border-[#2c2c2c] bg-[#131313] p-7 text-white shadow-2xl">
        <h2 className="text-3xl font-semibold tracking-[-1px]">{paymentCopy.upgradeTitle}</h2>
        <p className="mt-2 text-sm text-slate-300">{paymentCopy.upgradeBody}{feature ? ` (${feature})` : ""}</p>
        <div className="mt-6 flex gap-2">
          <a href="/pricing/" className="flex flex-1 items-center justify-between bg-white px-5 py-3.5 text-sm font-medium text-[#131313] hover:bg-[#d9d9d9]">{paymentCopy.upgrade} <span aria-hidden="true">↗</span></a>
          <button type="button" onClick={onClose} className="border border-[#8a8a8a] px-5 text-sm hover:bg-white hover:text-[#131313]">{paymentCopy.close}</button>
        </div>
      </div>
    </div>
  );
}
