"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminAnalyticsApi,
  downloadReportsCsv,
  downloadAuditLogsCsv,
  AnalyticsData,
} from "@/lib/adminService";
import {
  getActiveMeasurementId,
  getActiveLookerStudioUrl,
  trackEvent,
  DEFAULT_GA_MEASUREMENT_ID,
  DEFAULT_GA_PROPERTY_ID,
  DEFAULT_LOOKER_STUDIO_URL,
} from "@/lib/gtag";

export default function AdminAnalyticsPage() {
  // Navigation tabs: "all" (both) | "database" (internal DB) | "ga4" (Google Analytics)
  const [activeTab, setActiveTab] = useState<"all" | "database" | "ga4">("all");

  // Database metrics state
  const [dbData, setDbData] = useState<AnalyticsData | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // GA4 Configuration state
  const [measurementId, setMeasurementId] = useState<string>(DEFAULT_GA_MEASUREMENT_ID);
  const [propertyId, setPropertyId] = useState<string>(DEFAULT_GA_PROPERTY_ID);
  const [lookerStudioUrl, setLookerStudioUrl] = useState<string>(DEFAULT_LOOKER_STUDIO_URL);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Temp form inputs inside modal
  const [tempMeasurementId, setTempMeasurementId] = useState(DEFAULT_GA_MEASUREMENT_ID);
  const [tempPropertyId, setTempPropertyId] = useState(DEFAULT_GA_PROPERTY_ID);
  const [tempLookerUrl, setTempLookerUrl] = useState(DEFAULT_LOOKER_STUDIO_URL);

  // Toast / Status state
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState<number>(1);

  useEffect(() => {
    // Load GA4 config from localStorage / env
    const activeId = getActiveMeasurementId();
    const activeUrl = getActiveLookerStudioUrl();
    const savedPropId =
      typeof window !== "undefined"
        ? localStorage.getItem("pickme3d_ga_property_id") || ""
        : "";

    setMeasurementId(activeId);
    setPropertyId(savedPropId);
    setLookerStudioUrl(activeUrl);

    setTempMeasurementId(activeId);
    setTempPropertyId(savedPropId);
    setTempLookerUrl(activeUrl);

    // Load internal MongoDB database trends on mount
    loadDbData();
  }, []);

  const loadDbData = async () => {
    setLoadingDb(true);
    setDbError(null);
    const res = await fetchAdminAnalyticsApi();
    if (res.success && res.data) {
      setDbData(res.data);
    } else {
      setDbError(res.message || "Không thể tải số liệu phân tích nội bộ");
    }
    setLoadingDb(false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = tempMeasurementId.trim() || DEFAULT_GA_MEASUREMENT_ID;
    const cleanPropId = tempPropertyId.trim();
    const cleanUrl = tempLookerUrl.trim() || DEFAULT_LOOKER_STUDIO_URL;

    localStorage.setItem("pickme3d_ga_measurement_id", cleanId);
    localStorage.setItem("pickme3d_ga_property_id", cleanPropId);
    localStorage.setItem("pickme3d_looker_studio_url", cleanUrl);

    setMeasurementId(cleanId);
    setPropertyId(cleanPropId);
    setLookerStudioUrl(cleanUrl);
    setConfigModalOpen(false);
    setFrameKey((prev) => prev + 1);

    // Notify GoogleAnalytics component to update tracking script if needed
    window.dispatchEvent(new Event("pickme3d_ga_updated"));

    setPingSuccess("Đã lưu cấu hình Google Analytics 4 & Looker Studio thành công!");
    setTimeout(() => setPingSuccess(null), 4000);
  };

  const handleSendPing = () => {
    try {
      trackEvent.adminPingTest();
      setPingSuccess(
        `Đã bắn thành công sự kiện 'admin_ping_test' tới GA4 (${measurementId})! Bạn có thể kiểm tra ngay trong mục Thời Gian Thực (Realtime) trên Google Analytics.`
      );
      setTimeout(() => setPingSuccess(null), 6000);
    } catch (err: any) {
      alert("Lỗi khi gửi sự kiện: " + err.message);
    }
  };

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

  // Helper for generating direct GA4 Console URLs
  const getGaConsoleUrl = (path: string) => {
    if (propertyId) {
      return `https://analytics.google.com/analytics/web/#/p${propertyId}/${path}`;
    }
    return `https://analytics.google.com/analytics/web/`;
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {pingSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
          <span className="material-symbols-rounded text-emerald-400 text-xl shrink-0">
            check_circle
          </span>
          <div className="flex-1">
            <p className="font-semibold text-white">Kết Nối GA4 Đang Hoạt Động</p>
            <p className="mt-0.5 text-emerald-300/90 leading-relaxed">{pingSuccess}</p>
          </div>
          <button
            onClick={() => setPingSuccess(null)}
            className="text-emerald-400 hover:text-white"
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              PickMe3D Analytics
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GA4 Active
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight flex items-center gap-3">
            <span>Google Analytics 4 & Báo Cáo</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Theo dõi dữ liệu truy cập, phiên hoạt động, hành vi người dùng và tương tác mô hình 3D trực tiếp từ Google Analytics 4.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSendPing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm cursor-pointer"
            title="Gửi sự kiện test vào GA4 để kiểm tra Realtime"
          >
            <span className="material-symbols-rounded text-base text-emerald-400">sensors</span>
            Bắn Tín Hiệu Test GA4
          </button>

          <button
            onClick={() => setConfigModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-rounded text-base text-black">settings</span>
            Cấu Hình GA4 & Báo Cáo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1 flex-wrap">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <span className="material-symbols-rounded text-base">dashboard</span>
          Tổng Hợp (Toàn Bộ)
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === "database"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <span className="material-symbols-rounded text-base">database</span>
          Dữ Liệu Cơ Sở Dữ Liệu Thực (Atlas)
        </button>

        <button
          onClick={() => setActiveTab("ga4")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === "ga4"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <span className="material-symbols-rounded text-base">analytics</span>
          Google Analytics 4 & Looker Studio
        </button>
      </div>

      {/* SECTION 1: DATABASE METRICS (Shown in 'all' and 'database') */}
      {(activeTab === "all" || activeTab === "database") && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-base text-zinc-300">database</span>
                Dữ Liệu Cơ Sở Dữ Liệu Thực Tế (MongoDB Atlas)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Xu hướng người dùng, mẫu 3D và giao dịch thực tế được lưu trong hệ thống.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleDownload("reports")}
                disabled={downloading !== null}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-rounded text-base text-zinc-400">summarize</span>
                {downloading === "reports" ? "Đang xuất..." : "Xuất Báo Cáo Sự Cố"}
              </button>

              <button
                onClick={() => handleDownload("audit")}
                disabled={downloading !== null}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-rounded text-base text-black">download</span>
                {downloading === "audit" ? "Đang xuất..." : "Xuất Kiểm Toán CSV"}
              </button>
            </div>
          </div>

          {loadingDb ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
              <div className="h-64 bg-zinc-900/50 rounded-2xl border border-white/10" />
            </div>
          ) : dbError || !dbData ? (
            <div className="p-8 text-center bg-zinc-900/40 border border-white/10 rounded-2xl">
              <span className="material-symbols-rounded text-4xl text-zinc-400 mb-2">error</span>
              <h3 className="text-lg font-semibold text-white mb-2">Lỗi Tải Dữ Liệu Báo Cáo</h3>
              <p className="text-zinc-400 text-sm mb-4">{dbError}</p>
              <button
                onClick={loadDbData}
                className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs sm:text-sm font-medium transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Registrations Trend */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-zinc-400 text-lg">trending_up</span>
                    Xu Hướng Đăng Ký Tài Khoản (14 Ngày)
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                    {dbData.trends.userRegistrations.reduce((a, b) => a + b.count, 0)} người dùng mới
                  </span>
                </div>

                {dbData.trends.userRegistrations.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-12 text-center">
                    Chưa có tài khoản mới được ghi nhận trong 14 ngày qua.
                  </p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {dbData.trends.userRegistrations.map((item) => {
                      const max = Math.max(...dbData.trends.userRegistrations.map((t) => t.count), 1);
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
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-zinc-400 text-lg">auto_awesome_mosaic</span>
                    Mẫu Thiết Kế 3D Mới Xuất Bản (14 Ngày)
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                    {dbData.trends.templatesCreated.reduce((a, b) => a + b.count, 0)} mẫu mới
                  </span>
                </div>

                {dbData.trends.templatesCreated.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-12 text-center">
                    Chưa có mẫu thiết kế mới nào được tạo trong 14 ngày qua.
                  </p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {dbData.trends.templatesCreated.map((item) => {
                      const max = Math.max(...dbData.trends.templatesCreated.map((t) => t.count), 1);
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
          )}

          {/* PayOS Monetization Audit Strip */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10">
                  <span className="material-symbols-rounded text-xl">payments</span>
                </div>
                <div className="space-y-1 text-xs text-zinc-400">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Doanh Thu & Giao Dịch Cổng PayOS</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-white/10">
                      Đang hoạt động
                    </span>
                  </h4>
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
      )}

      {/* SECTION 2: GA4 MAIN DASHBOARD (Shown in 'all' and 'ga4') */}
      {(activeTab === "all" || activeTab === "ga4") && (
        <div className="space-y-6">
          {/* Quick Metrics Bar & Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono text-zinc-500 uppercase">Mã Đo Lường (Measurement ID)</p>
                <p className="text-base font-semibold text-white mt-1 font-mono">{measurementId}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-white/10">
                <span className="material-symbols-rounded text-xl text-emerald-400">check_circle</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono text-zinc-500 uppercase">Mã Thuộc Tính (Property ID)</p>
                <p className="text-base font-semibold text-white mt-1 font-mono">
                  {propertyId || "Chưa cấu hình (Dùng chung)"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-white/10">
                <span className="material-symbols-rounded text-xl text-blue-400">domain</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono text-zinc-500 uppercase">Chế Độ Theo Dõi</p>
                <p className="text-base font-semibold text-white mt-1">Realtime & Custom Events</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-white/10">
                <span className="material-symbols-rounded text-xl text-amber-400">bolt</span>
              </div>
            </div>
          </div>

          {/* Direct 1-Click GA4 Console Deep Links */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-zinc-300">open_in_new</span>
                  Truy Cập Nhanh Báo Cáo Google Analytics 4 Console
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Nhấp để chuyển trực tiếp đến các bảng phân tích chi tiết trên bảng điều khiển Google Analytics chính thức.
                </p>
              </div>

              <a
                href={getGaConsoleUrl("")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white hover:underline flex items-center gap-1 shrink-0"
              >
                Mở Trang Chủ GA4 Console
                <span className="material-symbols-rounded text-sm">arrow_outward</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Realtime */}
              <a
                href={getGaConsoleUrl("realtime/overview")}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <span className="material-symbols-rounded text-lg">radar</span>
                  </div>
                  <span className="material-symbols-rounded text-sm text-zinc-500 group-hover:text-emerald-400 transition-colors">
                    arrow_outward
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    Thời Gian Thực (Realtime)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Số người dùng trực tiếp, trang đang xem và vị trí trong 30 phút qua.
                  </p>
                </div>
              </a>

              {/* Card 2: Traffic Acquisition */}
              <a
                href={getGaConsoleUrl("reports/dashboard?params=_u..nav%3Dacquisition-traffic-acquisition")}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <span className="material-symbols-rounded text-lg">group_work</span>
                  </div>
                  <span className="material-symbols-rounded text-sm text-zinc-500 group-hover:text-blue-400 transition-colors">
                    arrow_outward
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    Nguồn Thu Hút (Acquisition)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Kênh truy cập: Tìm kiếm Google, Mạng xã hội, Giới thiệu (Referral).
                  </p>
                </div>
              </a>

              {/* Card 3: Engagement & Events */}
              <a
                href={getGaConsoleUrl("reports/dashboard?params=_u..nav%3Dengagement-events")}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <span className="material-symbols-rounded text-lg">ads_click</span>
                  </div>
                  <span className="material-symbols-rounded text-sm text-zinc-500 group-hover:text-purple-400 transition-colors">
                    arrow_outward
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                    Tương Tác & Sự Kiện (Events)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Thống kê xem mẫu 3D, đăng nhập, thanh toán và thao tác người dùng.
                  </p>
                </div>
              </a>

              {/* Card 4: Demographics & Tech */}
              <a
                href={getGaConsoleUrl("reports/dashboard?params=_u..nav%3Duser-demographics-overview")}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <span className="material-symbols-rounded text-lg">devices</span>
                  </div>
                  <span className="material-symbols-rounded text-sm text-zinc-500 group-hover:text-amber-400 transition-colors">
                    arrow_outward
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                    Thiết Bị & Công Nghệ (Tech)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Trình duyệt web, hệ điều hành (Windows, macOS), màn hình hiển thị.
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* Interactive Embedded Looker Studio / GA4 Viewer */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-zinc-300">dashboard_customize</span>
                  Khung Báo Cáo Trực Quan (Embedded Analytics Dashboard)
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Báo cáo trực quan hóa Google Looker Studio kết nối trực tiếp với tài khoản GA4 của PickMe3D.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFrameKey((prev) => prev + 1)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <span className="material-symbols-rounded text-sm">refresh</span>
                  Làm mới
                </button>

                {lookerStudioUrl ? (
                  <a
                    href={lookerStudioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/10"
                  >
                    <span className="material-symbols-rounded text-sm">fullscreen</span>
                    Xem Toàn Màn Hình
                  </a>
                ) : null}
              </div>
            </div>

            {/* Embed Container */}
            <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
              {lookerStudioUrl ? (
                <iframe
                  key={frameKey}
                  src={lookerStudioUrl}
                  title="PickMe3D GA4 Looker Studio Dashboard"
                  className="w-full h-full border-0"
                  allowFullScreen
                  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                  <span className="material-symbols-rounded text-4xl mb-2 text-zinc-500">dashboard_customize</span>
                  <p className="text-sm font-medium text-white mb-1">Chưa cấu hình URL Báo cáo Looker Studio</p>
                  <p className="text-xs text-zinc-500 max-w-md mb-4">
                    Vui lòng bấm nút &quot;Cấu Hình GA4 &amp; Báo Cáo&quot; ở trên để nhập đường link nhúng báo cáo Looker Studio của bạn.
                  </p>
                  <button
                    onClick={() => setConfigModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Cấu hình ngay
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/60 p-3 rounded-xl border border-white/5 gap-2">
              <p>
                💡 <span className="font-medium text-zinc-300">Mẹo:</span> Bạn có thể dán link Báo cáo Looker Studio của riêng dự án bằng cách bấm nút <strong>"Cấu Hình GA4 & Báo Cáo"</strong> ở góc trên.
              </p>
              <a
                href="https://lookerstudio.google.com/navigation/reporting"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline flex items-center gap-1 shrink-0"
              >
                Tạo Báo Cáo Looker Studio Mới
                <span className="material-symbols-rounded text-xs">arrow_outward</span>
              </a>
            </div>
          </div>

          {/* Event Tracking Dictionary */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <span className="material-symbols-rounded text-zinc-300">list_alt</span>
              Danh Mục Sự Kiện (Custom Events Map) Được Tích Hợp
            </h2>
            <p className="text-zinc-400 text-xs mb-4">
              Các sự kiện tương tác quan trọng mà nền tảng PickMe3D đang gửi tự động lên Google Analytics 4:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">TÊN SỰ KIỆN (EVENT NAME)</th>
                    <th className="py-2.5 px-3">DANH MỤC</th>
                    <th className="py-2.5 px-3">THÔNG SỐ KÈM THEO (PARAMETERS)</th>
                    <th className="py-2.5 px-3">Ý NGHĨA KINH DOANH / NỀN TẢNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">page_view</td>
                    <td className="py-2.5 px-3">Navigation</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">page_path, page_title</td>
                    <td className="py-2.5 px-3">Theo dõi tự động mọi chuyển trang trên toàn bộ ứng dụng Next.js.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-blue-400">login</td>
                    <td className="py-2.5 px-3">Authentication</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">method (google / guest / admin)</td>
                    <td className="py-2.5 px-3">Ghi nhận phương thức đăng nhập của người dùng vào hệ thống.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-purple-400">view_item</td>
                    <td className="py-2.5 px-3">3D Templates</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">item_id, item_name, item_category</td>
                    <td className="py-2.5 px-3">Đo lường mức độ quan tâm đối với từng mẫu thiết kế 3D.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-indigo-400">create_template</td>
                    <td className="py-2.5 px-3">3D Templates</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">label, template_category, is_system</td>
                    <td className="py-2.5 px-3">Ghi nhận hoạt động sáng tạo & phát hành mẫu thiết kế mới.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-amber-400">export_3d_model</td>
                    <td className="py-2.5 px-3">3D Canvas</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">file_format (gltf / obj), model_name</td>
                    <td className="py-2.5 px-3">Ghi nhận khi người dùng trích xuất file 3D từ Editor.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-rose-400">begin_checkout</td>
                    <td className="py-2.5 px-3">PayOS Billing</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">plan_name, months, value, currency</td>
                    <td className="py-2.5 px-3">Theo dõi phễu thanh toán gói dịch vụ Pro / Studio qua PayOS.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-teal-400">admin_action</td>
                    <td className="py-2.5 px-3">Admin Operations</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">actionType, targetType, targetId</td>
                    <td className="py-2.5 px-3">Theo dõi các tác vụ vận hành hệ thống của Quản trị viên.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG MODAL */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0e121b] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-lg text-emerald-400">tune</span>
                Cấu Hình Google Analytics 4 & Looker Studio
              </h3>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Mã Đo Lường GA4 (Measurement ID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={tempMeasurementId}
                  onChange={(e) => setTempMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono focus:outline-none focus:border-white/30"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Lấy từ: Google Analytics &gt; Quản trị (Admin) &gt; Luồng dữ liệu (Data Streams) &gt; Mã đo lường (G-...).
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Mã Thuộc Tính GA4 (Property ID) <span className="text-zinc-500">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={tempPropertyId}
                  onChange={(e) => setTempPropertyId(e.target.value)}
                  placeholder="Ví dụ: 432198765"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono focus:outline-none focus:border-white/30"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Dùng để tạo đường link trực tiếp vào đúng Property trên Google Analytics Console.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Link Nhúng Báo Cáo Looker Studio (Embed URL)
                </label>
                <textarea
                  rows={3}
                  value={tempLookerUrl}
                  onChange={(e) => setTempLookerUrl(e.target.value)}
                  placeholder="https://lookerstudio.google.com/embed/reporting/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono focus:outline-none focus:border-white/30 resize-none text-[11px]"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Trong Looker Studio, chọn <strong>Tệp &gt; Nhúng báo cáo &gt; Bật nhúng</strong> và sao chép mã URL trong `src="..."`.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
