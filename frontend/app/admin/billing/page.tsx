"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AdminOrder,
  AdminDashboardStats,
  fetchAdminOrdersApi,
  fetchAdminStatsApi,
  downloadOrdersCsv,
  PaginationMeta,
} from "@/lib/adminService";

export default function AdminBillingPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [orderSummary, setOrderSummary] = useState<{
    totalRevenue: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
  }>({ totalRevenue: 0, paidOrdersCount: 0, pendingOrdersCount: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, statsRes] = await Promise.all([
        fetchAdminOrdersApi({
          page,
          limit: 10,
          status: statusFilter,
          planId: planFilter,
          search: search.trim() || undefined,
        }),
        fetchAdminStatsApi(),
      ]);

      if (orderRes.success && orderRes.data) {
        setOrders(orderRes.data);
        if (orderRes.pagination) setPagination(orderRes.pagination);
        if (orderRes.summary) setOrderSummary(orderRes.summary);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu đơn hàng:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await downloadOrdersCsv();
    } catch (err: any) {
      alert(err.message || "Không thể xuất file CSV");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-rounded text-indigo-400 text-3xl">payments</span>
            Quản Trị Doanh Thu & Gói Cước
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Theo dõi giao dịch qua cổng PayOS, quản lý đơn hàng đăng ký Pro/Studio và đối soát doanh thu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 text-xs font-semibold text-neutral-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-base text-emerald-400">download</span>
            <span>{exporting ? "Đang xuất..." : "Xuất CSV Đơn Hàng"}</span>
          </button>
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-rounded text-base">refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">monetization_on</span>
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Tổng Doanh Thu Đã Thu</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {formatCurrency(stats?.billing?.totalRevenue || orderSummary.totalRevenue || 0)}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              {stats?.billing?.paidOrders || orderSummary.paidOrdersCount || 0} đơn thành công
            </p>
          </div>
        </div>

        {/* Pro Subscribers */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">workspace_premium</span>
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Người Dùng Gói Pro</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {stats?.plans?.pro ?? 0}
            </p>
            <p className="text-[11px] text-indigo-400 font-semibold mt-0.5">99.000 ₫ / tháng</p>
          </div>
        </div>

        {/* Studio Subscribers */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">diamond</span>
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Người Dùng Gói Studio</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {stats?.plans?.studio ?? 0}
            </p>
            <p className="text-[11px] text-amber-400 font-semibold mt-0.5">199.000 ₫ / tháng</p>
          </div>
        </div>

        {/* Free Plan Accounts */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">person</span>
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Người Dùng Gói Free</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {stats?.plans?.free ?? stats?.users?.total ?? 0}
            </p>
            <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">Tài nguyên tiêu chuẩn</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0f121d] border border-neutral-700/80 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="PAID">Đã thanh toán (PAID)</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Gói:</span>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0f121d] border border-neutral-700/80 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả gói</option>
              <option value="pro">Pro Plan</option>
              <option value="studio">Studio Plan</option>
            </select>
          </div>
        </div>

        {/* Search by Order Code */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã đơn (VD: 1729...)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-[#0f121d] border border-neutral-700/80 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#141824] border border-neutral-800/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#10131f] text-neutral-400 font-semibold border-b border-neutral-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Mã Đơn</th>
                <th className="py-3.5 px-4">Khách Hàng</th>
                <th className="py-3.5 px-4">Gói Đăng Ký</th>
                <th className="py-3.5 px-4">Thời Hạn</th>
                <th className="py-3.5 px-4">Số Tiền</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4">Thanh Toán Lúc</th>
                <th className="py-3.5 px-4">Ngày Tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <span className="material-symbols-rounded text-4xl text-neutral-600 block mb-2">
                      receipt_long
                    </span>
                    <p className="font-medium text-neutral-300">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Các giao dịch qua PayOS hoặc người dùng nâng cấp gói sẽ tự động hiển thị tại đây.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Order Code */}
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      #{order.orderCode}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {order.userPicture ? (
                          <img
                            src={order.userPicture}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-neutral-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] border border-indigo-500/30">
                            {order.userName ? order.userName[0].toUpperCase() : "U"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{order.userName}</div>
                          <div className="text-[11px] text-neutral-400">{order.userEmail || order.userId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3 px-4">
                      {order.planId === "studio" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                          Studio Plan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                          Pro Plan
                        </span>
                      )}
                    </td>

                    {/* Months */}
                    <td className="py-3 px-4 font-medium text-neutral-200">
                      {order.months} tháng
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {formatCurrency(order.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {order.status === "PAID" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Đã thanh toán
                        </span>
                      )}
                      {order.status === "PENDING" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Chờ thanh toán
                        </span>
                      )}
                      {order.status === "CANCELLED" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Đã hủy
                        </span>
                      )}
                    </td>

                    {/* Paid At */}
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {formatDate(order.paidAt)}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 bg-[#10131f] border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Trang <span className="font-bold text-white">{pagination.page}</span> / {pagination.pages} ({pagination.total} đơn)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Trước
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gateway & Webhook Technical Info */}
      <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-xl">hub</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Tích Hợp Cổng Thanh Toán PayOS</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Webhook nhận thanh toán tự động tại: <code className="text-indigo-300 font-mono">/api/payments/webhook</code>. Khi khách quét mã QR VietQR, đơn hàng sẽ chuyển sang PAID và kích hoạt gói ngay lập tức.
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          target="_blank"
          className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          <span>Xem Bảng Giá Khách Hàng</span>
          <span className="material-symbols-rounded text-sm">open_in_new</span>
        </Link>
      </div>
    </div>
  );
}
