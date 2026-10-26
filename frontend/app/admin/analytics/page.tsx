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
      <div className="p-8 text-center bg-zinc-900/40 border border-white/10 rounded-2xl">
        <span className="material-symbols-rounded text-4xl text-zinc-400 mb-2">error</span>
        <h3 className="text-lg font-semibold text-white mb-2">Lỗi Tải Dữ Liệu Báo Cáo</h3>
        <p className="text-zinc-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs sm:text-sm font-medium transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
            Platform Analytics & Insights
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Báo Cáo & Phân Tích Nền Tảng
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Tổng hợp xu hướng hoạt động 14 ngày qua và xuất dữ liệu báo cáo chính xác từ cơ sở dữ liệu thực.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDownload("reports")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all disabled:opacity-50"
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

      {/* Real Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Trend */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-zinc-400 text-lg">trending_up</span>
              Xu Hướng Đăng Ký Tài Khoản (14 Ngày)
            </h2>
            <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
              {data.trends.userRegistrations.reduce((a, b) => a + b.count, 0)} người dùng mới
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
                        className="h-full bg-white rounded-full transition-all duration-500"
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
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-zinc-400 text-lg">auto_awesome_mosaic</span>
              Mẫu Thiết Kế 3D Mới Xuất Bản (14 Ngày)
            </h2>
            <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
              {data.trends.templatesCreated.reduce((a, b) => a + b.count, 0)} mẫu mới
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
                        className="h-full bg-white rounded-full transition-all duration-500"
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
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10">
              <span className="material-symbols-rounded text-xl">payments</span>
            </div>
            <div className="space-y-1 text-xs text-zinc-400">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Doanh Thu & Giao Dịch Cổng PayOS</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-white/10">
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
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Quản Lý Doanh Thu & Đơn Hàng</span>
            <span className="material-symbols-rounded text-sm text-zinc-400">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
}
