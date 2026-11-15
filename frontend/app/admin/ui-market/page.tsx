"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchAdminUiProducts, updateUiProductPriceApi, formatVnd, type AdminUiProduct } from "@/lib/uiMarketPricing";
import { getCategoryLabel } from "@/lib/ui-marketplace-data";

const MIN_PAID = 1000;
const MAX_PRICE = 50000000;

/**
 * UI Marketplace pricing (BR-06). The catalogue is fixed: Admin changes prices, never adds or removes products.
 */
export default function AdminUiMarketPage() {
  const [products, setProducts] = useState<AdminUiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pricing, setPricing] = useState("all");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminUiProducts();
    if (res.success && res.data) setProducts(res.data);
    else setError(res.message || "Không thể tải danh sách sản phẩm UI");
    setLoading(false);
  };

  useEffect(() => {
    // Opened from the UI Marketplace "Sửa giá" button: /admin/ui-market/?q=<productId>
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
    void load();
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (pricing === "custom" && !p.isCustom) return false;
      if (pricing === "default" && p.isCustom) return false;
      return !q || p.id.includes(q) || p.title.toLowerCase().includes(q);
    });
  }, [products, search, pricing]);

  const customCount = products.filter((p) => p.isCustom).length;

  const save = async (p: AdminUiProduct) => {
    const raw = editing[p.id] ?? "";
    const value = Number(raw || 0);
    if (!Number.isInteger(value) || value < MIN_PAID || value > MAX_PRICE) {
      setRowError((e) => ({ ...e, [p.id]: "Từ 1.000₫ đến 50.000.000₫ (sản phẩm UI luôn có phí)" }));
      return;
    }
    setSaving(p.id);
    const res = await updateUiProductPriceApi(p.id, value);
    setSaving(null);
    if (!res.success || !res.data) {
      setRowError((e) => ({ ...e, [p.id]: res.message || "Không thể lưu giá" }));
      return;
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, price: res.data!.price, isCustom: true, updatedAt: res.data!.updatedAt } : x)));
    setEditing((e) => {
      const next = { ...e };
      delete next[p.id];
      return next;
    });
    setToast(`#${p.id} ${p.title}: ${formatVnd(value)}`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-white/10">
        <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">UI Marketplace · Pricing</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">Giá sản phẩm UI Market</h1>
        <p className="text-zinc-400 text-xs sm:text-sm mt-1">
          Điều chỉnh giá cho {products.length} sản phẩm có sẵn trong UI Marketplace. Mọi sản phẩm đều có phí: chưa chỉnh thì dùng giá mặc định theo danh mục. Danh mục sản phẩm cố định: Admin chỉ sửa giá, không thêm sản phẩm mới. 100% doanh thu về nền tảng.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10">
          <p className="text-zinc-500">Tổng sản phẩm</p>
          <p className="text-2xl font-semibold text-white mt-1">{products.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10">
          <p className="text-zinc-500">Giá đã chỉnh</p>
          <p className="text-2xl font-semibold text-white mt-1">{customCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 col-span-2 sm:col-span-1">
          <p className="text-zinc-500">Giá mặc định</p>
          <p className="text-2xl font-semibold text-white mt-1">{products.length - customCount}</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xl" aria-hidden="true">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hoặc tên sản phẩm…"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Giá:</span>
          <select value={pricing} onChange={(e) => setPricing(e.target.value)} className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none">
            <option value="all">Tất cả</option>
            <option value="custom">Đã chỉnh</option>
            <option value="default">Mặc định</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-zinc-400 text-sm bg-zinc-900/40 rounded-2xl border border-white/10">Đang tải…</div>
      ) : error ? (
        <div className="p-8 text-center text-zinc-400 text-sm bg-zinc-900/40 rounded-2xl border border-white/10">{error}</div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/80 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mã</th>
                  <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                  <th className="py-3 px-4 font-semibold">Danh mục</th>
                  <th className="py-3 px-4 font-semibold">Giá hiện tại</th>
                  <th className="py-3 px-4 font-semibold text-right">Điều chỉnh giá (VND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((p) => {
                  const isEditing = editing[p.id] !== undefined;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono text-zinc-500">#{p.id}</td>
                      <td className="py-2.5 px-4 text-white font-medium">{p.title}</td>
                      <td className="py-2.5 px-4 text-zinc-400">{getCategoryLabel(p.category)}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/10 text-white border-white/20">
                          {formatVnd(p.price)}
                        </span>
                        <span className="ml-1.5 text-[10px] text-zinc-500">
                          {p.isCustom ? `mặc định ${formatVnd(p.defaultPrice)}` : "mặc định"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <form
                            className="inline-flex flex-wrap items-center justify-end gap-1.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void save(p);
                            }}
                          >
                            <input
                              autoFocus
                              inputMode="numeric"
                              aria-label={`Giá mới cho ${p.title}`}
                              value={editing[p.id]}
                              onChange={(e) => {
                                setEditing((x) => ({ ...x, [p.id]: e.target.value.replace(/[^\d]/g, "") }));
                                setRowError((x) => ({ ...x, [p.id]: "" }));
                              }}
                              className="w-28 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-white font-mono text-right focus:outline-none"
                            />
                            <button type="submit" disabled={saving === p.id} className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold disabled:opacity-50">
                              {saving === p.id ? "Đang lưu" : "Lưu"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing((x) => { const n = { ...x }; delete n[p.id]; return n; })}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300"
                            >
                              Hủy
                            </button>
                            {rowError[p.id] && <span className="w-full text-right text-red-400">{rowError[p.id]}</span>}
                          </form>
                        ) : (
                          <button
                            onClick={() => setEditing((x) => ({ ...x, [p.id]: String(p.price) }))}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-rounded text-sm" aria-hidden="true">sell</span>Sửa giá
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">Không có sản phẩm phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-white text-black text-xs font-semibold shadow-2xl" role="status">
          Đã cập nhật giá {toast}
        </div>
      )}
    </div>
  );
}
