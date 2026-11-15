"use client";

import Link from "next/link";
import type { ApplicationEvent, ApplicationHistoryItem, MyCreatorApplication } from "@/lib/permissions";

const EVENT_LABEL: Record<ApplicationEvent, string> = {
  SUBMITTED: "Đã gửi đơn đăng ký",
  RESUBMITTED: "Đã gửi lại đơn đăng ký",
  IN_REVIEW: "Quản trị viên bắt đầu xét duyệt",
  APPROVED: "Đơn được duyệt — bạn đã là Creator",
  REJECTED: "Đơn chưa được chấp thuận",
  SUSPENDED: "Quyền Creator bị tạm khóa",
  REINSTATED: "Quyền Creator được khôi phục",
};

const EVENT_ICON: Record<ApplicationEvent, string> = {
  SUBMITTED: "send",
  RESUBMITTED: "replay",
  IN_REVIEW: "manage_search",
  APPROVED: "verified",
  REJECTED: "cancel",
  SUSPENDED: "block",
  REINSTATED: "restart_alt",
};

const STAGE_PILL: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Chờ xét duyệt", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  IN_REVIEW: { label: "Đang xét duyệt", cls: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  REJECTED: { label: "Chưa được chấp thuận", cls: "bg-red-500/10 text-red-300 border-red-500/30" },
  SUSPENDED: { label: "Tạm khóa", cls: "bg-red-500/10 text-red-300 border-red-500/30" },
};

function fmt(value?: string | null, withTime = true) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", withTime
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** Events of the current application: everything since its last (re)submission. */
function currentRound(history: ApplicationHistoryItem[]) {
  let start = -1;
  history.forEach((h, i) => {
    if (h.event === "SUBMITTED" || h.event === "RESUBMITTED") start = i;
  });
  return start >= 0 ? history.slice(start) : [];
}

