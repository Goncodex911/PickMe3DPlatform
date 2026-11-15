"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyCreatorApplication, type MyCreatorApplication } from "@/lib/permissions";

const STAGE_TEXT: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Chờ xét duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_REVIEW: { label: "Đang xét duyệt", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Chưa được chấp thuận", cls: "bg-red-50 text-red-700 border-red-200" },
  SUSPENDED: { label: "Tạm khóa", cls: "bg-red-50 text-red-700 border-red-200" },
};

function fmt(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/**
 * Compact Creator application tracker for the Profile page. Renders nothing for admins, for users who never
 * applied, and for Creators approved before the application form existed (no timeline).
 */
export default function CreatorApplicationSummary({ className = "" }: { className?: string }) {
  const [data, setData] = useState<MyCreatorApplication | null>(null);

  useEffect(() => {
    let active = true;
    void fetchMyCreatorApplication().then((res) => {
      if (active && res.data) setData(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!data || data.stage === "NOT_SUBMITTED" || !(data.history || []).length) return null;
  // Approved long ago: the summary has nothing left to track.
  if (data.stage === "APPROVED" && data.reviewedAt && Date.now() - new Date(data.reviewedAt).getTime() > 7 * 864e5) return null;

  const stage = data.stage;
  const pill = STAGE_TEXT[stage];
  const reached = stage === "SUBMITTED" ? 1 : stage === "IN_REVIEW" ? 2 : 3;
  const failed = stage === "REJECTED" || stage === "SUSPENDED";
  const labels = ["Đã gửi", "Đang xét duyệt", stage === "APPROVED" ? "Đã duyệt" : failed ? pill.label : "Kết quả"];

  return (
    <section className={`rounded-xl border border-[#e3e5e8] bg-white p-5 shadow-[0_1px_3px_rgb(18_26_38/3%)] ${className}`} aria-label="Đơn đăng ký Creator">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-rounded text-[22px] text-[#67707c]" aria-hidden="true">storefront</span>
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-[#20242a]">Đơn đăng ký Creator {data.code && <span className="font-mono text-[13px] text-[#717985]">· {data.code}</span>}</h2>
            <p className="m-0 mt-0.5 text-xs text-[#717985]">
              Gửi {fmt(data.appliedAt)}
              {data.reviewDeadline && (stage === "SUBMITTED" || stage === "IN_REVIEW") ? ` · dự kiến có kết quả trước ${fmt(data.reviewDeadline)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pill && <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pill.cls}`}>{pill.label}</span>}
          <Link href="/creator/apply/" className="rounded-lg border border-[#e3e5e8] px-3 py-1.5 text-xs font-semibold text-[#20242a] hover:bg-[#f5f6f7]">
            Xem chi tiết
          </Link>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Tiến trình xét duyệt">
        {labels.map((label, i) => {
          const done = i + 1 < reached || (i + 1 === reached && i === 2);
          const current = i + 1 === reached && i < 2;
          const isFail = i === 2 && failed;
          const bar = isFail ? "bg-red-500" : done ? "bg-emerald-500" : current ? "bg-blue-500" : "bg-[#e3e5e8]";
          return (
            <li key={label}>
              <div className={`h-1.5 rounded-full ${bar}`} />
              <p className={`m-0 mt-1.5 text-[11px] font-medium ${isFail ? "text-red-600" : done || current ? "text-[#20242a]" : "text-[#9aa1ab]"}`}>
                {label}
              </p>
            </li>
          );
        })}
      </ol>

      {stage === "REJECTED" && data.reviewNote && (
        <p className="m-0 mt-3 text-xs text-red-600">Lý do: {data.reviewNote}</p>
      )}
    </section>
  );
}
