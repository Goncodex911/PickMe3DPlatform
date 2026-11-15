"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminPlanPrice, fetchAdminPlanPricesApi, updatePlanPriceApi } from "@/lib/adminService";

const MIN_PRICE = 1000;
const MAX_PRICE = 50000000;
const vnd = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

/** Admin sets the monthly price of the paid plans. Admin itself never buys a plan. */
export default function PlanPriceCard() {
  const [plans, setPlans] = useState<AdminPlanPrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetchAdminPlanPricesApi();
    if (res.success && Array.isArray(res.data)) {
      const paid = res.data.filter((p) => p.configurable);
      setPlans(paid);
      setDrafts(Object.fromEntries(paid.map((p) => [p.id, String(p.price)])));
    } else {
      setMessage({ ok: false, text: res.message || "Không tải được giá gói" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (plan: AdminPlanPrice) => {
    const raw = (drafts[plan.id] || "").replace(/[.,\s]/g, "");
    const price = Number(raw);
    if (!/^\d+$/.test(raw) || price < MIN_PRICE || price > MAX_PRICE) {
      setMessage({ ok: false, text: `Giá phải là số nguyên VND từ ${vnd(MIN_PRICE)} đến ${vnd(MAX_PRICE)}` });
      return;
    }
    if (price === plan.price) {
      setMessage({ ok: false, text: "Giá mới trùng với giá hiện tại" });
      return;
    }
    if (!window.confirm(`Đổi giá gói ${plan.name} từ ${vnd(plan.price)} thành ${vnd(price)} / tháng?\nĐơn hàng đã tạo vẫn giữ giá cũ.`)) return;
    setSaving(plan.id);
    setMessage(null);
    const res = await updatePlanPriceApi(plan.id, price);
    setSaving("");
    setMessage({ ok: res.success, text: res.message || (res.success ? "Đã cập nhật giá gói" : "Không cập nhật được giá") });
    if (res.success) await load();
  };

  if (!plans.length && !message) return null;

  return (
    <section className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4" aria-labelledby="plan-price-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 id="plan-price-title" className="text-base font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-zinc-400 text-xl">sell</span>
            Giá gói tháng
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Admin không mua gói (đã sở hữu Slide và 3D) nhưng đặt giá bán cho người dùng. Giá mới áp dụng cho đơn hàng tạo sau khi lưu.
          </p>
        </div>
      </div>

      {plans.map((plan) => (
        <div key={plan.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Gói {plan.name}</p>
            <p className="text-[11px] text-zinc-500">
              Hiện tại: <span className="text-zinc-300 tabular-nums">{vnd(plan.price)}</span> / tháng
              {plan.isCustom ? ` · Mặc định ${vnd(plan.defaultPrice)}` : " · Giá mặc định"}
              {plan.updatedAt ? ` · Sửa lúc ${new Date(plan.updatedAt).toLocaleString("vi-VN")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`plan-price-${plan.id}`}>Giá gói {plan.name} (VND / tháng)</label>
            <input
              id={`plan-price-${plan.id}`}
              inputMode="numeric"
              value={drafts[plan.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [plan.id]: e.target.value }))}
              className="w-36 px-3 py-2 rounded-lg bg-zinc-950 border border-white/10 text-sm text-white tabular-nums outline-none focus:border-white/30"
            />
            <span className="text-xs text-zinc-500">₫ / tháng</span>
            <button
              type="button"
              onClick={() => void save(plan)}
              disabled={saving === plan.id}
              className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {saving === plan.id ? "Đang lưu…" : "Lưu giá"}
            </button>
          </div>
        </div>
      ))}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
