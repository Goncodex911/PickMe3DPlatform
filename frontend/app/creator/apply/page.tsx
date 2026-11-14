"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreatorApplicationTracker from "@/components/CreatorApplicationTracker";
import {
  applyForCreator,
  fetchCreatorPolicy,
  fetchMyCreatorApplication,
  type CreatorApplicationPayload,
  type CreatorPolicy,
  type MyCreatorApplication,
} from "@/lib/permissions";

const STEPS = [
  { key: "policy", label: "Chính sách", icon: "gavel" },
  { key: "profile", label: "Thông tin Creator", icon: "badge" },
  { key: "bank", label: "Tài khoản nhận tiền", icon: "account_balance" },
  { key: "review", label: "Xác nhận & gửi", icon: "task_alt" },
] as const;

const SPECIALTY_LABELS: Record<string, string> = {
  "UI/UX": "UI/UX",
  Web: "Website",
  Mobile: "Mobile app",
  Slide: "Slide / Thuyết trình",
  "3D": "3D / Không gian",
  Illustration: "Minh họa",
  Branding: "Nhận diện thương hiệu",
  Other: "Khác",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  "<1": "Dưới 1 năm",
  "1-3": "1 – 3 năm",
  "3-5": "3 – 5 năm",
  "5+": "Trên 5 năm",
};

const BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank", "MB Bank", "ACB", "VPBank", "TPBank",
  "Sacombank", "VIB", "HDBank", "SHB", "OCB", "MSB", "SeABank", "Eximbank", "LPBank", "Nam A Bank", "Bac A Bank",
];
const OTHER_BANK = "__other__";

// Same rules as backend/src/config/creatorPolicy.js (the backend re-checks everything).
const PHONE_RE = /^(0|\+84)\d{9,10}$/;
const ACCOUNT_RE = /^\d{6,19}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
const DRAFT_KEY = "pickme3d_creator_application_draft";

type Errors = Partial<Record<keyof CreatorApplicationPayload, string>>;

const FIELD_STEP: Record<string, number> = {
  acceptPolicy: 0, acceptCopyright: 0, policyVersion: 0,
  displayName: 1, phone: 1, specialties: 1, experience: 1, portfolioUrl: 1, sampleLinks: 1, introduction: 1,
  bankName: 2, accountNumber: 2, accountHolder: 2, bankBranch: 2,
};

function toHolderName(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ");
}

function emptyForm(version: string): CreatorApplicationPayload {
  return {
    acceptPolicy: false,
    acceptCopyright: false,
    policyVersion: version,
    displayName: "",
    phone: "",
    specialties: [],
    experience: "",
    portfolioUrl: "",
    sampleLinks: ["", "", ""],
    introduction: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    bankBranch: "",
  };
}

function validateStep(step: number, f: CreatorApplicationPayload): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.acceptPolicy) e.acceptPolicy = "Bạn cần đồng ý với Chính sách Creator";
    if (!f.acceptCopyright) e.acceptCopyright = "Bạn cần cam kết về bản quyền nội dung";
  }
  if (step === 1) {
    if (f.displayName.trim().length < 2) e.displayName = "Tên hiển thị tối thiểu 2 ký tự";
    if (!PHONE_RE.test(f.phone.replace(/[\s.-]/g, ""))) e.phone = "Số điện thoại không hợp lệ (VD: 0912345678)";
    if (!f.specialties.length) e.specialties = "Chọn ít nhất 1 lĩnh vực";
    if (!f.experience) e.experience = "Chọn số năm kinh nghiệm";
    if (!URL_RE.test(f.portfolioUrl.trim())) e.portfolioUrl = "Link phải bắt đầu bằng http:// hoặc https://";
    if (f.sampleLinks.some((l) => l.trim() && !URL_RE.test(l.trim()))) e.sampleLinks = "Link sản phẩm mẫu không hợp lệ";
    if (f.introduction.trim().length < 50) e.introduction = `Giới thiệu tối thiểu 50 ký tự (hiện ${f.introduction.trim().length})`;
  }
  if (step === 2) {
    if (!f.bankName.trim()) e.bankName = "Chọn ngân hàng";
    if (!ACCOUNT_RE.test(f.accountNumber.replace(/\s/g, ""))) e.accountNumber = "Số tài khoản gồm 6–19 chữ số";
    if (!/^[A-Z ]{3,}$/.test(f.accountHolder.trim())) e.accountHolder = "Tên chủ tài khoản in hoa, không dấu, đúng như trên thẻ";
  }
  return e;
}

