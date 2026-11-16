"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminAnalyticsApi,
  downloadReportsCsv,
  downloadAuditLogsCsv,
  AnalyticsData,
} from "@/lib/adminService";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminAnalyticsApi();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.message || "Không thể tải số liệu phân tích hệ thống");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownload = async (type: "reports" | "audit") => {
    try {
      setDownloading(type);
      if (type === "reports") await downloadReportsCsv();
      else await downloadAuditLogsCsv();
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  // Metrics totals for the 14-day window
  const totalUsers14d = data?.trends.userRegistrations.reduce((a, b) => a + b.count, 0) || 0;
  const totalTemplates14d = data?.trends.templatesCreated.reduce((a, b) => a + b.count, 0) || 0;
  const totalReports14d = data?.trends.reportsSubmitted.reduce((a, b) => a + b.count, 0) || 0;
  const recentRevenueTrends = data?.monetization.recentRevenueTrends || [];
  const totalRevenue14d = recentRevenueTrends.reduce((a, b) => a + (b.revenue || 0), 0);
  const totalOrders14d = recentRevenueTrends.reduce((a, b) => a + (b.count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              PickMe3D Platform
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Atlas Realtime
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Báo Cáo & Phân Tích Hệ Thống
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Theo dõi dữ liệu thực tế về tăng trưởng người dùng, mẫu thiết kế 3D, sự cố khiếu nại và doanh thu từ cơ sở dữ liệu MongoDB Atlas.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-rounded text-base">refresh</span>
          </button>

          <button
            onClick={() => handleDownload("reports")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-rounded text-base text-zinc-400">summarize</span>
            {downloading === "reports" ? "Đang xuất..." : "Xuất Báo Cáo Sự Cố"}
          </button>

          <button
            onClick={() => handleDownload("audit")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-rounded text-base text-black">download</span>
            {downloading === "audit" ? "Đang xuất..." : "Xuất Kiểm Toán CSV"}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* New Users */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400">
              Người Dùng Mới (14 Ngày)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">person_add</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {loading ? "..." : totalUsers14d.toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Đăng ký mới trong 14 ngày qua</p>
        </div>

        {/* Templates Created */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400">
              Mẫu 3D Mới (14 Ngày)
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">view_in_ar</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {loading ? "..." : totalTemplates14d.toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Mẫu thiết kế xuất bản mới</p>
        </div>

        {/* Reports Submitted */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              Sự Cố & Khiếu Nại (14 Ngày)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">report_problem</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {loading ? "..." : totalReports14d.toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Báo cáo vi phạm từ người dùng</p>
        </div>

        {/* 14d Revenue */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              Doanh Thu Đơn Hàng (14 Ngày)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">payments</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {loading ? "..." : formatCurrency(totalRevenue14d)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{totalOrders14d} đơn hàng thanh toán thành công</p>
        </div>
      </div>

      {/* Main Trends Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
          <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
          <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
          <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
        </div>
      ) : error || !data ? (
        <div className="p-8 text-center bg-zinc-900/40 border border-white/10 rounded-2xl">
          <span className="material-symbols-rounded text-4xl text-rose-400 mb-2">error</span>
          <h3 className="text-lg font-semibold text-white mb-2">Lỗi Tải Dữ Liệu Báo Cáo</h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Registrations Trend */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-blue-400 text-lg">trending_up</span>
                  Xu Hướng Đăng Ký Tài Khoản (14 Ngày)
                </h3>
                <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {totalUsers14d} tài khoản
                </span>
              </div>

              {data.trends.userRegistrations.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">
                  Chưa có tài khoản mới được ghi nhận trong 14 ngày qua.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {data.trends.userRegistrations.map((item) => {
                    const max = Math.max(...data.trends.userRegistrations.map((t) => t.count), 1);
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item._id} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-300">
                          <span className="font-mono text-zinc-400">{item._id}</span>
                          <span className="font-medium text-white">{item.count} tài khoản</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 border border-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Templates Creation Trend */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-purple-400 text-lg">auto_awesome_mosaic</span>
                  Mẫu Thiết Kế 3D Mới Xuất Bản (14 Ngày)
                </h3>
                <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {totalTemplates14d} mẫu mới
                </span>
              </div>

              {data.trends.templatesCreated.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">
                  Chưa có mẫu thiết kế mới nào được tạo trong 14 ngày qua.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {data.trends.templatesCreated.map((item) => {
                    const max = Math.max(...data.trends.templatesCreated.map((t) => t.count), 1);
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item._id} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-300">
                          <span className="font-mono text-zinc-400">{item._id}</span>
                          <span className="font-medium text-white">{item.count} mẫu</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 border border-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reports Submitted Trend */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-amber-400 text-lg">flag</span>
                  Sự Cố & Khiếu Nại Tiếp Nhận (14 Ngày)
                </h3>
                <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {totalReports14d} báo cáo
                </span>
              </div>

              {data.trends.reportsSubmitted.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">
                  Không có sự cố hoặc khiếu nại mới trong 14 ngày qua.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {data.trends.reportsSubmitted.map((item) => {
                    const max = Math.max(...data.trends.reportsSubmitted.map((t) => t.count), 1);
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item._id} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-300">
                          <span className="font-mono text-zinc-400">{item._id}</span>
                          <span className="font-medium text-white">{item.count} báo cáo</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 border border-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Revenue Trend */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-emerald-400 text-lg">attach_money</span>
                  Xu Hướng Doanh Thu Đơn Hàng (14 Ngày)
                </h3>
                <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                  {formatCurrency(totalRevenue14d)}
                </span>
              </div>

              {recentRevenueTrends.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">
                  Chưa có đơn hàng thanh toán thành công trong 14 ngày qua.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {recentRevenueTrends.map((item) => {
                    const max = Math.max(...recentRevenueTrends.map((t) => t.revenue), 1);
                    const pct = Math.round(((item.revenue || 0) / max) * 100);
                    return (
                      <div key={item._id} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-300">
                          <span className="font-mono text-zinc-400">{item._id}</span>
                          <span className="font-medium text-emerald-400 font-mono">
                            {formatCurrency(item.revenue)} ({item.count} đơn)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 border border-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Revenue & Billing Deep Link Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10">
                  <span className="material-symbols-rounded text-xl text-emerald-400">payments</span>
                </div>
                <div className="space-y-1 text-xs text-zinc-400">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Quản Lý Doanh Thu & Giao Dịch Gói Cước</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Tích hợp CSDL
                    </span>
                  </h4>
                  <p className="leading-relaxed">
                    Tổng doanh thu tích lũy toàn hệ thống:{" "}
                    <strong className="text-emerald-400 font-mono">
                      {formatCurrency(data.monetization.totalRevenue)}
                    </strong>{" "}
                    với{" "}
                    <strong className="text-white font-mono">
                      {data.monetization.paidOrdersCount || 0}
                    </strong>{" "}
                    đơn hàng đã hoàn tất.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/billing"
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Xem Chi Tiết Doanh Thu</span>
                <span className="material-symbols-rounded text-sm text-zinc-400">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
