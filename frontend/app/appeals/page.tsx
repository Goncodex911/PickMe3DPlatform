"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createReportApi, fetchMyReportsApi, ReportItem, isCurrentUserAdmin } from "@/lib/reportService";
import { uploadFileToCloudinary } from "@/lib/mediaUpload";

const APPEAL_CATEGORIES = [
  { value: "account_restriction", label: "Account restriction or suspension" },
  { value: "payout_issue", label: "Withdrawal or wallet earnings issue" },
  { value: "template_removal", label: "Design removal or moderation appeal" },
  { value: "transaction_dispute", label: "Purchase or subscription dispute" },
  { value: "general_inquiry", label: "General inquiry or other issue" },
];

export default function AppealsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [category, setCategory] = useState(APPEAL_CATEGORIES[0].value);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // History state
  const [myTickets, setMyTickets] = useState<ReportItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"ALL" | "APPEAL" | "REPORT">("ALL");

  const loadHistory = async () => {
    setLoadingHistory(true);
    const res = await fetchMyReportsApi();
    if (res.success && res.data) {
      setMyTickets(res.data);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isCurrentUserAdmin()) {
      setIsAdmin(true);
      router.replace("/admin/reports");
    }
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormMsg({ text: "Upload an image file only (PNG, JPG, or WEBP).", error: true });
      return;
    }

    try {
      setUploadingImage(true);
      setFormMsg(null);
      const url = await uploadFileToCloudinary(file, "pickme3d/appeals");
      setAttachments((prev) => [...prev, url]);
    } catch (err: any) {
      setFormMsg({ text: "Couldn’t upload the evidence image.", error: true });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormMsg({ text: "Enter both a title and details for your appeal.", error: true });
      return;
    }

    try {
      setSubmitting(true);
      setFormMsg(null);

      const res = await createReportApi({
        ticketType: "APPEAL",
        appealCategory: category,
        reason: title.trim(),
        targetTitle: title.trim(),
        description: description.trim(),
        attachments,
      });

      if (!res.success) {
        setFormMsg({ text: "Couldn’t submit your appeal.", error: true });
        setSubmitting(false);
        return;
      }

      setFormMsg({ text: "Your appeal has been sent to the moderation team." });
      setTimeout(() => {
        setTitle("");
        setDescription("");
        setAttachments([]);
        setActiveTab("history");
      }, 1500);
    } catch (err: any) {
      setFormMsg({ text: "A connection error occurred.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = myTickets.filter((item) => {
    if (ticketFilter === "ALL") return true;
    return item.ticketType === ticketFilter;
  });

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0e1422] border border-white/10 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-rounded text-2xl">admin_panel_settings</span>
          </div>
          <h2 className="text-lg font-bold text-white">For users and creators</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Admin accounts can’t submit personal appeals. Use the admin dashboard to review issues and reports.
          </p>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            <span>Open reports dashboard</span>
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      {/* Top Header */}
      <div className="border-b border-white/10 bg-[#0a0e17] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Home</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-slate-200 font-bold">Appeals & moderation support</span>
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-[#0e1422] to-[#0e1422] border border-indigo-500/20 p-6 sm:p-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
              <span className="material-symbols-rounded text-sm">gavel</span>
              Support & community transparency
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Appeals and support center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Submit feedback, appeal moderation decisions, report financial disputes, or track the status of your reports.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "submit"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-rounded text-sm">edit_document</span>
            <span>Submit an appeal</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-rounded text-sm">history</span>
            <span>History ({myTickets.length})</span>
          </button>
        </div>

        {/* Tab 1: Submit Appeal Form */}
        {activeTab === "submit" && (
          <div className="rounded-2xl bg-[#0e1422] border border-white/10 p-6 sm:p-8 max-w-3xl">
            <h2 className="text-base font-bold text-white mb-1">Submit an appeal</h2>
            <p className="text-xs text-slate-400 mb-6">
              The PickMe3D moderation team will review your appeal and reply through your account notifications.
            </p>

            {formMsg && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  formMsg.error
                    ? "bg-red-500/10 border border-red-500/30 text-red-300"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                <span className="material-symbols-rounded text-base">
                  {formMsg.error ? "error" : "check_circle"}
                </span>
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Appeal category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400 transition-colors"
                >
                  {APPEAL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Summary title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="For example: Appeal the incorrect copyright removal of my 3D blazer design"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Details and supporting evidence <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why you believe the admin or system decision was incorrect. Include links or supporting documents..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Evidence screenshots (optional)
                  </label>
                  {uploadingImage && (
                    <span className="text-blue-400 text-[11px] animate-pulse">Uploading image...</span>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((url, idx) => (
                      <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white/20">
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                        >
                          <span className="material-symbols-rounded text-lg">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 w-full py-3 px-3 border border-dashed border-white/20 hover:border-white/40 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-xs text-slate-300">
                  <span className="material-symbols-rounded text-lg text-slate-400">upload_file</span>
                  <span>Upload a receipt, copyright evidence, or other supporting document</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadingImage || submitting}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !description.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting appeal...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-base">send</span>
                      <span>Submit appeal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: My Tickets History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              {[
                { label: "All", value: "ALL" },
                { label: "Appeals", value: "APPEAL" },
                { label: "Reports", value: "REPORT" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setTicketFilter(pill.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    ticketFilter === pill.value
                      ? "bg-indigo-600 text-white"
                      : "bg-[#0e1422] text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center">
                <div className="w-7 h-7 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading your history...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-2xl bg-[#0e1422] border border-white/10 p-12 text-center">
                <span className="material-symbols-rounded text-4xl text-slate-600 block mb-2">inbox</span>
                <p className="text-xs text-slate-400">You don’t have any appeals or reports yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-5 rounded-2xl bg-[#0e1422] border border-white/10 space-y-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        {ticket.ticketType === "APPEAL" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs">gavel</span>
                            Appeal
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs">flag</span>
                            Report
                          </span>
                        )}
                        <span className="text-xs font-semibold text-white">
                          {ticket.targetTitle || ticket.reason}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div>
                        {ticket.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pending
                          </span>
                        )}
                        {ticket.status === "investigating" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Under review
                          </span>
                        )}
                        {ticket.status === "resolved" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="material-symbols-rounded text-xs">check</span>
                            Resolved
                          </span>
                        )}
                        {ticket.status === "dismissed" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                            <span className="material-symbols-rounded text-xs">close</span>
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {ticket.description}
                    </p>

                    {/* Attachments if any */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ticket.attachments.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-colors inline-block"
                          >
                            <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Admin Response Note */}
                    {ticket.resolutionNotes && (
                      <div className="mt-2 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                        <div className="font-bold flex items-center gap-1.5 text-blue-300 mb-1">
                          <span className="material-symbols-rounded text-sm">verified_user</span>
                          <span>Response from {ticket.resolvedByName || "Admin"}:</span>
                        </div>
                        <p className="leading-relaxed">{ticket.resolutionNotes}</p>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 pt-1">
                      Submitted: {new Date(ticket.createdAt).toLocaleString("en-US")}
                      {ticket.resolvedAt && (
                        <span className="ml-3">
                          • Resolved: {new Date(ticket.resolvedAt).toLocaleString("en-US")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

