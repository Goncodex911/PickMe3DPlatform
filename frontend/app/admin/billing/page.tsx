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

  // Filters state
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [sellerTypeFilter, setSellerTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [orderSummary, setOrderSummary] = useState<{
    totalRevenue: number;
    totalGrossVolume?: number;
    totalAdminRevenue?: number;
    totalCreatorEarnings?: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
    breakdown?: any;
  }>({
    totalRevenue: 0,
    totalGrossVolume: 0,
    totalAdminRevenue: 0,
    totalCreatorEarnings: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, statsRes] = await Promise.all([
        fetchAdminOrdersApi({
          page,
          limit: 12,
          status: statusFilter,
          planId: planFilter,
          orderType: orderTypeFilter,
          sellerType: sellerTypeFilter,
          transactionSource: sourceFilter,
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
  }, [page, statusFilter, planFilter, orderTypeFilter, sellerTypeFilter, sourceFilter, search]);

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

  const formatCurrency = (val?: number) => {
    const num = val || 0;
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
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

  const activeBreakdown = orderSummary.breakdown?.sources || stats?.billing?.breakdown?.sources;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
            Billing & Revenue Operations
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-rounded text-zinc-400 text-3xl">payments</span>
            Quản Trị Doanh Thu & Đơn Hàng
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Phân loại doanh thu chuẩn hóa theo nguồn: Template Admin (100%), Template Creator (70/30), Admin Marketplace và Gói Hội viên.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-base text-black">download</span>
            <span>{exporting ? "Đang xuất..." : "Xuất CSV Doanh Thu"}</span>
          </button>
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-rounded text-base">refresh</span>
          </button>
        </div>
      </div>

      {/* Top Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Admin Net Revenue */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-emerald-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Doanh Thu Thực Nhận (Admin)</p>
            <p className="text-2xl font-semibold text-white tracking-tight mt-0.5">
              {formatCurrency(orderSummary.totalAdminRevenue || stats?.billing?.totalAdminRevenue || 0)}
            </p>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
              Sau khi khấu trừ hoa hồng
            </p>
          </div>
        </div>

        {/* Gross Sales Volume */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">bar_chart</span>
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Doanh Số Gộp Toàn Sàn</p>
            <p className="text-2xl font-semibold text-white tracking-tight mt-0.5">
              {formatCurrency(orderSummary.totalGrossVolume || stats?.billing?.totalGrossVolume || 0)}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
              {stats?.billing?.paidOrders || orderSummary.paidOrdersCount || 0} đơn thành công
            </p>
          </div>
        </div>

        {/* Creator Commission Paid */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-indigo-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">group</span>
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Tiền Trả Creator (70%)</p>
            <p className="text-2xl font-semibold text-white tracking-tight mt-0.5">
              {formatCurrency(orderSummary.totalCreatorEarnings || stats?.billing?.totalCreatorEarnings || 0)}
            </p>
            <p className="text-[11px] text-indigo-400 font-medium mt-0.5">
              Không gộp chung vào Admin
            </p>
          </div>
        </div>

        {/* Total Orders Status */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">receipt_long</span>
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Đơn Hàng Chờ Xử Lý</p>
            <p className="text-2xl font-semibold text-white tracking-tight mt-0.5">
              {orderSummary.pendingOrdersCount || stats?.billing?.pendingOrders || 0}
            </p>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Đơn hàng PENDING</p>
          </div>
        </div>
      </div>

      {/* Rule 3.2: 4-Source Revenue Stream Breakdown Cards */}
      <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-400 text-lg">pie_chart</span>
              Phân Loại Doanh Thu Theo 4 Nguồn (Revenue Classification Rules 2.1 & 3.2)
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Hệ thống tự động tách biệt thu nhập của Creator và doanh thu thực của Admin theo đúng nguồn giao dịch và chủ sở hữu.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Source 1: Admin-owned Templates in Template Section */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Nguồn 1: Template Admin</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                100% Admin
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              {formatCurrency(activeBreakdown?.adminTemplateSection?.adminRevenue)}
            </p>
            <p className="text-[11px] text-zinc-400">
              Template do Admin bán tại Khu vực Template. Template miễn phí không tính doanh thu.
            </p>
          </div>

          {/* Source 2: Creator-owned Templates in Template Section */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Nguồn 2: Template Creator</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                70% / 30%
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              {formatCurrency(activeBreakdown?.creatorTemplateSection?.gross)}
            </p>
            <div className="text-[11px] space-y-0.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Creator nhận (70%):</span>
                <span className="text-indigo-400 font-mono font-medium">
                  {formatCurrency(activeBreakdown?.creatorTemplateSection?.creatorEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Admin nhận (30%):</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {formatCurrency(activeBreakdown?.creatorTemplateSection?.adminRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Source 3: Admin Marketplace */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Nguồn 3: Sàn Admin</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                100% Admin
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              {formatCurrency(activeBreakdown?.adminMarketplace?.adminRevenue)}
            </p>
            <p className="text-[11px] text-zinc-400">
              Doanh thu sản phẩm/template thuộc Admin Marketplace. Không áp dụng hoa hồng Creator.
            </p>
          </div>

          {/* Source 4: Subscription Revenue */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Nguồn 4: Gói Hội Viên</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                100% Admin
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              {formatCurrency(activeBreakdown?.subscriptions?.adminRevenue)}
            </p>
            <div className="text-[11px] space-y-0.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Gói Pro (99k):</span>
                <span className="text-white font-mono font-medium">
                  {formatCurrency(activeBreakdown?.subscriptions?.plans?.pro)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gói Studio (199k):</span>
                <span className="text-white font-mono font-medium">
                  {formatCurrency(activeBreakdown?.subscriptions?.plans?.studio)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 uppercase font-mono">Trạng Thái</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán (PAID)</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          {/* Order Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 uppercase font-mono">Loại Giao Dịch</label>
            <select
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả loại</option>
              <option value="SUBSCRIPTION">Gói Hội Viên (Subscription)</option>
              <option value="TEMPLATE_PURCHASE">Mua Template</option>
            </select>
          </div>

          {/* Seller Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 uppercase font-mono">Người Bán</label>
            <select
              value={sellerTypeFilter}
              onChange={(e) => {
                setSellerTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả người bán</option>
              <option value="ADMIN">Admin sở hữu (100%)</option>
              <option value="CREATOR">Creator sở hữu (70/30)</option>
            </select>
          </div>

          {/* Transaction Source Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 uppercase font-mono">Nguồn Giao Dịch</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả nguồn sàn</option>
              <option value="TEMPLATE_SECTION">Khu vực Template</option>
              <option value="ADMIN_MARKETPLACE">Admin Marketplace</option>
              <option value="SUBSCRIPTION">Cổng Subscription</option>
            </select>
          </div>

          {/* Search by Order Code or User ID */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 uppercase font-mono">Tìm Kiếm</label>
            <div className="relative">
              <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Mã đơn / ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-zinc-900/50 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-white/10 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Mã Đơn</th>
                <th className="py-3.5 px-4">Khách Hàng</th>
                <th className="py-3.5 px-4">Giao Dịch</th>
                <th className="py-3.5 px-4">Nguồn Sàn</th>
                <th className="py-3.5 px-4">Người Bán</th>
                <th className="py-3.5 px-4">Mục Mua</th>
                <th className="py-3.5 px-4">Số Tiền (Gross)</th>
                <th className="py-3.5 px-4">Phân Bổ Doanh Thu</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4">Ngày Tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    <span className="material-symbols-rounded text-4xl text-zinc-600 block mb-2">
                      receipt_long
                    </span>
                    <p className="font-medium text-zinc-300">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Các giao dịch qua PayOS hoặc mua template sẽ tự động hiển thị tại đây.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isCreatorSplit =
                    order.orderType === "TEMPLATE_PURCHASE" &&
                    order.sellerType === "CREATOR" &&
                    order.transactionSource === "TEMPLATE_SECTION";

                  return (
                    <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Order Code */}
                      <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                        #{order.orderCode}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {order.userPicture ? (
                            <img
                              src={order.userPicture}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-medium flex items-center justify-center text-[10px] border border-white/10">
                              {order.userName ? order.userName[0].toUpperCase() : "U"}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">{order.userName}</div>
                            <div className="text-[11px] text-zinc-400">{order.userEmail || order.userId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.orderType === "TEMPLATE_PURCHASE" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Mua Template
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            Gói Hội Viên
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-[11px] whitespace-nowrap">
                        {order.transactionSource === "ADMIN_MARKETPLACE" ? (
                          <span className="text-emerald-400">Admin Marketplace</span>
                        ) : order.transactionSource === "TEMPLATE_SECTION" ? (
                          <span className="text-zinc-300">Template Section</span>
                        ) : (
                          <span className="text-zinc-400">Subscription Portal</span>
                        )}
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-200">
                            {order.sellerName || (order.sellerType === "ADMIN" ? "PickMe3D Admin" : "Creator")}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${order.sellerType === "ADMIN"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              }`}
                          >
                            {order.sellerType || "ADMIN"}
                          </span>
                        </div>
                      </td>

                      {/* Item Purchased */}
                      <td className="py-3 px-4 font-medium text-white max-w-[160px] truncate">
                        {order.templateTitle ? (
                          <span title={order.templateTitle}>{order.templateTitle}</span>
                        ) : order.planId === "studio" ? (
                          <span className="text-zinc-200 font-mono">STUDIO ({order.months || 1}T)</span>
                        ) : (
                          <span className="text-zinc-300 font-mono">PRO ({order.months || 1}T)</span>
                        )}
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {formatCurrency(order.grossAmount || order.amount)}
                      </td>

                      {/* Financial Split */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCreatorSplit ? (
                          <div className="text-[11px] space-y-0.5">
                            <div className="text-emerald-400 font-medium">
                              Admin (30%): {formatCurrency(order.adminRevenue)}
                            </div>
                            <div className="text-indigo-400 font-medium">
                              Creator (70%): {formatCurrency(order.creatorEarnings)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-400 font-medium">
                            Admin (100%): {formatCurrency(order.adminRevenue || order.amount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.status === "PAID" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Đã thanh toán
                          </span>
                        )}
                        {order.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Chờ thanh toán
                          </span>
                        )}
                        {order.status === "CANCELLED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 text-zinc-500 border border-white/10 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            Đã hủy
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-zinc-400 text-[11px] whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
            <div>
              Trang {pagination.page} / {pagination.pages} (Tổng {pagination.total} giao dịch)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
