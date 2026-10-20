"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAuditLogsApi,
  downloadAuditLogsCsv,
  AuditLogItem,
  PaginationMeta,
} from "@/lib/adminService";

const ACTION_OPTIONS = [
  { value: "all", label: "Tất cả hành động" },
  { value: "USER_BAN", label: "USER_BAN (Khóa tài khoản)" },
  { value: "USER_UNBAN", label: "USER_UNBAN (Mở khóa tài khoản)" },
  { value: "USER_ROLE_CHANGE", label: "USER_ROLE_CHANGE (Phân quyền)" },
  { value: "USER_CREATE", label: "USER_CREATE (Tạo người dùng)" },
  { value: "USER_IMPORT", label: "USER_IMPORT (Import danh sách)" },
  { value: "TEMPLATE_CREATE_SYSTEM", label: "TEMPLATE_CREATE_SYSTEM (Mẫu hệ thống)" },
  { value: "TEMPLATE_UPDATE", label: "TEMPLATE_UPDATE (Sửa mẫu)" },
  { value: "TEMPLATE_DELETE", label: "TEMPLATE_DELETE (Xóa mẫu)" },
  { value: "REPORT_STATUS_CHANGE", label: "REPORT_STATUS_CHANGE (Xử lý báo cáo)" },
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [action, setAction] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [search, setSearch] = useState("");

  // Modal
  const [detailLog, setDetailLog] = useState<AuditLogItem | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    const res = await fetchAuditLogsApi({
      page,
      limit: pagination.limit,
      action,
      targetType,
      search,
    });

    if (res.success && res.data) {
      setLogs(res.data);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || "Không thể tải nhật ký kiểm toán");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs(1);
  }, [action, targetType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleExportCsv = async () => {
    try {
      setDownloading(true);
      await downloadAuditLogsCsv();
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const getActionBadgeColor = (act: string) => {
    if (act.includes("BAN")) return "bg-red-500/15 text-red-400 border-red-500/30";
    if (act.includes("ROLE")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (act.includes("CREATE")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (act.includes("DELETE")) return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    if (act.includes("REPORT")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nhật Ký Kiểm Toán (Audit Logs)
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Ghi nhận bất biến toàn bộ hành động quản trị viên: thay đổi quyền, khóa tài khoản, can thiệp tài nguyên và xử lý sự cố.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
        >
          <span className="material-symbols-rounded text-lg">download</span>
          {downloading ? "Đang xuất..." : "Xuất Nhật Ký CSV"}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên admin, email hoặc đối tượng thao tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1b2030] border border-neutral-700/60 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors border border-neutral-700/50"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Hành động:</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Đối tượng:</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="user">User (Người dùng)</option>
              <option value="template">Template (Mẫu thiết kế)</option>
              <option value="report">Report (Báo cáo sự cố)</option>
              <option value="system">System (Hệ thống)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#141824] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
            Đang tải dữ liệu nhật ký kiểm toán...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            Chưa có bản ghi nhật ký kiểm toán nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#191f30] text-neutral-400 uppercase font-semibold tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Quản trị viên</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Đối tượng tác động</th>
                  <th className="py-3.5 px-4">IP</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#191e2e]/50 transition-colors">
                    {/* Time */}
                    <td className="py-3 px-4 font-sans text-neutral-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-white">{log.actorName}</div>
                      <div className="text-[11px] text-neutral-500">{log.actorEmail}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded border font-semibold text-[10px] ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-medium text-neutral-200 truncate max-w-xs" title={log.targetLabel || log.targetId}>
                        {log.targetLabel || log.targetId || "—"}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                        {log.targetType}
                      </div>
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 text-neutral-500 text-[11px]">
                      {log.ipAddress || "local"}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 font-sans">
                      <span className="text-emerald-400 font-semibold text-[11px]">
                        ✓ Thành công
                      </span>
                    </td>

                    {/* Details button */}
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setDetailLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs border border-neutral-700/60 transition-colors"
                      >
                        Xem JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="py-3 px-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 bg-[#161a28]">
            <div>
              Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} (Tổng {pagination.total} bản ghi)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadLogs(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: LOG DETAILS ── */}
      {detailLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">data_object</span>
                Chi Tiết Payload Nhật Ký
              </h3>
              <button
                onClick={() => setDetailLog(null)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#1b2030] text-neutral-300">
                <div>
                  <span className="text-neutral-500 block">Thao tác:</span>
                  <span className="font-bold text-white">{detailLog.action}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Quản trị viên:</span>
                  <span className="font-bold text-white">{detailLog.actorName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Đối tượng:</span>
                  <span>{detailLog.targetLabel || detailLog.targetId}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Thời gian:</span>
                  <span>{new Date(detailLog.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 font-semibold block mb-1">
                  Dữ liệu chi tiết đã được làm sạch (Sanitized JSON):
                </span>
                <pre className="p-3.5 rounded-xl bg-[#0f121d] border border-neutral-800 text-indigo-300 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(detailLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailLog(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
