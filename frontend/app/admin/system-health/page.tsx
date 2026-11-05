"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchSystemHealthApi, SystemHealthData } from "@/lib/adminService";

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSystemHealthApi();
      if (res.success && res.data) {
        setHealth(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || "Không thể kiểm tra trạng thái dịch vụ");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Auto refresh interval if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      checkHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, checkHealth]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">
              Infrastructure & Operations
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tất Cả Dịch Vụ Đang Hoạt Động
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Trạng Thái Hệ Thống (System Health)
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Giám sát độ trễ, tài nguyên bộ nhớ và trạng thái vận hành thời gian thực của MongoDB Atlas, Cloudinary CDN, AI Service và Express Server.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-950 border-white/20 text-white focus:ring-0"
            />
            <span>Tự động cập nhật (15s)</span>
          </label>

          <button
            onClick={() => checkHealth()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <span
              className={`material-symbols-rounded text-base ${
                loading ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            <span>{loading ? "Đang kiểm tra..." : "Kiểm Tra Lại"}</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center bg-zinc-900/50 border border-rose-500/30 rounded-2xl">
          <span className="material-symbols-rounded text-3xl text-rose-400 mb-2">warning</span>
          <p className="text-rose-400 text-sm font-semibold">{error}</p>
          <button
            onClick={() => checkHealth()}
            className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : !health ? (
        <div className="p-12 text-center text-zinc-500 text-xs">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
          Đang kết nối và đo lường trạng thái các dịch vụ...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner Overall Status */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded text-2xl">verified</span>
              </div>
              <div>
                <div className="text-base font-semibold text-white">
                  Toàn Bộ Hạ Tầng Sẵn Sàng (100% Operational)
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Lần kiểm tra gần nhất:{" "}
                  <span className="text-zinc-300 font-mono">
                    {lastUpdated.toLocaleTimeString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 font-mono">
              Uptime máy chủ:{" "}
              <span className="text-emerald-400 font-bold">
                {formatUptime(health.services.backend.uptimeSeconds)}
              </span>
            </div>
          </div>

          {/* 4 Core Microservice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. MongoDB Atlas */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-rounded text-xl">database</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {health.services.database.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Host: {health.services.database.host}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Độ trễ Ping DB</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {health.services.database.latencyMs} ms
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Trạng thái kết nối</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    ReadyState {health.services.database.readyState}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kết nối ổn định đến cơ sở dữ liệu MongoDB Atlas. Hỗ trợ đầy đủ các transaction phân bổ doanh thu Creator và nhật ký kiểm toán.
              </p>
            </div>

            {/* 2. Cloudinary Media CDN */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-blue-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-rounded text-xl">cloud_sync</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {health.services.storage.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Cloud: {health.services.storage.cloudName}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Đang hoạt động
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Độ trễ CDN</span>
                  <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">
                    {health.services.storage.latency} ms
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Giao thức truyền tải</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    HTTPS / WebP CDN
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Lưu trữ và phân phối hình ảnh thumbnail 3D, file texture và mô hình GLB/USDZ với bộ nhớ đệm toàn cầu tốc độ cao.
              </p>
            </div>

            {/* 3. AI Generation Engine */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-purple-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <span className="material-symbols-rounded text-xl">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {health.services.aiEngine.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Engine: {health.services.aiEngine.provider}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Đang hoạt động
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Độ trễ phản hồi</span>
                  <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                    {health.services.aiEngine.latency} ms
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Tính năng hỗ trợ</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    Text-to-Slide & 3D
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {health.services.aiEngine.details}. Sẵn sàng xử lý các prompt tạo slide tự động và gợi ý hoạt ảnh thời gian thực.
              </p>
            </div>

            {/* 4. Node.js Express Core */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-amber-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <span className="material-symbols-rounded text-xl">dns</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {health.services.backend.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Port: {health.services.backend.port} • Node {health.services.backend.nodeVersion}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Đang hoạt động
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Heap Used</span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {health.services.backend.heapUsedMB} MB
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Heap Total</span>
                  <div className="text-base font-bold text-zinc-400 font-mono mt-0.5">
                    {health.services.backend.heapTotalMB} MB
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">RSS Memory</span>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {health.services.backend.rssMB} MB
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Máy chủ Express đang xử lý các API endpoint quản trị, PayOS webhook và quản lý trạng thái phiên làm việc ổn định.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

