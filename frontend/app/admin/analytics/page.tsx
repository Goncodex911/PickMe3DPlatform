"use client";

import React, { useEffect, useState } from "react";
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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminAnalyticsApi();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.message || "Không thể tải số liệu phân tích");
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-[#0d131f] border border-white/10 rounded-3xl animate-pulse" />
          <div className="h-72 bg-[#0d131f] border border-white/10 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#0d131f] border border-rose-500/20 rounded-3xl shadow-xl shadow-black/40">
        <span className="material-symbols-rounded text-4xl text-rose-400 mb-2">error</span>
        <h3 className="text-lg font-bold text-white mb-2">Lỗi Tải Dữ Liệu Báo Cáo</h3>
        <p className="text-neutral-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:via-rose-400 hover:to-amber-400 text-white font-medium text-xs sm:text-sm transition-all shadow-lg shadow-red-950/40"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
            Báo Cáo & Phân Tích Nền Tảng
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Tổng hợp xu hướng hoạt động 14 ngày qua và xuất dữ liệu báo cáo chính xác từ cơ sở dữ liệu thực.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDownload("reports")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-black/40 disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-lg text-rose-400">summarize</span>
            {downloading === "reports" ? "Đang xuất..." : "Xuất Báo Cáo Sự Cố"}
          </button>

          <button
            onClick={() => handleDownload("audit")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-black/40 disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-lg text-amber-400">download</span>
            {downloading === "audit" ? "Đang xuất..." : "Xuất Kiểm Toán CSV"}
          </button>
        </div>
      </div>

      {/* Real Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Trend */}
        <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/10 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-rose-400">trending_up</span>
              Xu Hướng Đăng Ký Tài Khoản (14 Ngày)
            </h2>
            <span className="text-xs text-rose-400/80 font-medium bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
              {data.trends.userRegistrations.reduce((a, b) => a + b.count, 0)} người dùng mới
            </span>
          </div>

          {data.trends.userRegistrations.length === 0 ? (
            <p className="text-neutral-500 text-sm py-12 text-center">
              Chưa có tài khoản mới được ghi nhận trong 14 ngày qua.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {data.trends.userRegistrations.map((item) => {
                const max = Math.max(...data.trends.userRegistrations.map((t) => t.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item._id} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300">
                      <span className="font-mono text-neutral-400">{item._id}</span>
                      <span className="font-semibold text-white">{item.count} tài khoản</span>
                    </div>
                    <div className="h-2 w-full bg-[#060911] border border-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-500"
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
        <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/10 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-400">auto_awesome_mosaic</span>
              Mẫu Thiết Kế 3D Mới Xuất Bản (14 Ngày)
            </h2>
            <span className="text-xs text-amber-400/80 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {data.trends.templatesCreated.reduce((a, b) => a + b.count, 0)} mẫu mới
            </span>
          </div>

          {data.trends.templatesCreated.length === 0 ? (
            <p className="text-neutral-500 text-sm py-12 text-center">
              Chưa có mẫu thiết kế mới nào được tạo trong 14 ngày qua.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {data.trends.templatesCreated.map((item) => {
                const max = Math.max(...data.trends.templatesCreated.map((t) => t.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item._id} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300">
                      <span className="font-mono text-neutral-400">{item._id}</span>
                      <span className="font-semibold text-white">{item.count} mẫu</span>
                    </div>
                    <div className="h-2 w-full bg-[#060911] border border-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 rounded-full transition-all duration-500"
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

      {/* PayOS Monetization Audit Strip */}
      <div className="p-6 rounded-3xl bg-[#0d131f] border border-white/10 shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <span className="material-symbols-rounded text-2xl">payments</span>
            </div>
            <div className="space-y-1 text-xs text-neutral-400">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Doanh Thu & Giao Dịch Cổng PayOS</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Đang hoạt động
                </span>
              </h3>
              <p className="leading-relaxed">
                Hệ thống gói cước (Pro / Studio) và đơn hàng thanh toán tự động qua cổng PayOS đã được tích hợp trực tiếp vào cơ sở dữ liệu MongoDB Atlas.
              </p>
            </div>
          </div>

          <a
            href="/admin/billing"
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-black/40"
          >
            <span>Quản Lý Doanh Thu & Đơn Hàng</span>
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
}
