"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPriceHistory, updateTemplatePrice, type PriceVersion } from "@/lib/templatePricing";

const MIN_PAID = 1000;
const MAX_PRICE = 50000000;
const QUICK_PRICES = [29000, 49000, 79000, 99000, 149000];
const CREATOR_SHARE = 0.7;

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;
const fmtDate = (v: string | null) =>
  v ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "—";

/**
 * Owner-only price editor for a template: a price form, plus a version tag that opens the price history.
 * The backend re-checks ownership; this dialog is only offered to the owner.
 */
export default function TemplatePriceModal({
  templateId,
  title,
  currentPrice,
  onClose,
  onSaved,
}: {
  templateId: string;
  title: string;
  currentPrice: number;
  onClose: () => void;
  onSaved: (price: number) => void;
}) {
  const [tab, setTab] = useState<"edit" | "history">("edit");
  const [history, setHistory] = useState<PriceVersion[] | null>(null);
  const [ownerType, setOwnerType] = useState<"ADMIN" | "CREATOR">("CREATOR");
  const [price, setPrice] = useState(currentPrice);
  const [input, setInput] = useState(String(currentPrice || ""));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchPriceHistory(templateId).then((res) => {
      if (res.success) {
        setHistory(res.history || []);
        if (res.ownerType) setOwnerType(res.ownerType);
        if (typeof res.price === "number") setPrice(res.price);
      } else {
        setHistory([]);
        setError(res.message || "");
      }
    });
  }, [templateId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const value = Number(input || 0);
  const validation = useMemo(() => {
    if (!input) return "Nhập giá bán";
    if (!Number.isInteger(value) || value < 0 || value > MAX_PRICE) return `Tối đa ${vnd(MAX_PRICE)}`;
    if (value > 0 && value < MIN_PAID) return `Tối thiểu ${vnd(MIN_PAID)} (hoặc 0 để miễn phí)`;
    if (value === price) return "Giá mới trùng giá hiện tại";
    return "";
  }, [input, value, price]);

  const latest = history && history.length ? history[history.length - 1] : null;
  const versionTag = latest ? `v${latest.version}` : "v1";
  const change = price > 0 && value > 0 && value !== price ? Math.round(((value - price) / price) * 100) : null;

  const save = async () => {
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    const res = await updateTemplatePrice(templateId, value, note.trim());
    setSaving(false);
    if (!res.success) {
      setError(res.message || "Không thể cập nhật giá");
      return;
    }
    setPrice(res.price ?? value);
    if (res.history) setHistory(res.history);
    setNote("");
    setSaved(true);
    onSaved(res.price ?? value);
    setTimeout(() => setSaved(false), 2500);
  };

  // Visual language of the Profile page: white panels, #e1e4e8 lines, charcoal primary button, outline secondaries.
  const chip = (active: boolean) =>
    `h-8 px-3 rounded-[9px] border text-xs font-semibold tabular-nums transition-colors ${
      active ? "bg-[#25282d] border-[#25282d] !text-white" : "bg-white border-[#e1e4e8] !text-[#252932] hover:bg-[#f5f6f7]"
    }`;
  const field =
    "w-full h-11 px-3 rounded-[9px] border bg-white text-[#17191d] outline-none transition-colors focus:border-[#3157d5] focus:ring-2 focus:ring-[#3157d5]/15";

  return (
    <div className="fixed inset-0 z-[80] bg-[rgb(18_26_38/40%)] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="price-title" onClick={() => !saving && onClose()}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-[#e1e4e8] shadow-[0_12px_40px_rgb(18_26_38/18%)] text-[#17191d]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[22px] pt-5 pb-4 border-b border-[#eceef0]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-xs text-[#717985]">Giá bán Template</p>
              <h2 id="price-title" className="m-0 mt-0.5 text-[17px] font-[650] tracking-[-0.2px] text-[#20242a] truncate" title={title}>{title}</h2>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="w-[34px] h-[34px] shrink-0 inline-flex items-center justify-center rounded-[9px] border border-[#e1e4e8] bg-white !text-[#626b78] hover:bg-[#f5f6f7]"
              aria-label="Đóng"
            >
              <span className="material-symbols-rounded text-[18px]">close</span>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[22px] font-bold tabular-nums text-[#17191d]">{price > 0 ? vnd(price) : "Miễn phí"}</span>
            {/* Version tag: opens the price history */}
            <button
              type="button"
              onClick={() => setTab(tab === "history" ? "edit" : "history")}
              className={`inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[5px] text-[11px] font-semibold border transition-colors ${
                tab === "history" ? "bg-[#eef2fd] border-[#c9d5f7] !text-[#3157d5]" : "bg-[#f0f2f4] border-transparent !text-[#505863] hover:!text-[#17191d]"
              }`}
              title="Xem lịch sử thay đổi giá"
              aria-pressed={tab === "history"}
            >
              <span className="material-symbols-rounded text-[14px]" aria-hidden="true">history</span>
              {history === null ? "…" : versionTag}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-[#eceef0]" role="tablist">
          {([
            ["edit", "Đặt giá mới"],
            ["history", `Lịch sử giá${history ? ` (${history.length})` : ""}`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`py-3 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === key ? "border-[#17191d] !text-[#17191d] font-semibold" : "border-transparent !text-[#717985] hover:!text-[#17191d]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "edit" ? (
          <form
            className="px-[22px] py-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="tpl-price" className="block text-xs font-semibold text-[#4c5562]">Giá mới (VND)</label>
              <div className="relative">
                <input
                  id="tpl-price"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="off"
                  value={input ? Number(input).toLocaleString("vi-VN") : ""}
                  onChange={(e) => {
                    setInput(e.target.value.replace(/[^\d]/g, "").slice(0, 9));
                    setError("");
                  }}
                  placeholder="VD: 49.000"
                  className={`${field} pr-9 text-base font-semibold tabular-nums ${error ? "border-[#c13232]" : "border-[#dfe2e6]"}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b838d] text-sm">₫</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRICES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setInput(String(p));
                      setError("");
                    }}
                    className={chip(value === p && input !== "")}
                  >
                    {vnd(p)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setInput("0");
                    setError("");
                  }}
                  className={chip(input === "0")}
                >
                  Miễn phí
                </button>
              </div>
            </div>

            {value > 0 && (
              <dl className="m-0 rounded-[9px] bg-[#f6f7f8] border border-[#eceef0] px-3 py-2.5 text-xs space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#69717d]">{ownerType === "CREATOR" ? "Bạn nhận mỗi lượt bán (70%)" : "Doanh thu nền tảng mỗi lượt bán"}</dt>
                  <dd className="m-0 font-semibold tabular-nums text-[#17191d]">{vnd(ownerType === "CREATOR" ? value * CREATOR_SHARE : value)}</dd>
                </div>
                {change !== null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#69717d]">So với giá hiện tại</dt>
                    <dd className={`m-0 font-semibold tabular-nums ${change > 0 ? "text-[#a15c07]" : "text-[#3157d5]"}`}>{change > 0 ? `+${change}%` : `${change}%`}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="space-y-2">
              <label htmlFor="tpl-note" className="block text-xs font-semibold text-[#4c5562]">
                Ghi chú thay đổi <span className="font-normal text-[#858c95]">(không bắt buộc)</span>
              </label>
              <input
                id="tpl-note"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Khuyến mãi cuối năm"
                className={`${field} border-[#dfe2e6] text-[13px]`}
              />
              <p className="m-0 text-[11px] text-[#858c95]">Ghi chú được lưu vào lịch sử giá cùng phiên bản mới.</p>
            </div>

            {error && <p className="m-0 text-xs text-[#c13232]" role="alert">{error}</p>}
            {saved && (
              <p className="m-0 text-xs text-[#1f7a4d] flex items-center gap-1" role="status">
                <span className="material-symbols-rounded text-[15px]" aria-hidden="true">check_circle</span>
                Đã lưu giá mới ({versionTag})
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="min-h-[38px] px-[13px] rounded-[9px] border border-[#e1e4e8] bg-white text-xs font-[550] !text-[#252932] hover:bg-[#f5f6f7]"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving || Boolean(validation)}
                className="min-h-[38px] px-[13px] rounded-[9px] border border-[#25282d] bg-[#25282d] text-xs font-[550] !text-white hover:bg-[#42464d] hover:border-[#42464d] disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-rounded text-[17px]" aria-hidden="true">sell</span>
                {saving ? "Đang lưu…" : "Lưu giá"}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-[22px] py-5">
            {history === null ? (
              <p className="m-0 text-xs text-[#717985]" role="status">Đang tải lịch sử…</p>
            ) : history.length === 0 ? (
              <p className="m-0 text-xs text-[#717985]">Template chưa từng được đặt giá.</p>
            ) : (
              <ol className="relative m-0 p-0 list-none border-l border-[#e1e4e8] ml-1.5 space-y-4">
                {[...history].reverse().map((v) => {
                  const delta = v.previousPrice && v.price ? Math.round(((v.price - v.previousPrice) / v.previousPrice) * 100) : null;
                  return (
                    <li key={v.version} className="relative pl-4">
                      <span className={`absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full border-2 border-white ${v.current ? "bg-[#17191d]" : "bg-[#c9ced5]"}`} />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-[2px] rounded-[5px] text-[10px] font-semibold ${v.current ? "bg-[#eef2fd] text-[#3157d5]" : "bg-[#f0f2f4] text-[#505863]"}`}>v{v.version}</span>
                        <strong className="text-sm font-semibold tabular-nums text-[#17191d]">{v.price > 0 ? vnd(v.price) : "Miễn phí"}</strong>
                        {v.previousPrice !== null && v.previousPrice > 0 && (
                          <span className="text-[11px] text-[#858c95] tabular-nums">từ {vnd(v.previousPrice)}</span>
                        )}
                        {delta !== null && (
                          <span className={`text-[11px] font-semibold tabular-nums ${delta > 0 ? "text-[#a15c07]" : "text-[#3157d5]"}`}>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
                        )}
                        {v.current && <span className="text-[10px] font-semibold text-[#69717d]">· Hiện tại</span>}
                      </div>
                      <p className="m-0 mt-1 text-[11px] text-[#858c95]">
                        {fmtDate(v.at)}
                        {v.by ? ` · ${v.by}` : ""}
                      </p>
                      {v.note && <p className="m-0 mt-1 text-xs text-[#4c5562]">“{v.note}”</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