function maskAccount(n: string) {
  const d = n.replace(/\s/g, "");
  return d.length <= 4 ? d : `${"•".repeat(d.length - 4)}${d.slice(-4)}`;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/60";

function Field({ label, hint, error, children, htmlFor, flag }: { label: string; hint?: string; error?: string; children: React.ReactNode; htmlFor?: string; flag?: boolean }) {
  return (
    <div className={`space-y-1.5 ${flag ? "p-3 -mx-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/30" : ""}`}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
        {label}
        {flag && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 text-[10px] font-semibold">Admin yêu cầu chỉnh sửa</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-red-400 flex items-center gap-1"><span className="material-symbols-rounded text-sm" aria-hidden="true">error</span>{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function StatusScreen({ icon, title, children, tone = "slate" }: { icon: string; title: string; children: React.ReactNode; tone?: "slate" | "emerald" | "amber" | "red" }) {
  const tones = {
    slate: "bg-white/5 border-white/10 text-slate-300",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    red: "bg-red-500/10 border-red-500/30 text-red-300",
  };
  return (
    <div className="max-w-lg mx-auto text-center space-y-4 py-16 px-4">
      <div className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${tones[tone]}`}>
        <span className="material-symbols-rounded text-3xl" aria-hidden="true">{icon}</span>
      </div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function CreatorApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<CreatorPolicy | null>(null);
  const [mine, setMine] = useState<MyCreatorApplication | null>(null);
  const [blocked, setBlocked] = useState<"admin" | "error" | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreatorApplicationPayload>(emptyForm(""));
  const [otherBank, setOtherBank] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reloadStatus = async () => {
    setRefreshing(true);
    const my = await fetchMyCreatorApplication();
    setRefreshing(false);
    if (my.data) setMine(my.data);
  };

  useEffect(() => {
    if (!localStorage.getItem("pickme3d_token")) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const [pol, my] = await Promise.all([fetchCreatorPolicy(), fetchMyCreatorApplication()]);
      if (cancelled) return;
      if (my.status === 401) {
        router.replace("/");
        return;
      }
      if (my.status === 403) {
        setBlocked("admin");
        setLoading(false);
        return;
      }
      if (!pol || !my.data) {
        setBlocked("error");
        setLoading(false);
        return;
      }
      setPolicy(pol);
      setMine(my.data);

      // Pre-fill: session draft first, then the previous application, then the saved bank account.
      const base = emptyForm(pol.version);
      const prev = my.data.application || {};
      const bank = my.data.bank || { bankName: "", accountNumber: "", accountHolder: "" };
      let next: CreatorApplicationPayload = {
        ...base,
        displayName: prev.displayName || "",
        phone: prev.phone || "",
        specialties: prev.specialties || [],
        experience: prev.experience || "",
        portfolioUrl: prev.portfolioUrl || "",
        sampleLinks: [...(prev.sampleLinks || []), "", "", ""].slice(0, 3),
        introduction: prev.introduction || "",
        bankBranch: prev.bankBranch || "",
        bankName: bank.bankName || "",
        accountNumber: bank.accountNumber || "",
        accountHolder: bank.accountHolder || "",
      };
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
        if (draft && typeof draft === "object") next = { ...next, ...draft, policyVersion: pol.version, acceptPolicy: false, acceptCopyright: false };
      } catch {}
      if (next.bankName && !BANKS.includes(next.bankName)) setOtherBank(true);
      setForm(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Keep an unsent draft for this tab only (consents are never restored).
  useEffect(() => {
    if (loading || submitted) return;
    try {
      const { acceptPolicy, acceptCopyright, ...rest } = form;
      void acceptPolicy; void acceptCopyright;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch {}
  }, [form, loading, submitted]);

  // While the application waits for a decision, poll every minute (only when the tab is visible).
  const waiting = mine?.stage === "SUBMITTED" || mine?.stage === "IN_REVIEW";
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void reloadStatus();
    }, 60000);
    return () => window.clearInterval(id);
  }, [waiting]);

  const set = <K extends keyof CreatorApplicationPayload>(key: K, value: CreatorApplicationPayload[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goNext = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = (target: number) => {
    // Only allow jumping back, or forward through steps that are already valid.
    for (let i = 0; i < target; i++) {
      const e = validateStep(i, form);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    setStep(target);
  };

  const submit = async () => {
    for (let i = 0; i < 3; i++) {
      const e = validateStep(i, form);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError("");
    const res = await applyForCreator({
      ...form,
      phone: form.phone.replace(/[\s.-]/g, ""),
      accountNumber: form.accountNumber.replace(/\s/g, ""),
      sampleLinks: form.sampleLinks.map((l) => l.trim()).filter(Boolean),
    });
    setSubmitting(false);
    if (res.success) {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      setSubmitted(true);
      setShowForm(false);
      setStep(0);
      await reloadStatus();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (res.errors && Object.keys(res.errors).length) {
      setErrors(res.errors as Errors);
      const first = Math.min(...Object.keys(res.errors).map((k) => FIELD_STEP[k] ?? 3));
      setStep(first);
    }
    setSubmitError(res.message || "Không thể gửi đơn, vui lòng thử lại");
  };

  const specialtyOptions = useMemo(() => policy?.specialties || Object.keys(SPECIALTY_LABELS), [policy]);
  const experienceOptions = useMemo(() => policy?.experienceLevels || Object.keys(EXPERIENCE_LABELS), [policy]);

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      <div className="border-b border-white/10 bg-[#0a0e17] px-4 sm:px-8 py-4 flex items-center gap-3">
        <Link href="/profile" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_back</span>
          <span>Hồ sơ</span>
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-xs text-slate-200 font-bold">Đăng ký trở thành Creator</span>
      </div>
      <div className="flex-1 w-full">{content}</div>
    </div>
  );

  if (loading) {
    return shell(<p role="status" className="p-10 text-center text-sm text-slate-400">Đang tải…</p>);
  }

  if (blocked === "admin") {
    return shell(
      <StatusScreen icon="shield_person" title="Không áp dụng cho tài khoản này">
        <p>Tài khoản Quản trị viên không đăng ký Creator. Hãy dùng tài khoản người dùng để đăng ký.</p>
      </StatusScreen>
    );
  }
  if (blocked === "error" || !policy || !mine) {
    return shell(
      <StatusScreen icon="cloud_off" title="Không tải được biểu mẫu" tone="red">
        <p>Không kết nối được máy chủ. Vui lòng thử lại sau.</p>
      </StatusScreen>
    );
  }

  // Creators approved before the application form existed have no timeline to show.
  if ((mine.stage === "APPROVED" || mine.stage === "SUSPENDED") && !(mine.history || []).length) {
    return shell(
      mine.stage === "APPROVED" ? (
        <StatusScreen icon="verified" title="Bạn đã là Creator" tone="emerald">
          <p>Bạn có thể công khai, đặt giá và bán Template của mình.</p>
          <Link href="/creator/wallet" className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white">
            Mở Ví Creator
          </Link>
        </StatusScreen>
      ) : (
        <StatusScreen icon="block" title="Quyền Creator đang bị tạm khóa" tone="red">
          <p>{mine.reviewNote ? `Lý do: ${mine.reviewNote}` : "Vui lòng liên hệ Quản trị viên để được hỗ trợ."}</p>
          <Link href="/appeals" className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white">
            Gửi khiếu nại
          </Link>
        </StatusScreen>
      )
    );
  }

  // Tracker: every state except "never applied" and "rejected, now editing a new application".
  const showTracker =
    mine.stage === "SUBMITTED" ||
    mine.stage === "IN_REVIEW" ||
    mine.stage === "APPROVED" ||
    mine.stage === "SUSPENDED" ||
    (mine.stage === "REJECTED" && !showForm);

  if (showTracker) {
    return shell(
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Theo dõi đơn đăng ký Creator</h1>
          {submitted && (
            <p className="text-sm text-emerald-300 flex items-center gap-1.5">
              <span className="material-symbols-rounded text-base" aria-hidden="true">check_circle</span>
              Đã gửi đơn thành công. Bạn có thể theo dõi tiến trình xét duyệt tại đây.
            </p>
          )}
        </header>
        <CreatorApplicationTracker
          data={mine}
          reviewDays={policy.reviewDays}
          refreshing={refreshing}
          onRefresh={reloadStatus}
          onResubmit={() => {
            setSubmitted(false);
            setShowForm(true);
            setStep(0);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  const flagged = new Set(mine.stage === "REJECTED" ? (mine.rejection?.requiredFields || []).map((f) => f.field) : []);
  const share = `${policy.creatorSharePercent}% / ${policy.platformSharePercent}%`;

  return shell(
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trở thành Creator trên PickMe3D</h1>
        <p className="text-sm text-slate-400">Công khai và bán Template của bạn, nhận {policy.creatorSharePercent}% doanh thu mỗi lượt bán.</p>
        {mine.stage === "REJECTED" && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
            <p className="font-semibold">Đơn trước chưa được duyệt. Hãy chỉnh sửa theo phản hồi của Quản trị viên rồi gửi lại.</p>
            {mine.rejection?.requiredFields?.length ? (
              <p>Cần sửa: {mine.rejection.requiredFields.map((f) => f.label).join(", ")} (được đánh dấu trong form).</p>
            ) : null}
            {(mine.rejection?.message || mine.reviewNote) && <p className="text-amber-100/80 whitespace-pre-line">“{mine.rejection?.message || mine.reviewNote}”</p>}
          </div>
        )}
      </header>

      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Các bước đăng ký">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => i < step && goTo(i)}
                disabled={i > step}
                aria-current={state === "current" ? "step" : undefined}
                className="w-full text-left group disabled:cursor-default"
              >
                <div className={`h-1 rounded-full mb-2 ${state === "todo" ? "bg-white/10" : "bg-emerald-500"}`} />
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                      state === "done"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : state === "current"
                          ? "border-emerald-500 text-emerald-300"
                          : "border-white/15 text-slate-500"
                    }`}
                  >
                    {state === "done" ? <span className="material-symbols-rounded text-sm" aria-hidden="true">check</span> : i + 1}
                  </span>
                  <span className={`hidden sm:inline text-xs font-semibold truncate ${state === "todo" ? "text-slate-500" : "text-slate-200"}`}>{s.label}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="sm:hidden text-xs font-semibold text-slate-300">Bước {step + 1}/4 · {STEPS[step].label}</p>

      <section className="p-5 sm:p-6 rounded-2xl bg-[#0e1422] border border-white/10 space-y-5">
        {/* STEP 1: POLICY */}
        {step === 0 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Chính sách Creator</h2>
              <span className="text-[11px] text-slate-500 font-mono">Phiên bản {policy.version}</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto pr-2 space-y-4 text-sm text-slate-300 leading-relaxed">
              <div>
                <h3 className="font-semibold text-white mb-1">1. Quyền của Creator</h3>
                <p>Creator được tạo, công khai, đặt giá và bán Template do mình sở hữu trên Template Marketplace. Creator vẫn mua và sử dụng sản phẩm như mọi người dùng khác.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">2. Chia sẻ doanh thu</h3>
                <p>Mỗi lượt bán Template của bạn được chia <strong className="text-white">{share}</strong> (Creator / nền tảng). Doanh thu chỉ được ghi nhận khi đơn hàng thanh toán thành công. Template miễn phí không phát sinh doanh thu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">3. Kiểm duyệt nội dung</h3>
                <p>Mỗi lần công khai, Template được Quản trị viên duyệt trước khi hiển thị trên Marketplace. Template có thể bị từ chối hoặc gỡ nếu vi phạm chính sách. Gỡ Template không chuyển quyền sở hữu của bạn.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">4. Bản quyền và nội dung bị cấm</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Chỉ đăng nội dung do bạn tạo ra hoặc có đầy đủ quyền thương mại.</li>
                  <li>Không sao chép, bán lại Template đã mua của người khác dưới tên mình.</li>
                  <li>Không đăng nội dung vi phạm pháp luật, phản cảm, lừa đảo hoặc chứa mã độc.</li>
                </ul>
                <p className="mt-1">Người mua chỉ nhận <strong className="text-white">quyền sử dụng</strong>; bạn vẫn giữ quyền sở hữu Template.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">5. Thanh toán và rút tiền</h3>
                <p>Bạn rút tiền từ Ví Creator về tài khoản ngân hàng đứng tên mình, tối thiểu <strong className="text-white">{policy.minPayoutVnd.toLocaleString("vi-VN")}₫</strong> mỗi lần. Thông tin ngân hàng sai có thể làm chậm hoặc thất bại giao dịch.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">6. Tạm khóa quyền Creator</h3>
                <p>Khi vi phạm, quyền Creator có thể bị tạm khóa: các Template đang bán bị gỡ khỏi Marketplace. Người đã mua vẫn giữ quyền sử dụng, và doanh thu đã ghi nhận vẫn thuộc về bạn. Bạn có thể gửi khiếu nại.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              {([
                ["acceptPolicy", "Tôi đã đọc và đồng ý với Chính sách Creator ở trên."],
                ["acceptCopyright", "Tôi cam kết nội dung đăng bán do tôi sở hữu hoặc có đầy đủ quyền thương mại."],
              ] as const).map(([key, text]) => (
                <div key={key}>
                  <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0"
                    />
                    <span>{text}</span>
                  </label>
                  {errors[key] && <p className="text-[11px] text-red-400 ml-7 mt-1">{errors[key]}</p>}
                </div>
              ))}
              {errors.policyVersion && <p className="text-[11px] text-red-400">{errors.policyVersion}</p>}
            </div>
          </>
        )}

        {/* STEP 2: PROFILE */}
        {step === 1 && (
          <>
            <div>
              <h2 className="text-lg font-bold">Thông tin Creator</h2>
              <p className="text-xs text-slate-400 mt-1">Quản trị viên dùng thông tin này để đánh giá hồ sơ. Tên hiển thị sẽ xuất hiện trên Template của bạn.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field flag={flagged.has("displayName")} label="Tên hiển thị Creator *" error={errors.displayName} htmlFor="ca-name">
                <input id="ca-name" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={60} placeholder="VD: Minh Thư Studio" className={`${inputCls} ${errors.displayName ? "border-red-500/60" : "border-white/10"}`} />
              </Field>
              <Field flag={flagged.has("phone")} label="Số điện thoại liên hệ *" error={errors.phone} hint="Chỉ Quản trị viên xem được" htmlFor="ca-phone">
                <input id="ca-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0912345678" className={`${inputCls} ${errors.phone ? "border-red-500/60" : "border-white/10"}`} />
              </Field>
            </div>

            <Field flag={flagged.has("specialties")} label="Lĩnh vực chuyên môn *" error={errors.specialties}>
              <div className="flex flex-wrap gap-2">
                {specialtyOptions.map((s) => {
                  const on = form.specialties.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("specialties", on ? form.specialties.filter((x) => x !== s) : [...form.specialties, s])}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold" : "bg-white/5 border-white/10 text-slate-300 hover:text-white"}`}
                    >
                      {SPECIALTY_LABELS[s] || s}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field flag={flagged.has("experience")} label="Kinh nghiệm thiết kế *" error={errors.experience}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {experienceOptions.map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={form.experience === x}
                    onClick={() => set("experience", x)}
                    className={`py-2 rounded-xl text-xs border transition-colors ${form.experience === x ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold" : "bg-white/5 border-white/10 text-slate-300 hover:text-white"}`}
                  >
                    {EXPERIENCE_LABELS[x] || x}
                  </button>
                ))}
              </div>
            </Field>

            <Field flag={flagged.has("portfolioUrl")} label="Link portfolio *" error={errors.portfolioUrl} hint="Behance, Dribbble, website cá nhân…" htmlFor="ca-portfolio">
              <input id="ca-portfolio" type="url" value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="https://behance.net/ten-cua-ban" className={`${inputCls} ${errors.portfolioUrl ? "border-red-500/60" : "border-white/10"}`} />
            </Field>

            <Field flag={flagged.has("sampleLinks")} label="Sản phẩm mẫu (tối đa 3, không bắt buộc)" error={errors.sampleLinks}>
              <div className="space-y-2">
                {form.sampleLinks.map((link, i) => (
                  <input
                    key={i}
                    type="url"
                    aria-label={`Sản phẩm mẫu ${i + 1}`}
                    value={link}
                    onChange={(e) => set("sampleLinks", form.sampleLinks.map((l, j) => (j === i ? e.target.value : l)))}
                    placeholder={`https://… (sản phẩm ${i + 1})`}
                    className={`${inputCls} border-white/10`}
                  />
                ))}
              </div>
            </Field>

            <Field flag={flagged.has("introduction")} label="Giới thiệu bản thân và loại Template bạn muốn bán *" error={errors.introduction} hint={`${form.introduction.trim().length}/1000 ký tự, tối thiểu 50`} htmlFor="ca-intro">
              <textarea id="ca-intro" rows={5} maxLength={1000} value={form.introduction} onChange={(e) => set("introduction", e.target.value)} placeholder="Kinh nghiệm, phong cách thiết kế, các bộ Template bạn dự định đăng bán…" className={`${inputCls} resize-y ${errors.introduction ? "border-red-500/60" : "border-white/10"}`} />
            </Field>
          </>
        )}

        {/* STEP 3: BANK */}
        {step === 2 && (
          <>
            <div>
              <h2 className="text-lg font-bold">Tài khoản nhận tiền</h2>
              <p className="text-xs text-slate-400 mt-1">Doanh thu rút từ Ví Creator được chuyển vào tài khoản này. Bạn có thể đổi lại trong Ví Creator sau khi được duyệt.</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex gap-2">
              <span className="material-symbols-rounded text-base shrink-0" aria-hidden="true">info</span>
              <span>Tài khoản phải đứng tên chính bạn. Tên chủ tài khoản viết <strong>in hoa, không dấu</strong>, giống hệt trên thẻ hoặc ứng dụng ngân hàng.</span>
            </div>

            <Field flag={flagged.has("bankName")} label="Ngân hàng *" error={errors.bankName} htmlFor="ca-bank">
              <select
                id="ca-bank"
                value={otherBank ? OTHER_BANK : form.bankName}
                onChange={(e) => {
                  if (e.target.value === OTHER_BANK) {
                    setOtherBank(true);
                    set("bankName", "");
                  } else {
                    setOtherBank(false);
                    set("bankName", e.target.value);
                  }
                }}
                className={`${inputCls} ${errors.bankName ? "border-red-500/60" : "border-white/10"}`}
              >
                <option value="">— Chọn ngân hàng —</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value={OTHER_BANK}>Ngân hàng khác…</option>
              </select>
              {otherBank && (
                <input aria-label="Tên ngân hàng khác" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="Nhập tên ngân hàng" className={`${inputCls} border-white/10 mt-2`} />
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field flag={flagged.has("accountNumber")} label="Số tài khoản *" error={errors.accountNumber} htmlFor="ca-acc">
                <input id="ca-acc" inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value.replace(/[^\d\s]/g, ""))} placeholder="0123456789" className={`${inputCls} font-mono ${errors.accountNumber ? "border-red-500/60" : "border-white/10"}`} />
              </Field>
              <Field flag={flagged.has("accountHolder")} label="Tên chủ tài khoản *" error={errors.accountHolder} hint="Tự động chuyển thành in hoa, không dấu" htmlFor="ca-holder">
                <input id="ca-holder" autoComplete="off" value={form.accountHolder} onChange={(e) => set("accountHolder", toHolderName(e.target.value))} placeholder="NGUYEN VAN A" className={`${inputCls} uppercase ${errors.accountHolder ? "border-red-500/60" : "border-white/10"}`} />
              </Field>
            </div>

            <Field label="Chi nhánh (không bắt buộc)" htmlFor="ca-branch">
              <input id="ca-branch" value={form.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} maxLength={120} placeholder="VD: Chi nhánh Hà Nội" className={`${inputCls} border-white/10`} />
            </Field>
          </>
        )}

        {/* STEP 4: REVIEW */}
        {step === 3 && (
          <>
            <div>
              <h2 className="text-lg font-bold">Kiểm tra lại và gửi đơn</h2>
              <p className="text-xs text-slate-400 mt-1">Sau khi gửi, đơn sẽ chờ Quản trị viên duyệt (dự kiến {policy.reviewDays} ngày làm việc).</p>
            </div>

            {[
              {
                title: "Chính sách",
                stepIndex: 0,
                rows: [
                  ["Phiên bản", policy.version],
                  ["Chia doanh thu", share],
                  ["Đồng ý", form.acceptPolicy && form.acceptCopyright ? "Đã đồng ý chính sách và cam kết bản quyền" : "Chưa đồng ý"],
                ],
              },
              {
                title: "Thông tin Creator",
                stepIndex: 1,
                rows: [
                  ["Tên hiển thị", form.displayName],
                  ["Điện thoại", form.phone],
                  ["Lĩnh vực", form.specialties.map((s) => SPECIALTY_LABELS[s] || s).join(", ")],
                  ["Kinh nghiệm", EXPERIENCE_LABELS[form.experience] || form.experience],
                  ["Portfolio", form.portfolioUrl],
                  ["Sản phẩm mẫu", form.sampleLinks.filter((l) => l.trim()).join("\n") || "—"],
                  ["Giới thiệu", form.introduction],
                ],
              },
              {
                title: "Tài khoản nhận tiền",
                stepIndex: 2,
                rows: [
                  ["Ngân hàng", form.bankName + (form.bankBranch ? ` · ${form.bankBranch}` : "")],
                  ["Số tài khoản", maskAccount(form.accountNumber)],
                  ["Chủ tài khoản", form.accountHolder],
                ],
              },
            ].map((block) => (
              <div key={block.title} className="rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
                  <h3 className="text-sm font-semibold">{block.title}</h3>
                  <button type="button" onClick={() => setStep(block.stepIndex)} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm" aria-hidden="true">edit</span>Sửa
                  </button>
                </div>
                <dl className="divide-y divide-white/5">
                  {block.rows.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-3 px-4 py-2.5 text-xs">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="text-slate-200 whitespace-pre-line break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2" role="alert">
                <span className="material-symbols-rounded text-base" aria-hidden="true">error</span>
                {submitError}
              </div>
            )}
          </>
        )}
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <span className="material-symbols-rounded text-base" aria-hidden="true">arrow_back</span>Quay lại
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            {step === 0 ? "Đồng ý và tiếp tục" : "Tiếp tục"}
            <span className="material-symbols-rounded text-base" aria-hidden="true">arrow_forward</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-base" aria-hidden="true">send</span>
            {submitting ? "Đang gửi…" : "Gửi đơn đăng ký"}
          </button>
        )}
      </div>
    </div>
  );
}
