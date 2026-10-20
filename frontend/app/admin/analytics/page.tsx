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
        <div className="h-10 w-64 bg-neutral-800/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-neutral-800/40 rounded-3xl animate-pulse" />
          <div className="h-72 bg-neutral-800/40 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#151926] border border-red-500/20 rounded-3xl">
        <span className="material-symbols-rounded text-4xl text-red-400 mb-2">error</span>
        <h3 className="text-lg font-bold text-white mb-2">Lỗi Tải Dữ Liệu Báo Cáo</h3>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Báo Cáo & Phân Tích Nền Tảng
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Tổng hợp xu hướng hoạt động 14 ngày qua và xuất dữ liệu báo cáo chính xác từ cơ sở dữ liệu thực.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDownload("reports")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-lg">summarize</span>
            {downloading === "reports" ? "Đang xuất..." : "Xuất Báo Cáo Sự Cố"}
          </button>

          <button
            onClick={() => handleDownload("audit")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-lg">download</span>
            {downloading === "audit" ? "Đang xuất..." : "Xuất Kiểm Toán CSV"}
          </button>
        </div>
      </div>

      {/* Real Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Trend */}
        <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-blue-400">trending_up</span>
              Xu Hướng Đăng Ký Tài Khoản (14 Ngày)
            </h2>
            <span className="text-xs text-neutral-500">
              {data.trends.userRegistrations.reduce((a, b) => a + b.count, 0)} người dùng mới
            </span>
          </div>

          {data.trends.userRegistrations.length === 0 ? (
            <p className="text-neutral-500 text-sm py-12 text-center">
              Chưa có tài khoản mới được ghi nhận trong 14 ngày qua.
            </p>
          ) : (
            <div className="space-y-2.5 pt-2">
              {data.trends.userRegistrations.map((item) => {
                const max = Math.max(...data.trends.userRegistrations.map((t) => t.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item._id} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300">
                      <span className="font-mono">{item._id}</span>
                      <span className="font-semibold text-white">{item.count} tài khoản</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
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
        <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-purple-400">auto_awesome_mosaic</span>
              Mẫu Thiết Kế 3D Mới Xuất Bản (14 Ngày)
            </h2>
            <span className="text-xs text-neutral-500">
              {data.trends.templatesCreated.reduce((a, b) => a + b.count, 0)} mẫu mới
            </span>
          </div>

          {data.trends.templatesCreated.length === 0 ? (
            <p className="text-neutral-500 text-sm py-12 text-center">
              Chưa có mẫu thiết kế mới nào được tạo trong 14 ngày qua.
            </p>
          ) : (
            <div className="space-y-2.5 pt-2">
              {data.trends.templatesCreated.map((item) => {
                const max = Math.max(...data.trends.templatesCreated.map((t) => t.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item._id} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300">
                      <span className="font-mono">{item._id}</span>
                      <span className="font-semibold text-white">{item.count} mẫu</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
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
      </div>

      {/* PayOS Monetization Audit Strip */}
      <div className="p-6 rounded-3xl bg-[#141824] border border-neutral-800/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <span className="material-symbols-rounded text-2xl">payments</span>
            </div>
            <div className="space-y-1 text-xs text-neutral-400">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Doanh Thu & Giao Dịch Cổng PayOS</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Quản Lý Doanh Thu & Đơn Hàng</span>
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
}
