"use client";

// Hộp thoại xác nhận / nhập liệu nằm trong trang (thay window.confirm / window.prompt của trình duyệt).
// Dùng qua hook: const [dialog, openDialog] = useActionDialog(); const values = await openDialog({...});
// values = null khi Admin bấm Hủy, đóng hộp thoại hoặc nhấn Esc.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type BaseField = { name: string; label: string; hint?: string };
export type DialogField =
  | (BaseField & { type?: "text" | "textarea"; required?: boolean; placeholder?: string; defaultValue?: string; minLength?: number })
  | (BaseField & { type: "number"; required?: boolean; min?: number; max?: number; defaultValue?: number; suffix?: string })
  | (BaseField & { type: "checkbox"; defaultChecked?: boolean });

export interface DialogConfig {
  title: string;
  icon?: string;
  tone?: "good" | "bad" | "neutral";
  /** Bảng tóm tắt để Admin đối chiếu trước khi xác nhận, vd. [["Khách hàng", "User Demo 1"], ["Số tiền", "99.000 ₫"]] */
  summary?: [string, string][];
  message?: string;
  /** Hệ quả cần lưu ý, hiển thị nổi bật */
  warning?: string;
  fields?: DialogField[];
  confirmLabel: string;
}

export type DialogValues = Record<string, string | number | boolean>;

type Pending = { config: DialogConfig; resolve: (values: DialogValues | null) => void; id: number };

const TONE_BTN: Record<NonNullable<DialogConfig["tone"]>, string> = {
  good: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25",
  bad: "bg-red-500/15 border-red-500/40 text-red-200 hover:bg-red-500/25",
  neutral: "bg-white text-black border-white hover:bg-zinc-200",
};

function initialValues(fields: DialogField[] = []): DialogValues {
  const out: DialogValues = {};
  for (const f of fields) {
    if (f.type === "checkbox") out[f.name] = Boolean(f.defaultChecked);
    else if (f.type === "number") out[f.name] = f.defaultValue ?? "";
    else out[f.name] = f.defaultValue ?? "";
  }
  return out;
}

// Số tiền VND là số nguyên: bỏ mọi ký tự không phải chữ số ("99.000 ₫" → 99000); không có chữ số nào → NaN
function parseAmount(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : NaN;
}

export function validate(fields: DialogField[] = [], values: DialogValues) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "checkbox") continue;
    const raw = String(values[f.name] ?? "").trim();
    if (f.type === "number") {
      if (!raw) { if (f.required) errors[f.name] = "Bắt buộc nhập"; continue; }
      const n = parseAmount(raw);
      if (!Number.isFinite(n)) errors[f.name] = "Phải là số";
      else if (f.min != null && n < f.min) errors[f.name] = `Tối thiểu ${f.min.toLocaleString("vi-VN")}`;
      else if (f.max != null && n > f.max) errors[f.name] = `Tối đa ${f.max.toLocaleString("vi-VN")}`;
      continue;
    }
    if (f.required && !raw) errors[f.name] = "Bắt buộc nhập";
    else if (raw && f.minLength && raw.length < f.minLength) errors[f.name] = `Tối thiểu ${f.minLength} ký tự`;
  }
  return errors;
}

export function normalise(fields: DialogField[] = [], values: DialogValues): DialogValues {
  const out: DialogValues = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(v);
    else if (f.type === "number") out[f.name] = parseAmount(String(v ?? "")) || 0;
    else out[f.name] = String(v ?? "").trim();
  }
  return out;
}

