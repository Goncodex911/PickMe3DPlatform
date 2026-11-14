"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminStatsApi, AdminDashboardStats, downloadAuditLogsCsv } from "@/lib/adminService";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingLogs, setDownloadingLogs] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminStatsApi();
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setError(res.message || "Không thể tải số liệu thống kê quản trị");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportLogs = async () => {
    try {
      setDownloadingLogs(true);
      await downloadAuditLogsCsv();
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setDownloadingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-zinc-900 rounded-md animate-pulse" />
          <div className="h-10 w-80 bg-zinc-900 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900/50 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-24 bg-zinc-900/50 border border-white/10 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-zinc-900/50 border border-white/10 rounded-2xl animate-pulse" />
            <div className="h-48 bg-zinc-900/50 border border-white/10 rounded-2xl animate-pulse" />
          </div>
          <div className="h-96 bg-zinc-900/50 border border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-zinc-900/50 border border-white/10 rounded-2xl max-w-lg mx-auto my-12">
        <span className="material-symbols-rounded text-3xl text-zinc-400 mb-2">error</span>
        <h3 className="text-base font-semibold text-white mb-1">Lỗi Tải Dữ Liệu Quản Trị</h3>
        <p className="text-zinc-400 text-xs mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
        >
            Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
            PickMe3D Realtime Analytics
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight">
            Platform Dashboard
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            Monitor account metrics, 3D assets, reports, and audit logs in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refresh data"
          >
            <span className="material-symbols-rounded text-xl">refresh</span>
          </button>

          <button
            onClick={handleExportLogs}
            disabled={downloadingLogs}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-rounded text-base text-black">download</span>
            <span>{downloadingLogs ? "Downloading..." : "Export Audit Log CSV"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">group</span>
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-2">
            {stats.users.total}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              {stats.users.active} active
            </span>
            {stats.users.banned > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  {stats.users.banned} banned
                </span>
              </>
            )}
          </div>
        </div>

        {/* Templates & 3D Assets */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Templates & 3D Assets
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">view_in_ar</span>
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-2">
            {stats.templates.total}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">
              {stats.templates.system} system
            </span>
            <span className="text-zinc-600">•</span>
            <span>{stats.templates.user} community
            </span>
          </div>
        </div>

        {/* Incident Reports */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Reports & Issues
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">flag</span>
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-2">
            {stats.reports.total}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">
              {stats.reports.pending} pending
            </span>
            <span className="text-zinc-600">•</span>
            <span>{stats.reports.resolved} resolved</span>
          </div>
        </div>

        {/* Community Engagement */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Community Activity
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">forum</span>
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-2">
            {stats.community.comments + stats.community.collections}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-zinc-300">{stats.community.comments} comments</span>
            <span className="text-zinc-600">•</span>
            <span>{stats.community.collections} collections</span>
          </div>
        </div>
      </div>

            {/* Financial & monetization overview */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-emerald-400 text-lg">paid</span>
              <h2 className="text-base font-semibold text-white tracking-tight">Platform Revenue & MRR</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Rules 2.1 & 3.2
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Transparent breakdown of administrator revenue and creator earnings across four sources.
            </p>
          </div>
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <span>Manage Orders & Reconciliation</span>
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* 3 Key Financial KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Total Admin Revenue */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-mono uppercase tracking-wider text-[10px]">Net Administrator Revenue</span>
              <span className="material-symbols-rounded text-emerald-400 text-base">account_balance_wallet</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                stats.billing?.totalRevenue || stats.billing?.totalAdminRevenue || 0
              )}
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Total GMV:</span>
              <span className="text-zinc-200 font-mono">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  stats.billing?.totalGrossVolume || stats.billing?.totalRevenue || 0
                )}
              </span>
            </div>
          </div>

          {/* 2. MRR (Monthly Recurring Revenue) */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-mono uppercase tracking-wider text-[10px]">Monthly Recurring Revenue (MRR)</span>
              <span className="material-symbols-rounded text-blue-400 text-base">repeat</span>
            </div>
            <div className="text-2xl font-bold text-blue-400 tracking-tight">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                stats.billing?.mrr ?? ((stats.plans?.pro || 0) * 99000 + (stats.plans?.studio || 0) * 199000)
              )}
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Active subscriptions:</span>
              <span className="text-zinc-200">
                {stats.plans?.pro || 0} Pro • {stats.plans?.studio || 0} Studio
              </span>
            </div>
          </div>

          {/* 3. Orders Count & Ratio */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-mono uppercase tracking-wider text-[10px]">Total PayOS Orders</span>
              <span className="material-symbols-rounded text-purple-400 text-base">receipt_long</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.billing?.totalOrders || 0} <span className="text-xs font-normal text-zinc-500">orders</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">
                {stats.billing?.paidOrders || 0} paid
              </span>
              <span className="text-zinc-500">
                {stats.billing?.pendingOrders || 0} pending
              </span>
            </div>
          </div>
        </div>

        {/* 4. Mini Revenue Trend & Sources Distribution */}
        <div className="p-4 rounded-xl bg-zinc-950/50 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-300 flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm text-zinc-400">bar_chart</span>
              Revenue Breakdown Across Four Sources (Revenue vs. Commission)
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Creator earnings: {new Intl.NumberFormat("en-US", { style: "currency", currency: "VND" }).format(stats.billing?.totalCreatorEarnings || 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stream 1 */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">1. Admin Template</span>
                <span className="text-emerald-400 font-mono font-semibold">100% Admin</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  stats.billing?.breakdown?.sources?.adminTemplateSection?.adminRevenue || 0
                )}
              </div>
            </div>

            {/* Stream 2 */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">2. Creator Template</span>
                <span className="text-blue-400 font-mono font-semibold">70/30 Split</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  stats.billing?.breakdown?.sources?.creatorTemplateSection?.adminRevenue || 0
                )}
                <span className="text-[10px] text-zinc-500 font-normal ml-1">(Admin 30%)</span>
              </div>
            </div>

            {/* Stream 3 */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">3. Admin Marketplace</span>
                <span className="text-emerald-400 font-mono font-semibold">100% Admin</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  stats.billing?.breakdown?.sources?.adminMarketplace?.adminRevenue || 0
                )}
              </div>
            </div>

            {/* Stream 4 */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">4. Subscription Plans</span>
                <span className="text-emerald-400 font-mono font-semibold">100% Admin</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  stats.billing?.breakdown?.sources?.subscriptions?.adminRevenue || 0
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Quick Links & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Management Shortcuts */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded text-zinc-400 text-lg">bolt</span>
              Admin Shortcuts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/admin/users"
                className="p-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/40 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center mb-3 group-hover:text-white transition-colors">
                  <span className="material-symbols-rounded text-base">person_add</span>
                </div>
                <div className="font-medium text-xs sm:text-sm text-white mb-1 group-hover:text-zinc-200">Manage Accounts</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Assign roles, ban or unban accounts, and import users.
                </p>
              </Link>

              <Link
                href="/admin/templates"
                className="p-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/40 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center mb-3 group-hover:text-white transition-colors">
                  <span className="material-symbols-rounded text-base">add_box</span>
                </div>
                <div className="font-medium text-xs sm:text-sm text-white mb-1 group-hover:text-zinc-200">Create System Templates</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Publish official 3D assets and review community templates.
                </p>
              </Link>

              <Link
                href="/admin/reports"
                className="p-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/40 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center mb-3 group-hover:text-white transition-colors">
                  <span className="material-symbols-rounded text-base">gavel</span>
                </div>
                <div className="font-medium text-xs sm:text-sm text-white mb-1 group-hover:text-zinc-200">Review Reports</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Review reported content and update case statuses.
                </p>
              </Link>

              <Link
                href="/admin/billing"
                className="p-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/40 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center mb-3 group-hover:text-white transition-colors">
                  <span className="material-symbols-rounded text-base">payments</span>
                </div>
                <div className="font-medium text-xs sm:text-sm text-white mb-1 group-hover:text-zinc-200">Revenue & Orders</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Track PayOS orders, reconcile revenue, and manage plan upgrades.
                </p>
              </Link>
            </div>
          </div>

          {/* Template Categories Distribution */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-zinc-400 text-lg">pie_chart</span>
                3D Template Categories
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {stats.templates.total} templates total
              </span>
            </h2>

            {stats.categories.length === 0 ? (
               <p className="text-zinc-500 text-sm py-4 text-center">No template categories found in the database.</p>
            ) : (
              <div className="space-y-3.5">
                {stats.categories.map((cat) => {
                  const percent = Math.round((cat.count / (stats.templates.total || 1)) * 100);
                  return (
                    <div key={cat._id || "uncategorized"} className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-300">
                        <span className="font-medium">{cat._id || "Uncategorized"}</span>
                        <span className="text-zinc-500 font-mono">
                          {cat.count} templates ({percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Recent Audit Log Stream */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-zinc-400 text-lg">history</span>
                Recent Audit Logs
              </h2>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
              >
                View all
              </Link>
            </div>

            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-zinc-500 text-sm py-8 text-center">
                No administrative actions have been recorded.
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.recentAuditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 text-xs flex flex-col gap-1 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium text-zinc-300">{log.action}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-zinc-400 truncate text-[11px]">
                      {log.targetLabel || log.targetType}
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      By: <b className="text-zinc-400 font-normal">{log.actorName}</b>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link
              href="/admin/audit-logs"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <span>Open detailed audit log</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
