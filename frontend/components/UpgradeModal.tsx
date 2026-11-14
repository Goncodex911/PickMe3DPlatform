"use client";

import { useEffect } from "react";
import { paymentCopy } from "@/lib/i18n.payment";

type Notice = { kicker: string; title: string; body: string; perks?: string[]; cta: string };

// Feature-specific notices; anything else (e.g. a server message) falls back to the generic text.
const NOTICES: Record<string, Notice> = {
  "ai-slides": {
    kicker: "Gói Pro",
    title: "Bạn cần mua gói Pro để dùng AI tạo slide",
    body: "Tính năng tạo slide bằng AI chỉ dành cho tài khoản gói Pro. Bạn vẫn có thể tạo deck trống và tự thiết kế.",
    perks: ["AI viết deck 6–8 slide theo chủ đề trong 15–40 giây", "50 lượt AI mỗi tháng", "Không giới hạn số deck, xuất PPTX, deck riêng tư"],
    cta: "Mua gói Pro",
  },
  aiSlides: {
    kicker: "Gói Pro",
    title: "Bạn cần mua gói Pro để dùng AI tạo slide",
    body: "Tính năng tạo slide bằng AI chỉ dành cho tài khoản gói Pro.",
    perks: ["AI viết deck 6–8 slide theo chủ đề", "50 lượt AI mỗi tháng"],
    cta: "Mua gói Pro",
  },
  "ai-credits": {
    kicker: "Hết lượt AI",
    title: "Bạn đã dùng hết lượt AI tháng này",
    body: "Lượt AI sẽ được làm mới vào đầu tháng sau. Trong lúc chờ, bạn vẫn có thể tạo deck trống.",
    cta: "Xem các gói",
  },
  blueprint3d: {
    kicker: "Gói Pro",
    title: "Bạn cần mua gói Pro để dùng Bản vẽ 3D",
    body: "Chuyển bản vẽ 2D thành mô hình 3D và xuất phối cảnh AI 4K chỉ dành cho tài khoản gói Pro.",
    perks: ["Dựng mô hình 3D từ bản vẽ mặt bằng", "Tham quan từng phòng", "Phối cảnh AI 4K"],
    cta: "Mua gói Pro",
  },
  "export-pptx": {
    kicker: "Gói Pro",
    title: "Xuất PPTX cần gói Pro",
    body: "Gói Free xuất được PNG và PDF. Nâng cấp lên Pro để xuất file PowerPoint.",
    cta: "Mua gói Pro",
  },
};

export default function UpgradeModal({
  open,
  feature,
  onClose,
}: {
  open: boolean;
  feature?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const notice: Notice = (feature && NOTICES[feature]) || {
    kicker: paymentCopy.upgrade,
    title: paymentCopy.upgradeTitle,
    body: feature && feature.length > 24 ? feature : paymentCopy.upgradeBody,
    cta: paymentCopy.upgrade,
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onClick={onClose}>
      <div className="w-full max-w-md border border-[#2c2c2c] bg-[#131313] p-7 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[2px] text-[#FF4D00]">
          <span className="material-symbols-rounded text-[16px]" aria-hidden="true">lock</span>
          {notice.kicker}
        </p>
        <h2 id="upgrade-title" className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.5px]">{notice.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{notice.body}</p>
        {notice.perks && (
          <ul className="mt-4 space-y-2 border-t border-[#2c2c2c] pt-4 text-sm text-slate-200">
            {notice.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <span className="material-symbols-rounded mt-[1px] text-[16px] text-[#FF4D00]" aria-hidden="true">check</span>
                {perk}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex gap-2">
          {/* Inline colour: the studio stylesheet recolours every link, which hid this label on the white button. */}
          <a
            href="/pricing/"
            className="flex flex-1 items-center justify-between bg-white px-5 py-3.5 text-sm font-semibold hover:bg-[#d9d9d9]"
            style={{ color: "#131313", textDecoration: "none" }}
          >
            {notice.cta} <span aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={onClose} className="border border-[#8a8a8a] px-5 text-sm !text-white hover:bg-white hover:!text-[#131313]">
            {paymentCopy.close}
          </button>
        </div>
      </div>
    </div>
  );
}
