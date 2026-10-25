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
      <div className="space-y-6">
        <div className="h-10 w-64 bg-neutral-800/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-800/40 border border-neutral-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-neutral-800/40 border border-neutral-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-neutral-800/40 border border-neutral-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-[#0d131f] border border-red-500/30 rounded-3xl">
        <span className="material-symbols-rounded text-4xl text-red-400 mb-2">error</span>
        <h3 className="text-lg font-bold text-white mb-2">Lỗi Tải Dữ Liệu Quản Trị</h3>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(229,43,43,0.4)] transition-all cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 border border-white/10 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-[10px] tracking-widest text-slate-300 font-mono uppercase">
              PickMe3D Realtime Analytics
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-normal text-white tracking-wide"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            Bảng Điều Khiển Tổng Quan
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Theo dõi thời gian thực các chỉ số tài khoản, tài nguyên 3D, sự cố và nhật ký kiểm toán.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-rounded text-xl">refresh</span>
          </button>

          <button
            onClick={handleExportLogs}
            disabled={downloadingLogs}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-white text-xs font-bold tracking-wider shadow-[0_0_20px_rgba(229,43,43,0.35)] transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-rounded text-base">download</span>
            <span>{downloadingLogs ? "Đang tải..." : "Xuất Nhật Ký CSV"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0d131f] border border-white/[0.08] hover:border-red-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Người Dùng
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-lg">group</span>
            </div>
          </div>
          <div
            className="text-3xl sm:text-4xl font-normal text-white mb-2"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            {stats.users.total}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {stats.users.active} hoạt động
            </span>
            {stats.users.banned > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-400 font-medium ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {stats.users.banned} bị khóa
              </span>
            )}
          </div>
        </div>

        {/* Templates & 3D Assets */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0d131f] border border-white/[0.08] hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Mẫu & Tài Sản 3D
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-lg">view_in_ar</span>
            </div>
          </div>
          <div
            className="text-3xl sm:text-4xl font-normal text-white mb-2"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            {stats.templates.total}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-amber-400 font-medium">
              {stats.templates.system} hệ thống
            </span>
            <span>•</span>
            <span>{stats.templates.user} cộng đồng</span>
          </div>
        </div>

        {/* Incident Reports */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0d131f] border border-white/[0.08] hover:border-rose-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-rose-500/10 blur-xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Sự Cố & Báo Cáo
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-lg">flag</span>
            </div>
          </div>
          <div
            className="text-3xl sm:text-4xl font-normal text-white mb-2"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            {stats.reports.total}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-rose-400 font-medium">
              {stats.reports.pending} đang chờ duyệt
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">
              {stats.reports.resolved} đã xong
            </span>
          </div>
        </div>

        {/* Community Engagement */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0d131f] border border-white/[0.08] hover:border-red-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Tương Tác Cộng Đồng
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-lg">forum</span>
            </div>
          </div>
          <div
            className="text-3xl sm:text-4xl font-normal text-white mb-2"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            {stats.community.comments + stats.community.collections}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{stats.community.comments} bình luận</span>
            <span>•</span>
            <span>{stats.community.collections} bộ sưu tập</span>
          </div>
        </div>
      </div>

      {/* Revenue & Platform Monetization Strip */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950/30 via-[#0d131f] to-amber-950/20 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 p-[1.5px] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(229,43,43,0.35)]">
            <div className="w-full h-full bg-[#0d131f] rounded-[14px] flex items-center justify-center">
              <span className="material-symbols-rounded text-xl text-amber-400">monetization_on</span>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Doanh Thu PayOS:</span>
              <span
                className="text-xl sm:text-2xl font-normal text-amber-400"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
              >
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(stats.billing?.totalRevenue || 0)}
              </span>
              <span className="text-xs text-slate-400">({stats.billing?.paidOrders || 0} đơn thành công)</span>
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
              <span>Thuê bao:</span>
              <span className="text-amber-400 font-semibold">{stats.plans?.pro || 0} Pro</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{stats.plans?.studio || 0} Studio</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{stats.presentations?.total || 0} bài trình chiếu</span>
            </div>
          </div>
        </div>

        <Link
          href="/admin/billing"
          className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-500/40 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 shadow-sm"
        >
          <span>Xem Chi Tiết Đơn Hàng</span>
          <span className="material-symbols-rounded text-sm text-amber-400">arrow_forward</span>
        </Link>
      </div>

      {/* Middle Grid: Quick Links & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Management Shortcuts */}
          <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/[0.08] shadow-lg">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded text-red-400">bolt</span>
              Lối Tắt Quản Trị Hệ Thống
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/admin/users"
                className="p-4 rounded-2xl bg-[#060911] hover:bg-white/[0.04] border border-white/10 hover:border-red-500/40 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg">person_add</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-white mb-1">Quản lý Tài khoản</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Phân quyền, khóa/mở khóa tài khoản, import người dùng.
                </p>
              </Link>

              <Link
                href="/admin/templates"
                className="p-4 rounded-2xl bg-[#060911] hover:bg-white/[0.04] border border-white/10 hover:border-amber-500/40 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg">add_box</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-white mb-1">Tạo Mẫu Hệ Thống</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Đăng tải tài sản 3D chính thức, kiểm duyệt mẫu cộng đồng.
                </p>
              </Link>

              <Link
                href="/admin/reports"
                className="p-4 rounded-2xl bg-[#060911] hover:bg-white/[0.04] border border-white/10 hover:border-rose-500/40 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg">gavel</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-white mb-1">Xử Lý Báo Cáo</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Xem phản ánh nội dung, cập nhật trạng thái vi phạm.
                </p>
              </Link>

              <Link
                href="/admin/billing"
                className="p-4 rounded-2xl bg-[#060911] hover:bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg">payments</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-white mb-1">Doanh Thu & Đơn Hàng</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Theo dõi đơn PayOS, đối soát doanh thu, nâng cấp gói.
                </p>
              </Link>
            </div>
          </div>

          {/* Template Categories Distribution */}
          <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/[0.08] shadow-lg">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-amber-400">pie_chart</span>
                Phân Loại Mẫu Thiết Kế 3D
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {stats.templates.total} mẫu tổng cộng
              </span>
            </h2>

            {stats.categories.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Chưa có danh mục mẫu thiết kế nào trong cơ sở dữ liệu.</p>
            ) : (
              <div className="space-y-3.5">
                {stats.categories.map((cat) => {
                  const percent = Math.round((cat.count / (stats.templates.total || 1)) * 100);
                  return (
                    <div key={cat._id || "uncategorized"} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-medium">{cat._id || "Chưa phân loại"}</span>
                        <span className="text-slate-400 font-mono">
                          {cat.count} mẫu ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#060911] rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full"
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
        <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/[0.08] flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-red-400">history</span>
                Nhật Ký Kiểm Toán Gần Đây
              </h2>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Xem tất cả
              </Link>
            </div>

            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">
                Chưa có thao tác quản trị nào được ghi lại.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentAuditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-2xl bg-[#060911] border border-white/10 text-xs flex flex-col gap-1 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-red-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 truncate text-[11px]">
                      {log.targetLabel || log.targetType}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Bởi: <b className="text-slate-400 font-medium">{log.actorName}</b>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>Mở trang nhật ký chi tiết</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
