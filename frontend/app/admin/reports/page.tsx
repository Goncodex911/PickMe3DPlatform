"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminReportsApi,
  updateReportStatusApi,
  downloadReportsCsv,
  deleteAdminReviewApi,
  IncidentReport,
  PaginationMeta,
} from "@/lib/adminService";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [ticketType, setTicketType] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [detailReport, setDetailReport] = useState<IncidentReport | null>(null);
  const [editStatus, setEditStatus] = useState<"pending" | "investigating" | "resolved" | "dismissed">("pending");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [sendCreatorWarning, setSendCreatorWarning] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const handleDeleteReview = async (reviewId: string, templateId?: string, reportId?: string) => {
    if (!confirm("Are you sure you want to delete this review? The average rating will be recalculated.")) {
      return;
    }
    setDeletingReviewId(reviewId);
    const res = await deleteAdminReviewApi(reviewId, templateId);
    if (res.success) {
      alert("The reported review was deleted.");
      if (detailReport && detailReport._id === reportId) {
        setDetailReport((prev) => (prev ? { ...prev, reviewDetails: undefined } : null));
      }
      loadReports(pagination.page);
    } else {
      alert("Error: " + (res.message || "Could not delete the review."));
    }
    setDeletingReviewId(null);
  };

  const loadReports = async (page = 1) => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminReportsApi({
      page,
      limit: pagination.limit,
      ticketType,
      status,
      priority,
      targetType,
      search,
    });

    if (res.success && res.data) {
      setReports(res.data);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || "Could not load reports and appeals.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports(1);
  }, [ticketType, status, priority, targetType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports(1);
  };

  const openResolutionModal = (report: IncidentReport) => {
    setDetailReport(report);
    setEditStatus(report.status);
    setEditPriority(report.priority);
    setResolutionNotes(report.resolutionNotes || "");
    setSendCreatorWarning(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailReport) return;

    setActionBusy(true);
    const res = await updateReportStatusApi(detailReport._id, {
      status: editStatus,
      priority: editPriority,
      resolutionNotes,
      sendCreatorWarning: editStatus === "resolved" ? sendCreatorWarning : false,
    });

    if (res.success) {
      setDetailReport(null);
      loadReports(pagination.page);
    } else {
      alert("Error: " + res.message);
    }
    setActionBusy(false);
  };

  const handleExportCsv = async () => {
    try {
      setDownloadingCsv(true);
      await downloadReportsCsv();
    } catch (err: any) {
      alert("Could not download the file: " + err.message);
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

  const getTargetActionLink = (r: IncidentReport): { url: string; label: string; icon: string } | null => {
    const lowerType = String(r.targetType || "").toLowerCase();

    if (r.targetUrl) {
      if (lowerType === "template") return { url: r.targetUrl, label: "View template", icon: "palette" };
      if (lowerType === "review") return { url: r.targetUrl, label: "View review", icon: "rate_review" };
      if (lowerType === "creator" || lowerType === "user") {
        const legacyIdMatch = r.targetUrl.match(/^\/creator\/([0-9a-fA-F]{24})\/?$/);
        const normalizedCreatorUrl = legacyIdMatch
          ? `/creator/?id=${encodeURIComponent(legacyIdMatch[1])}`
          : r.targetUrl.startsWith("/creator/") && !r.targetUrl.includes("?") && !r.targetUrl.startsWith("/creator/wallet")
          ? `/creator/?username=${encodeURIComponent(r.targetUrl.replace(/^\/creator\//, "").replace(/\/$/, ""))}`
          : r.targetUrl;
        return { url: normalizedCreatorUrl, label: "View creator profile", icon: "person" };
      }
      return { url: r.targetUrl, label: "View target", icon: "open_in_new" };
    }

    // Fallbacks if targetUrl is empty
    if (lowerType === "template" && r.targetId) {
      return { url: `/templates/${r.targetId}`, label: "View template", icon: "palette" };
    }
    if (lowerType === "review") {
      if (r.targetId && r.targetId.includes("-creator-review-")) {
        return { url: `/creator/?id=${encodeURIComponent(r.targetId.split("-creator-review-")[0])}`, label: "View creator profile", icon: "rate_review" };
      }
      if (r.targetId && r.targetId.includes("-review-")) {
        return { url: `/templates/${r.targetId.split("-review-")[0]}`, label: "View reviewed template", icon: "rate_review" };
      }
      if (r.targetTitle) {
        const match = r.targetTitle.match(/cho "([^"]+)"/);
        if (match && match[1]) {
          return { url: `/templates?search=${encodeURIComponent(match[1])}`, label: "View reviewed template", icon: "rate_review" };
        }
      }
    }
    if ((lowerType === "creator" || lowerType === "user") && r.targetId) {
      return { url: `/creator/?id=${encodeURIComponent(r.targetId)}`, label: "View creator profile", icon: "person" };
    }
    if (r.ticketType === "APPEAL" && (r.reporter?.email || r.reporterName)) {
      return { url: `/admin/users?search=${encodeURIComponent(r.reporter?.email || r.reporterName)}`, label: "View reporting user", icon: "account_circle" };
    }

    return null;
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
            Reports & Appeals
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Review user reports, copyright claims, inappropriate content, and system issues.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={downloadingCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-wide transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-rounded text-base text-black">download</span>
          <span>{downloadingCsv ? "Exporting..." : "Export CSV report"}</span>
        </button>
      </div>

      {/* Ticket Type Tabs */}
      <div className="flex items-center gap-2">
        {[
          { label: "All submissions", value: "all" },
          { label: "Reports", value: "REPORT" },
          { label: "Appeals", value: "APPEAL" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTicketType(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              ticketType === tab.value
                ? "bg-white text-black shadow-md font-bold"
                : "bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
              placeholder="Search by content, target, or reporter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none  transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors border border-white/10"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none "
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Priority:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none "
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Target Type */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Type:</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none "
            >
              <option value="all">All</option>
              <option value="creator">Creator</option>
              <option value="template">Template</option>
              <option value="review">Review</option>
              <option value="user">User</option>
              <option value="comment">Comment</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-3" />
            Loading reports...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-zinc-400 text-sm">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            No matching reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-medium tracking-wider border-b border-white/10 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Reported item</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Reporter</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {r.ticketType === "APPEAL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            APPEAL
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            REPORT
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                          {r.targetType}
                        </span>

                        {/* One-click Button to Map Directly to Target */}
                        {(() => {
                          const action = getTargetActionLink(r);
                          if (!action) return null;
                          return (
                            <a
                              href={action.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-semibold transition-all shadow-sm group"
                              title={`Open ${action.label} in a new tab`}
                            >
                              <span className="material-symbols-rounded text-xs">{action.icon}</span>
                              <span>{action.label}</span>
                              <span className="material-symbols-rounded text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">
                                open_in_new
                              </span>
                            </a>
                          );
                        })()}
                      </div>

                      {/* Direct Reported Review Box (View directly without searching on template) */}
                      {r.reviewDetails && (
                        <div className="w-full mt-2.5 p-2.5 rounded-xl bg-zinc-950/90 border border-amber-500/30 space-y-1.5 shadow-md">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              {r.reviewDetails.userAvatar ? (
                                <img src={r.reviewDetails.userAvatar} alt="" className="w-4 h-4 rounded-full object-cover border border-white/10" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[9px] font-bold">
                                  {r.reviewDetails.userName[0]}
                                </div>
                              )}
                              <span className="font-semibold text-white">{r.reviewDetails.userName}</span>
                            </div>
                            <div className="flex items-center text-amber-400 text-xs">
                              {Array.from({ length: r.reviewDetails.rating }).map((_, i) => (
                                <span key={i} className="material-symbols-rounded rating-star-filled text-xs">star</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-zinc-200 text-[11px] leading-relaxed bg-white/[0.03] p-2 rounded-lg border border-white/5 whitespace-pre-wrap">
                            {r.reviewDetails.comment || <span className="text-zinc-500 italic">(No review text provided)</span>}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                            <span className="text-zinc-400 truncate max-w-[170px]" title={r.reviewDetails.templateTitle}>
                              Template: <strong className="text-zinc-200 font-medium">{r.reviewDetails.templateTitle}</strong>
                            </span>
                            <button
                              type="button"
                              disabled={deletingReviewId === r.reviewDetails._id}
                              onClick={() => handleDeleteReview(r.reviewDetails!._id, r.reviewDetails!.templateId, r._id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Permanently delete this review from the template"
                            >
                              <span className="material-symbols-rounded text-xs">delete</span>
                              <span>{deletingReviewId === r.reviewDetails._id ? "Deleting..." : "Delete review"}</span>
                            </button>
                          </div>
                        </div>
                      )}
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
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(() => {
                          const action = getTargetActionLink(r);
                          if (!action) return null;
                          return (
                            <a
                              href={action.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-300 border border-white/10 hover:border-blue-500/40 transition-all inline-flex items-center justify-center"
                              title={`View ${action.label} in a new tab`}
                            >
                              <span className="material-symbols-rounded text-sm">open_in_new</span>
                            </a>
                          );
                        })()}
                        <button
                          onClick={() => openResolutionModal(r)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium text-xs border border-white/10 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
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
              Page <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} ({pagination.total} reports total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadReports(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadReports(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: RESOLVE / UPDATE REPORT ── */}
      {detailReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-zinc-400 text-lg">gavel</span>
                Review Report
              </h3>
              <button
                onClick={() => setDetailReport(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs mb-5">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-2.5">
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
                  Reason: <span className="font-medium text-white capitalize">{detailReport.reason.replace(/_/g, " ")}</span>
                </div>

                {/* Direct One-Click Button Inside Resolution Modal */}
                {(() => {
                  const action = getTargetActionLink(detailReport);
                  if (!action) return null;
                  return (
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
                      >
                        <span className="material-symbols-rounded text-sm">{action.icon}</span>
                        <span>Open {action.label}</span>
                        <span className="material-symbols-rounded text-xs group-hover:translate-x-0.5 transition-transform">
                          open_in_new
                        </span>
                      </a>
                      {["creator", "user"].includes(String(detailReport.targetType || "").toLowerCase()) && (
                        <a
                          href={`/admin/users?search=${encodeURIComponent(detailReport.targetId)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
                        >
                          <span className="material-symbols-rounded text-xs">manage_accounts</span>
                          <span>Manage user</span>
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Reported Review Card in Resolution Modal */}
                {detailReport.reviewDetails && (
                  <div className="pt-2.5 border-t border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                      Reported review details:
                    </span>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {detailReport.reviewDetails.userAvatar ? (
                            <img src={detailReport.reviewDetails.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                              {detailReport.reviewDetails.userName[0]}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-white block">{detailReport.reviewDetails.userName}</span>
                            <span className="text-[10px] text-zinc-400">On template: {detailReport.reviewDetails.templateTitle}</span>
                          </div>
                        </div>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: detailReport.reviewDetails.rating }).map((_, i) => (
                            <span key={i} className="material-symbols-rounded rating-star-filled text-sm">star</span>
                          ))}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-zinc-200 text-xs">
                        {detailReport.reviewDetails.comment || <span className="text-zinc-500 italic">(No comment text)</span>}
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={deletingReviewId === detailReport.reviewDetails._id}
                          onClick={() => handleDeleteReview(detailReport.reviewDetails!._id, detailReport.reviewDetails!.templateId, detailReport._id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-rounded text-sm">delete</span>
                          <span>{deletingReviewId === detailReport.reviewDetails._id ? "Deleting..." : "Delete reported review"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-1">
                <span className="font-medium text-zinc-400 block">User-submitted report:</span>
                <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {detailReport.description}
                </p>
                <div className="text-[11px] text-zinc-500 pt-1">
                  By: {detailReport.reporterName} ({detailReport.reporter?.email || "N/A"}) •{" "}
                  {new Date(detailReport.createdAt).toLocaleString("en-US")}
                </div>
              </div>

              {/* Attachments if any */}
              {detailReport.attachments && detailReport.attachments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-1.5">
                  <span className="font-medium text-zinc-400 block">Attached evidence:</span>
                  <div className="flex flex-wrap gap-2">
                    {detailReport.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 rounded-lg overflow-hidden border border-white/20 hover:border-white/50 transition-colors inline-block"
                      >
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detailReport.resolvedByName && (
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 text-[11px]">
                  ✓ Resolved by <span className="font-semibold text-white">{detailReport.resolvedByName}</span> at{" "}
                  {new Date(detailReport.resolvedAt || "").toLocaleString("en-US")}
                </div>
              )}
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">Update status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none "
                  >
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none "
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">
                  Administrator resolution notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Removed the copyright-infringing template and warned the user..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none  placeholder:text-zinc-600"
                />
              </div>

              {editStatus === "resolved" &&
                ["creator", "user", "template"].includes(String(detailReport.targetType || "").toLowerCase()) && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendCreatorWarning}
                      onChange={(e) => setSendCreatorWarning(e.target.checked)}
                      className="mt-0.5 accent-rose-500 cursor-pointer"
                    />
                    <span>
                      <strong className="text-rose-300 font-semibold block">
                        Send a warning to the reported creator
                      </strong>
                      <span className="text-[11px] text-zinc-400">
                        The creator will receive a policy warning with a link to submit an appeal.
                      </span>
                    </span>
                  </label>
                )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailReport(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionBusy ? "Saving..." : "Save resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
