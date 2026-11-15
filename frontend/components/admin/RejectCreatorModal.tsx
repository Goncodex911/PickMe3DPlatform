"use client";

import { useEffect, useMemo, useState } from "react";
import { updateCreatorStatusApi, type AdminUser } from "@/lib/adminService";
import { fetchCreatorPolicy } from "@/lib/permissions";

// Fallbacks if the policy endpoint is unreachable; the backend owns the real list.
const DEFAULT_REASONS: Record<string, string> = {
  INCOMPLETE_INFO: "Thông tin chưa đầy đủ hoặc chưa rõ ràng",
  INVALID_PORTFOLIO: "Portfolio / sản phẩm mẫu không truy cập được hoặc không phải của bạn",
  INSUFFICIENT_QUALITY: "Chất lượng sản phẩm mẫu chưa đạt yêu cầu bán trên Marketplace",
  BANK_MISMATCH: "Thông tin ngân hàng không hợp lệ hoặc không trùng tên tài khoản",
  POLICY_VIOLATION: "Nội dung vi phạm Chính sách Creator",
  DUPLICATE_ACCOUNT: "Trùng với một tài khoản Creator khác",
  OTHER: "Lý do khác",
};
const DEFAULT_FIELDS: Record<string, string> = {
  displayName: "Tên hiển thị",
  phone: "Số điện thoại",
  specialties: "Lĩnh vực chuyên môn",
  experience: "Kinh nghiệm",
  portfolioUrl: "Link portfolio",
  sampleLinks: "Sản phẩm mẫu",
  introduction: "Giới thiệu",
  bankName: "Ngân hàng",
  accountNumber: "Số tài khoản",
  accountHolder: "Tên chủ tài khoản",
};
// Fields a reason usually points at: pre-selected when the reason is ticked.
const REASON_FIELDS: Record<string, string[]> = {
  INVALID_PORTFOLIO: ["portfolioUrl", "sampleLinks"],
  INSUFFICIENT_QUALITY: ["sampleLinks"],
  BANK_MISMATCH: ["bankName", "accountNumber", "accountHolder"],
};
const WAIT_LABEL: Record<number, string> = { 0: "Gửi lại ngay", 7: "Sau 7 ngày", 30: "Sau 30 ngày" };

function currentValue(user: AdminUser, field: string): string {
  const app = user.creatorApplication || {};
  const bank = user.savedBankInfo || {};
  const v: Record<string, unknown> = {
    displayName: app.displayName,
    phone: app.phone,
    specialties: (app.specialties || []).join(", "),
    experience: app.experience ? `${app.experience} năm` : "",
    portfolioUrl: app.portfolioUrl,
    sampleLinks: (app.sampleLinks || []).join(", "),
    introduction: app.introduction,
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    accountHolder: bank.accountHolder,
  };
  return String(v[field] || "—");
}

