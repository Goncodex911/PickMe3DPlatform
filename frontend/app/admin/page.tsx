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
      <div className="p-8 text-center bg-[#151926] border border-red-500/20 rounded-3xl">
        <span className="material-symbols-rounded text-4xl text-red-400 mb-2">error</span>
        <h3 className="text-lg font-bold text-white mb-2">Lỗi Tải Dữ Liệu Quản Trị</h3>
        <p className="text-neutral-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bảng Điều Khiển Tổng Quan
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Theo dõi thời gian thực các chỉ số tài khoản, tài nguyên 3D, sự cố và nhật ký kiểm toán.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-rounded text-xl">refresh</span>
          </button>

          <button
            onClick={handleExportLogs}
            disabled={downloadingLogs}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-lg">download</span>
            {downloadingLogs ? "Đang tải..." : "Xuất Nhật Ký CSV"}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 hover:border-neutral-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Người Dùng
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl">group</span>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">{stats.users.total}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {stats.users.active} hoạt động
            </span>
            {stats.users.banned > 0 && (
              <span className="inline-flex items-center gap-1 text-red-400 font-medium ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {stats.users.banned} bị khóa
              </span>
            )}
          </div>
        </div>

        {/* Templates & 3D Assets */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 hover:border-neutral-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Mẫu & Tài Sản 3D
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl">view_in_ar</span>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">{stats.templates.total}</div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="text-indigo-400 font-medium">
              {stats.templates.system} mẫu hệ thống
            </span>
            <span>•</span>
            <span>{stats.templates.user} cộng đồng</span>
          </div>
        </div>

        {/* Incident Reports */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 hover:border-neutral-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Sự Cố & Báo Cáo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl">flag</span>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">{stats.reports.total}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-400 font-medium">
              {stats.reports.pending} đang chờ duyệt
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">
              {stats.reports.resolved} đã giải quyết
            </span>
          </div>
        </div>

        {/* Community Engagement */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-neutral-800/80 hover:border-neutral-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Tương Tác Cộng Đồng
            </span>
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl">forum</span>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">
            {stats.community.comments + stats.community.collections}
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span>{stats.community.comments} bình luận</span>
            <span>•</span>
            <span>{stats.community.collections} bộ sưu tập</span>
          </div>
        </div>
      </div>

      {/* Revenue & Platform Monetization Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#141824] to-indigo-950/30 border border-emerald-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-2xl">monetization_on</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Doanh Thu PayOS:</span>
              <span className="text-base font-extrabold text-emerald-400">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(stats.billing?.totalRevenue || 0)}
              </span>
              <span className="text-xs text-neutral-400">({stats.billing?.paidOrders || 0} đơn thành công)</span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
              <span>Thuê bao:</span>
              <span className="text-indigo-400 font-semibold">{stats.plans?.pro || 0} Pro</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{stats.plans?.studio || 0} Studio</span>
              <span>•</span>
              <span className="text-purple-400 font-semibold">{stats.presentations?.total || 0} bản trình chiếu Slide</span>
            </div>
          </div>
        </div>

        <Link
          href="/admin/billing"
          className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
        >
          <span>Xem Chi Tiết Đơn Hàng</span>
          <span className="material-symbols-rounded text-sm">arrow_forward</span>
        </Link>
      </div>

      {/* Middle Grid: Quick Links & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Management Shortcuts */}
          <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded text-indigo-400">bolt</span>
              Lối Tắt Quản Trị Hệ Thống
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/admin/users"
                className="p-4 rounded-2xl bg-[#1a1f30] hover:bg-[#20273d] border border-neutral-700/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded">person_add</span>
                </div>
                <div className="font-semibold text-sm text-white mb-1">Quản lý Tài khoản</div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Phân quyền, khóa/mở khóa tài khoản, import hàng loạt.
                </p>
              </Link>

              <Link
                href="/admin/templates"
                className="p-4 rounded-2xl bg-[#1a1f30] hover:bg-[#20273d] border border-neutral-700/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded">add_box</span>
                </div>
                <div className="font-semibold text-sm text-white mb-1">Tạo Mẫu Hệ Thống</div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Đăng tải tài sản 3D chính thức, kiểm duyệt mẫu cộng đồng.
                </p>
              </Link>

              <Link
                href="/admin/reports"
                className="p-4 rounded-2xl bg-[#1a1f30] hover:bg-[#20273d] border border-neutral-700/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded">gavel</span>
                </div>
                <div className="font-semibold text-sm text-white mb-1">Xử Lý Báo Cáo</div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Xem phản ánh nội dung, cập nhật trạng thái giải quyết vi phạm.
                </p>
              </Link>

              <Link
                href="/admin/billing"
                className="p-4 rounded-2xl bg-[#1a1f30] hover:bg-[#20273d] border border-neutral-700/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded">payments</span>
                </div>
                <div className="font-semibold text-sm text-white mb-1">Doanh Thu & Đơn Hàng</div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Theo dõi đơn PayOS, đối soát doanh thu, nâng cấp gói dịch vụ.
                </p>
              </Link>
            </div>
          </div>

          {/* Template Categories Distribution */}
          <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80">
            <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-purple-400">pie_chart</span>
                Phân Loại Mẫu Thiết Kế 3D
              </span>
              <span className="text-xs text-neutral-500 font-normal">
                {stats.templates.total} mẫu tổng cộng
              </span>
            </h2>

            {stats.categories.length === 0 ? (
              <p className="text-neutral-500 text-sm py-4 text-center">Chưa có danh mục mẫu thiết kế nào trong cơ sở dữ liệu.</p>
            ) : (
              <div className="space-y-3">
                {stats.categories.map((cat) => {
                  const percent = Math.round((cat.count / (stats.templates.total || 1)) * 100);
                  return (
                    <div key={cat._id || "uncategorized"} className="space-y-1">
                      <div className="flex justify-between text-xs text-neutral-300">
                        <span className="font-medium">{cat._id || "Chưa phân loại"}</span>
                        <span className="text-neutral-400">
                          {cat.count} mẫu ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
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
        <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">history</span>
                Nhật Ký Kiểm Toán Gần Đây
              </h2>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Xem tất cả
              </Link>
            </div>

            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-neutral-500 text-sm py-8 text-center">
                Chưa có thao tác quản trị nào được ghi lại.
              </p>
            ) : (
              <div className="space-y-3.5">
                {stats.recentAuditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-[#191e2e] border border-neutral-800 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200">{log.action}</span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-neutral-400 truncate">
                      {log.targetLabel || log.targetType}
                    </p>
                    <span className="text-[10px] text-indigo-400/90 font-medium">
                      Bởi: {log.actorName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center">
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              Mở trang nhật ký chi tiết →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
