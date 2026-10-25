"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminReportsApi,
  updateReportStatusApi,
  downloadReportsCsv,
  IncidentReport,
  PaginationMeta,
} from "@/lib/adminService";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [detailReport, setDetailReport] = useState<IncidentReport | null>(null);
  const [editStatus, setEditStatus] = useState<"pending" | "investigating" | "resolved" | "dismissed">("pending");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const loadReports = async (page = 1) => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminReportsApi({
      page,
      limit: pagination.limit,
      status,
      priority,
      targetType,
      search,
    });

    if (res.success && res.data) {
      setReports(res.data);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || "Không thể tải danh sách sự cố & báo cáo");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports(1);
  }, [status, priority, targetType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports(1);
  };

  const openResolutionModal = (report: IncidentReport) => {
    setDetailReport(report);
    setEditStatus(report.status);
    setEditPriority(report.priority);
    setResolutionNotes(report.resolutionNotes || "");
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailReport) return;

    setActionBusy(true);
    const res = await updateReportStatusApi(detailReport._id, {
      status: editStatus,
      priority: editPriority,
      resolutionNotes,
    });

    if (res.success) {
      setDetailReport(null);
      loadReports(pagination.page);
    } else {
      alert("Lỗi: " + res.message);
    }
    setActionBusy(false);
  };

  const handleExportCsv = async () => {
    try {
      setDownloadingCsv(true);
      await downloadReportsCsv();
    } catch (err: any) {
      alert("Lỗi khi tải file: " + err.message);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "critical":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "high":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "medium":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-white/10 text-neutral-300 border-white/10";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "resolved":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "investigating":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "dismissed":
        return "bg-white/5 text-neutral-400 border-white/10";
      default:
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
            Quản Lý Sự Cố & Báo Cáo Vi Phạm
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Xử lý phản ánh từ người dùng, kiểm duyệt vi phạm bản quyền, nội dung không phù hợp hoặc sự cố hệ thống.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={downloadingCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-black/40 disabled:opacity-50"
        >
          <span className="material-symbols-rounded text-lg text-emerald-400">download</span>
          {downloadingCsv ? "Đang xuất..." : "Xuất Báo Cáo CSV"}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0d131f] border border-white/10 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xl shadow-black/40">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo nội dung, đối tượng hoặc người báo cáo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#060911] border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors border border-white/10"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý (Pending)</option>
              <option value="investigating">Đang điều tra</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="dismissed">Đã bác bỏ</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Ưu tiên:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả</option>
              <option value="critical">Khẩn cấp (Critical)</option>
              <option value="high">Cao (High)</option>
              <option value="medium">Trung bình (Medium)</option>
              <option value="low">Thấp (Low)</option>
            </select>
          </div>

          {/* Target Type */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Loại:</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả</option>
              <option value="template">Mẫu thiết kế</option>
              <option value="user">Người dùng</option>
              <option value="comment">Bình luận</option>
              <option value="system">Hệ thống</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#0d131f] border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-3" />
            Đang tải dữ liệu sự cố và báo cáo...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            Không có báo cáo sự cố nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060911] text-neutral-400 uppercase font-semibold tracking-wider border-b border-white/10 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Đối tượng phản ánh</th>
                  <th className="py-3.5 px-4">Lý do</th>
                  <th className="py-3.5 px-4">Người báo cáo</th>
                  <th className="py-3.5 px-4">Ưu tiên</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Target */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white truncate max-w-xs" title={r.targetTitle || r.targetId}>
                        {r.targetTitle || r.targetId}
                      </div>
                      <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                        {r.targetType}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-neutral-200 capitalize">
                        {r.reason.replace(/_/g, " ")}
                      </span>
                      <div className="text-neutral-500 text-[11px] line-clamp-1 max-w-xs">
                        {r.description}
                      </div>
                    </td>

                    {/* Reporter */}
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{r.reporterName}</div>
                      {r.reporter?.email && (
                        <div className="text-neutral-500 text-[11px]">{r.reporter.email}</div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border font-semibold text-[10px] uppercase tracking-wider ${getPriorityBadge(
                          r.priority
                        )}`}
                      >
                        {r.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${getStatusBadge(
                          r.status
                        )}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === "resolved"
                              ? "bg-emerald-400"
                              : r.status === "investigating"
                              ? "bg-rose-400"
                              : r.status === "dismissed"
                              ? "bg-neutral-500"
                              : "bg-amber-400"
                          }`}
                        />
                        {r.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openResolutionModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-rose-300 hover:text-white font-semibold text-xs border border-white/10 transition-colors"
                      >
                        Xử lý
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
          <div className="py-3 px-4 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 bg-[#060911]">
            <div>
              Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} (Tổng {pagination.total} báo cáo)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadReports(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadReports(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: RESOLVE / UPDATE REPORT ── */}
      {detailReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-rose-400">gavel</span>
                Xử Lý Báo Cáo Vi Phạm
              </h3>
              <button
                onClick={() => setDetailReport(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs mb-5">
              <div className="p-3.5 rounded-2xl bg-[#060911] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-rose-400">
                    {detailReport.targetType}
                  </span>
                  <span className="text-neutral-500">
                    ID: <code className="text-neutral-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{detailReport.targetId}</code>
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {detailReport.targetTitle || detailReport.targetId}
                </div>
                <div className="text-neutral-400">
                  Lý do: <span className="font-semibold text-white capitalize">{detailReport.reason.replace(/_/g, " ")}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#060911] border border-white/10 space-y-1">
                <span className="font-semibold text-neutral-400 block">Nội dung phản ánh từ người dùng:</span>
                <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {detailReport.description}
                </p>
                <div className="text-[11px] text-neutral-500 pt-1">
                  Bởi: {detailReport.reporterName} ({detailReport.reporter?.email || "N/A"}) •{" "}
                  {new Date(detailReport.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>

              {detailReport.resolvedByName && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                  ✓ Đã giải quyết bởi <span className="font-bold">{detailReport.resolvedByName}</span> vào lúc{" "}
                  {new Date(detailReport.resolvedAt || "").toLocaleString("vi-VN")}
                </div>
              )}
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Cập nhật trạng thái</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-white focus:outline-none focus:border-red-500/60"
                  >
                    <option value="pending">Chờ xử lý (Pending)</option>
                    <option value="investigating">Đang điều tra (Investigating)</option>
                    <option value="resolved">Đã giải quyết (Resolved)</option>
                    <option value="dismissed">Bác bỏ báo cáo (Dismissed)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Mức độ ưu tiên</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-white focus:outline-none focus:border-red-500/60"
                  >
                    <option value="low">Thấp (Low)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="high">Cao (High)</option>
                    <option value="critical">Khẩn cấp (Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Ghi chú giải quyết của Quản trị viên
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ví dụ: Đã xóa mẫu vi phạm bản quyền và cảnh cáo người dùng..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-white focus:outline-none focus:border-red-500/60 placeholder:text-neutral-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailReport(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:via-rose-400 hover:to-amber-400 disabled:opacity-50 text-white font-semibold shadow-lg shadow-red-950/40 transition-all"
                >
                  {actionBusy ? "Đang lưu..." : "Lưu Kết Quả Xử Lý"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