function Dialog({ pending, onDone }: { pending: Pending; onDone: (values: DialogValues | null) => void }) {
  const { config } = pending;
  const [values, setValues] = useState<DialogValues>(() => initialValues(config.fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const confirmBtn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    (firstInput.current || confirmBtn.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onDone(null); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(config.fields, values);
    setErrors(found);
    if (Object.keys(found).length) return;
    onDone(normalise(config.fields, values));
  };

  const set = (name: string, v: string | boolean) => setValues((prev) => ({ ...prev, [name]: v }));
  // Ô nhập đầu tiên nhận focus khi mở hộp thoại
  const inputRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (el && !firstInput.current) firstInput.current = el;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title"
      onClick={(e) => { e.stopPropagation(); onDone(null); }}>
      <form className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl text-xs text-zinc-200"
        onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 id="action-dialog-title" className="text-base font-semibold text-white flex items-center gap-2">
            {config.icon && <span className="material-symbols-rounded text-zinc-400" aria-hidden="true">{config.icon}</span>}
            {config.title}
          </h3>
          <button type="button" onClick={() => onDone(null)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5" aria-label="Đóng">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {config.summary && config.summary.length > 0 && (
            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-zinc-900/60 p-3">
              {config.summary.map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-zinc-500">{k}</dt><dd className="text-zinc-100 break-words">{v}</dd></div>
              ))}
            </dl>
          )}
          {config.message && <p className="text-zinc-300 leading-relaxed">{config.message}</p>}
          {config.warning && (
            <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 leading-relaxed">
              <span className="material-symbols-rounded text-base" aria-hidden="true">warning</span>{config.warning}
            </p>
          )}

          {(config.fields || []).map((f) => {
            const id = `dlg-${f.name}`;
            const err = errors[f.name];
            if (f.type === "checkbox") {
              return (
                <label key={f.name} htmlFor={id} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-zinc-900 p-3 cursor-pointer">
                  <input id={id} type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} className="mt-0.5 accent-white" />
                  <span><span className="text-zinc-100">{f.label}</span>{f.hint && <span className="block text-zinc-500 mt-0.5">{f.hint}</span>}</span>
                </label>
              );
            }
            const required = "required" in f && f.required;
            const common = {
              id,
              ref: inputRef,
              value: String(values[f.name] ?? ""),
              "aria-invalid": Boolean(err),
              "aria-describedby": err ? `${id}-err` : undefined,
              className: `w-full px-3 py-2.5 rounded-xl bg-zinc-900 border text-sm text-white placeholder-zinc-500 outline-none focus:border-white/40 ${err ? "border-red-500/60" : "border-white/10"}`,
            };
            return (
              <div key={f.name} className="space-y-1.5">
                <label htmlFor={id} className="block text-zinc-300">
                  {f.label} {required ? <span className="text-red-400">*</span> : <span className="text-zinc-500">(tùy chọn)</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea {...common} rows={3} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} className={`${common.className} resize-y`} />
                ) : (
                  <div className="flex items-center gap-2">
                    <input {...common} type="text" inputMode={f.type === "number" ? "numeric" : undefined}
                      placeholder={f.type === "number" ? undefined : f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                    {f.type === "number" && f.suffix && <span className="text-zinc-500 shrink-0">{f.suffix}</span>}
                  </div>
                )}
                {f.hint && !err && <p className="text-zinc-500">{f.hint}</p>}
                {err && <p id={`${id}-err`} className="text-red-400">{err}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button type="button" onClick={() => onDone(null)} className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white">Hủy</button>
          <button ref={confirmBtn} type="submit" className={`px-3.5 py-2 rounded-lg border font-semibold ${TONE_BTN[config.tone || "neutral"]}`}>{config.confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}

export function useActionDialog(): [ReactNode, (config: DialogConfig) => Promise<DialogValues | null>] {
  const [pending, setPending] = useState<Pending | null>(null);
  const current = useRef<Pending | null>(null);
  const counter = useRef(0);

  const done = useCallback((values: DialogValues | null) => {
    const p = current.current;
    current.current = null;
    setPending(null);
    p?.resolve(values);
  }, []);

  const open = useCallback((config: DialogConfig) => new Promise<DialogValues | null>((resolve) => {
    current.current?.resolve(null); // mở hộp mới khi hộp cũ còn mở: hộp cũ coi như bị hủy
    counter.current += 1;
    const next = { config, resolve, id: counter.current };
    current.current = next;
    setPending(next);
  }), []);

  // id mới mỗi lần mở để form không giữ giá trị của lần trước
  const element = pending ? <Dialog key={pending.id} pending={pending} onDone={done} /> : null;
  return [element, open];
}