export default function RejectCreatorModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reasonLabels, setReasonLabels] = useState(DEFAULT_REASONS);
  const [fieldLabels, setFieldLabels] = useState(DEFAULT_FIELDS);
  const [waitOptions, setWaitOptions] = useState<number[]>([0, 7, 30]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchCreatorPolicy().then((p) => {
      if (!p) return;
      if (p.rejectionReasons) setReasonLabels(p.rejectionReasons);
      if (p.applicationFields) setFieldLabels(p.applicationFields);
      if (p.resubmitWaitDays?.length) setWaitOptions(p.resubmitWaitDays);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const toggleReason = (code: string) => {
    setErrors((e) => ({ ...e, reasons: "" }));
    const on = reasons.includes(code);
    setReasons(on ? reasons.filter((r) => r !== code) : [...reasons, code]);
    if (!on) setFields((f) => [...new Set([...f, ...(REASON_FIELDS[code] || [])])]);
  };

  const toggleField = (f: string) => setFields((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));

  // Drafts a polite message from the ticked reasons and fields; the Admin edits it before sending.
  const draftMessage = () => {
    const name = user.creatorApplication?.displayName || user.name;
    const lines = [
      `Chào ${name}, cảm ơn bạn đã đăng ký trở thành Creator trên PickMe3D.`,
      `Sau khi xem xét, đơn của bạn chưa được chấp thuận vì: ${reasons.map((r) => reasonLabels[r]?.toLowerCase()).join("; ")}.`,
    ];
    if (fields.length) lines.push(`Vui lòng cập nhật: ${fields.map((f) => fieldLabels[f]).join(", ")}.`);
    lines.push(wait ? `Bạn có thể gửi lại đơn sau ${wait} ngày.` : "Bạn có thể chỉnh sửa và gửi lại đơn ngay.");
    setMessage(lines.join("\n"));
    setErrors((e) => ({ ...e, message: "" }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!reasons.length) e.reasons = "Chọn ít nhất 1 lý do";
    if (message.trim().length < 20) e.message = "Lời nhắn tối thiểu 20 ký tự";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError("");
    const res = await updateCreatorStatusApi(user._id, "NONE", "", {
      reasons,
      requiredFields: fields,
      message: message.trim(),
      resubmitAfterDays: wait,
    });
    setBusy(false);
    if (res.success) {
      onDone();
      return;
    }
    if (res.errors) setErrors(res.errors);
    setError(res.message || "Không thể gửi quyết định từ chối");
  };

  const resubmitDate = useMemo(
    () => (wait ? new Date(Date.now() + wait * 864e5).toLocaleDateString("vi-VN") : null),
    [wait]
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-950">
          <div>
            <h3 id="reject-title" className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-zinc-400" aria-hidden="true">person_remove</span>
              Từ chối đơn đăng ký Creator
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {user.creatorApplication?.displayName || user.name} · {user.email}
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5" aria-label="Đóng">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {/* 1. Reasons */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-white">1. Lý do từ chối <span className="text-red-400">*</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(reasonLabels).map(([code, label]) => {
                const on = reasons.includes(code);
                return (
                  <label
                    key={code}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${on ? "bg-white/10 border-white/30 text-white" : "bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/20"}`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleReason(code)} className="mt-0.5 accent-white" />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
            {errors.reasons && <p className="text-red-400">{errors.reasons}</p>}
          </section>

          {/* 2. Fields to fix */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-white">2. Thông tin Creator cần bổ sung / chỉnh sửa</h4>
            <p className="text-zinc-500">Các ô được chọn sẽ được đánh dấu trong form khi Creator gửi lại. Giá trị hiện tại hiển thị bên cạnh để đối chiếu.</p>
            <div className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {Object.entries(fieldLabels).map(([field, label]) => {
                const on = fields.includes(field);
                return (
                  <label key={field} className={`grid grid-cols-[auto_130px_1fr] items-start gap-3 px-3 py-2.5 cursor-pointer ${on ? "bg-amber-500/10" : "bg-zinc-900 hover:bg-zinc-900/60"}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleField(field)} className="mt-0.5 accent-amber-400" />
                    <span className={on ? "text-amber-200 font-medium" : "text-zinc-300"}>{label}</span>
                    <span className="text-zinc-500 break-all line-clamp-2" title={currentValue(user, field)}>{currentValue(user, field)}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* 3. Message */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-white">3. Lời nhắn gửi Creator <span className="text-red-400">*</span></h4>
              <button
                type="button"
                onClick={draftMessage}
                disabled={!reasons.length}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-40 flex items-center gap-1"
                title={reasons.length ? "Soạn lời nhắn từ lý do và mục đã chọn" : "Chọn lý do trước"}
              >
                <span className="material-symbols-rounded text-sm" aria-hidden="true">edit_note</span>Soạn từ lựa chọn
              </button>
            </div>
            <textarea
              rows={6}
              maxLength={1500}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setErrors((x) => ({ ...x, message: "" }));
              }}
              placeholder="Giải thích cụ thể điều gì chưa đạt và Creator cần làm gì để được duyệt…"
              className={`w-full px-3 py-2.5 rounded-xl bg-zinc-900 border text-sm text-white placeholder-zinc-500 outline-none resize-y ${errors.message ? "border-red-500/60" : "border-white/10"}`}
            />
            <div className="flex justify-between text-zinc-500">
              <span className="text-red-400">{errors.message}</span>
              <span>{message.trim().length}/1500</span>
            </div>
          </section>

          {/* 4. Resubmission */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-white">4. Thời điểm được gửi lại</h4>
            <div className="flex flex-wrap gap-2">
              {waitOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={wait === d}
                  onClick={() => setWait(d)}
                  className={`px-3 py-1.5 rounded-lg border ${wait === d ? "bg-white text-black border-white font-semibold" : "bg-zinc-900 border-white/10 text-zinc-300 hover:text-white"}`}
                >
                  {WAIT_LABEL[d] || `Sau ${d} ngày`}
                </button>
              ))}
            </div>
            {resubmitDate && <p className="text-zinc-500">Creator gửi lại được từ ngày {resubmitDate}.</p>}
          </section>

          {/* Preview */}
          <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Creator sẽ nhận được</p>
            {reasons.length ? (
              <ul className="list-disc pl-5 text-zinc-200 space-y-0.5">{reasons.map((r) => <li key={r}>{reasonLabels[r]}</li>)}</ul>
            ) : (
              <p className="text-zinc-500">Chưa chọn lý do.</p>
            )}
            {fields.length > 0 && (
              <p className="text-amber-200">Cần sửa: {fields.map((f) => fieldLabels[f]).join(", ")}</p>
            )}
            {message.trim() && <p className="text-zinc-300 whitespace-pre-line border-l-2 border-white/20 pl-3">{message.trim()}</p>}
          </section>

          {error && <p className="text-red-400" role="alert">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-white/10 bg-zinc-950">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium">
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className="material-symbols-rounded text-sm" aria-hidden="true">send</span>
            {busy ? "Đang gửi…" : "Từ chối và gửi cho Creator"}
          </button>
        </div>
      </div>
    </div>
  );
}