export default function CreatorApplicationTracker({
  data,
  reviewDays,
  onResubmit,
  onRefresh,
  refreshing = false,
}: {
  data: MyCreatorApplication;
  reviewDays: number;
  onResubmit?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const history = data.history || [];
  const round = currentRound(history);
  const submitted = round[0];
  const inReview = round.find((h) => h.event === "IN_REVIEW");
  const decision = [...round].reverse().find((h) => h.event === "APPROVED" || h.event === "REJECTED");
  const stage = data.stage;
  const pill = STAGE_PILL[stage];
  const deadlinePassed = data.reviewDeadline ? new Date(data.reviewDeadline).getTime() < Date.now() : false;

  const steps = [
    {
      key: "submitted",
      title: submitted?.event === "RESUBMITTED" ? "Đã gửi lại đơn" : "Đã gửi đơn",
      detail: fmt(submitted?.at || data.appliedAt),
      state: "done" as const,
    },
    {
      key: "review",
      title: "Đang xét duyệt",
      detail: inReview ? fmt(inReview.at) : stage === "SUBMITTED" ? "Đang chờ Quản trị viên tiếp nhận" : decision ? fmt(decision.at) : "",
      state: inReview || decision ? ("done" as const) : stage === "SUBMITTED" ? ("current" as const) : ("todo" as const),
    },
    {
      key: "result",
      title: stage === "APPROVED" ? "Đã duyệt" : stage === "REJECTED" ? "Chưa được chấp thuận" : "Kết quả",
      detail: decision ? fmt(decision.at) : data.reviewDeadline ? `Dự kiến trước ${fmt(data.reviewDeadline, false)}` : "",
      state: decision
        ? stage === "REJECTED" ? ("failed" as const) : ("done" as const)
        : stage === "IN_REVIEW" ? ("current" as const) : ("todo" as const),
    },
  ];

  const dot = (state: string, i: number) => {
    const map: Record<string, string> = {
      done: "bg-emerald-500 border-emerald-500 text-white",
      failed: "bg-red-500 border-red-500 text-white",
      current: "border-blue-400 text-blue-300 bg-blue-500/10 animate-pulse",
      todo: "border-white/15 text-slate-500",
    };
    const icon = state === "done" ? "check" : state === "failed" ? "close" : null;
    return (
      <span className={`w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold ${map[state]}`}>
        {icon ? <span className="material-symbols-rounded text-base" aria-hidden="true">{icon}</span> : i + 1}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <section className="p-5 sm:p-6 rounded-2xl bg-[#0e1422] border border-white/10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Đơn đăng ký Creator</p>
            <h2 className="text-lg font-bold text-white font-mono">{data.code || "—"}</h2>
            {data.appliedAt && <p className="text-xs text-slate-400 mt-0.5">Gửi lúc {fmt(data.appliedAt)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {pill && <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${pill.cls}`}>{pill.label}</span>}
            {onRefresh && (stage === "SUBMITTED" || stage === "IN_REVIEW") && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                title="Cập nhật trạng thái"
                aria-label="Cập nhật trạng thái"
              >
                <span className={`material-symbols-rounded text-base ${refreshing ? "animate-spin" : ""}`} aria-hidden="true">refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <ol className="flex flex-col sm:flex-row gap-4 sm:gap-0" aria-label="Tiến trình xét duyệt">
          {steps.map((s, i) => (
            <li key={s.key} className="flex sm:flex-col sm:flex-1 items-start sm:items-center gap-3 sm:gap-2 relative sm:text-center">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 ${steps[i + 1].state === "todo" ? "bg-white/10" : steps[i + 1].state === "failed" ? "bg-red-500/60" : "bg-emerald-500/60"}`}
                />
              )}
              <span className="relative z-10">{dot(s.state, i)}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${s.state === "todo" ? "text-slate-500" : s.state === "failed" ? "text-red-300" : "text-white"}`}>{s.title}</p>
                {s.detail && <p className="text-[11px] text-slate-400 mt-0.5">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {/* What happens next */}
        {(stage === "SUBMITTED" || stage === "IN_REVIEW") && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 leading-relaxed">
            {stage === "SUBMITTED"
              ? "Đơn đã vào hàng chờ. "
              : "Quản trị viên đang xem hồ sơ của bạn. "}
            {deadlinePassed
              ? "Đơn đã quá thời gian xét duyệt dự kiến; Quản trị viên sẽ phản hồi sớm nhất có thể."
              : `Thời gian xét duyệt dự kiến ${reviewDays} ngày làm việc. `}
            Bạn sẽ nhận thông báo khi có kết quả. Trong lúc chờ, bạn vẫn tạo và lưu Template ở chế độ riêng tư.
          </div>
        )}
        {stage === "APPROVED" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
            <span>Bạn đã có thể công khai, đặt giá và bán Template.</span>
            <Link href="/creator/wallet" className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Mở Ví Creator</Link>
          </div>
        )}
        {stage === "REJECTED" && (() => {
          const rej = data.rejection;
          const waitUntil = rej?.resubmitAfter ? new Date(rej.resubmitAfter) : null;
          const canResubmit = !waitUntil || waitUntil.getTime() <= Date.now();
          return (
            <div className="space-y-4 p-4 rounded-xl bg-red-500/[0.07] border border-red-500/30 text-xs">
              <div className="flex items-center gap-2 text-red-200 font-semibold text-sm">
                <span className="material-symbols-rounded text-base" aria-hidden="true">feedback</span>
                Phản hồi từ Quản trị viên
              </div>

              {rej?.reasons?.length ? (
                <div>
                  <p className="text-slate-400 mb-1">Lý do</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-red-100">
                    {rej.reasons.map((r) => <li key={r.code}>{r.label}</li>)}
                  </ul>
                </div>
              ) : null}

              {rej?.requiredFields?.length ? (
                <div>
                  <p className="text-slate-400 mb-1.5">Thông tin cần bổ sung / chỉnh sửa</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rej.requiredFields.map((f) => (
                      <span key={f.field} className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200">{f.label}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-slate-400 mb-1">Lời nhắn</p>
                <p className="text-slate-200 whitespace-pre-line leading-relaxed border-l-2 border-red-400/40 pl-3">
                  {rej?.message || data.reviewNote || decision?.note || "Quản trị viên không ghi lời nhắn."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-slate-400">
                  {canResubmit ? "Bạn có thể chỉnh sửa và gửi lại đơn ngay." : `Bạn có thể gửi lại từ ngày ${fmt(rej?.resubmitAfter, false)}.`}
                </span>
                {onResubmit && (
                  <button
                    type="button"
                    onClick={onResubmit}
                    disabled={!canResubmit}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Chỉnh sửa và gửi lại
                  </button>
                )}
              </div>
            </div>
          );
        })()}
        {stage === "SUSPENDED" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
            <span>{data.reviewNote ? `Lý do: ${data.reviewNote}` : "Vui lòng liên hệ Quản trị viên để được hỗ trợ."}</span>
            <Link href="/appeals" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold">Gửi khiếu nại</Link>
          </div>
        )}
      </section>

      {/* Full history, newest first */}
      {history.length > 0 && (
        <section className="p-5 sm:p-6 rounded-2xl bg-[#0e1422] border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">Lịch sử xét duyệt</h3>
          <ol className="relative border-l border-white/10 ml-3 space-y-4">
            {[...history].reverse().map((h, i) => (
              <li key={`${h.at}-${i}`} className="ml-5">
                <span className="absolute -left-3 w-6 h-6 rounded-full bg-[#0e1422] border border-white/15 flex items-center justify-center">
                  <span className="material-symbols-rounded text-sm text-slate-300" aria-hidden="true">{EVENT_ICON[h.event] || "circle"}</span>
                </span>
                <p className="text-sm text-slate-200">{EVENT_LABEL[h.event] || h.event}</p>
                <p className="text-[11px] text-slate-500">
                  {fmt(h.at)}
                  {h.code ? ` · ${h.code}` : ""}
                </p>
                {h.note && <p className="text-xs text-slate-400 mt-1">“{h.note}”</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
