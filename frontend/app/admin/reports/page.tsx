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
        return "bg-zinc-800 text-white border-white/20";
      case "high":
        return "bg-zinc-800/80 text-zinc-200 border-white/10";
      case "medium":
        return "bg-zinc-900 text-zinc-300 border-white/10";
      default:
        return "bg-zinc-900/60 text-zinc-400 border-white/10";
    }
  };

  const getStatusBadge = (_s: string) => {
    return "bg-zinc-800 text-zinc-200 border-white/10";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
            Moderation & Incident Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Quản Lý Sự Cố & Báo Cáo Vi Phạm
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Xử lý phản ánh từ người dùng, kiểm duyệt vi phạm bản quyền, nội dung không phù hợp hoặc sự cố hệ thống.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={downloadingCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-rounded text-base text-black">download</span>
          <span>{downloadingCsv ? "Đang xuất..." : "Xuất Báo Cáo CSV"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo nội dung, đối tượng hoặc người báo cáo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors border border-white/10"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý (Pending)</option>
              <option value="investigating">Đang điều tra</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="dismissed">Đã bác bỏ</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Ưu tiên:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
            >
              <option value="all">Tất cả</option>
              <option value="critical">Khẩn cấp (Critical)</option>
              <option value="high">Cao (High)</option>
              <option value="medium">Trung bình (Medium)</option>
              <option value="low">Thấp (Low)</option>
            </select>
          </div>

          {/* Target Type */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Loại:</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
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
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-3" />
            Đang tải dữ liệu sự cố và báo cáo...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-zinc-400 text-sm">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            Không có báo cáo sự cố nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-medium tracking-wider border-b border-white/10 text-[11px]">
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
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Target */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-white truncate max-w-xs" title={r.targetTitle || r.targetId}>
                        {r.targetTitle || r.targetId}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                        {r.targetType}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-zinc-200 capitalize">
                        {r.reason.replace(/_/g, " ")}
                      </span>
                      <div className="text-zinc-500 text-[11px] line-clamp-1 max-w-xs">
                        {r.description}
                      </div>
                    </td>

                    {/* Reporter */}
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{r.reporterName}</div>
                      {r.reporter?.email && (
                        <div className="text-zinc-500 text-[11px]">{r.reporter.email}</div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${getPriorityBadge(
                          r.priority
                        )}`}
                      >
                        {r.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border ${getStatusBadge(
                          r.status
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        {r.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openResolutionModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium text-xs border border-white/10 transition-colors cursor-pointer"
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
          <div className="py-3 px-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-zinc-950">
            <div>
              Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} (Tổng {pagination.total} báo cáo)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadReports(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadReports(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
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
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-zinc-400 text-lg">gavel</span>
                Xử Lý Báo Cáo Vi Phạm
              </h3>
              <button
                onClick={() => setDetailReport(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs mb-5">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase text-zinc-400">
                    {detailReport.targetType}
                  </span>
                  <span className="text-zinc-500">
                    ID: <code className="text-zinc-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{detailReport.targetId}</code>
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {detailReport.targetTitle || detailReport.targetId}
                </div>
                <div className="text-zinc-400">
                  Lý do: <span className="font-medium text-white capitalize">{detailReport.reason.replace(/_/g, " ")}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-1">
                <span className="font-medium text-zinc-400 block">Nội dung phản ánh từ người dùng:</span>
                <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {detailReport.description}
                </p>
                <div className="text-[11px] text-zinc-500 pt-1">
                  Bởi: {detailReport.reporterName} ({detailReport.reporter?.email || "N/A"}) •{" "}
                  {new Date(detailReport.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>

              {detailReport.resolvedByName && (
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 text-[11px]">
                  ✓ Đã giải quyết bởi <span className="font-semibold text-white">{detailReport.resolvedByName}</span> vào lúc{" "}
                  {new Date(detailReport.resolvedAt || "").toLocaleString("vi-VN")}
                </div>
              )}
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">Cập nhật trạng thái</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="pending">Chờ xử lý (Pending)</option>
                    <option value="investigating">Đang điều tra (Investigating)</option>
                    <option value="resolved">Đã giải quyết (Resolved)</option>
                    <option value="dismissed">Bác bỏ báo cáo (Dismissed)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">Mức độ ưu tiên</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="low">Thấp (Low)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="high">Cao (High)</option>
                    <option value="critical">Khẩn cấp (Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">
                  Ghi chú giải quyết của Quản trị viên
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ví dụ: Đã xóa mẫu vi phạm bản quyền và cảnh cáo người dùng..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-white/30 placeholder:text-zinc-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailReport(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
