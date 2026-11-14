"use client";

import React, { useState } from "react";
import { createReportApi } from "@/lib/reportService";
import { uploadFileToCloudinary } from "@/lib/mediaUpload";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "template" | "review" | "creator" | "TEMPLATE" | "REVIEW" | "CREATOR" | string;
  targetId: string;
  targetTitle: string;
  targetUrl?: string;
  onSuccess?: () => void;
}

const REASON_OPTIONS: Record<"template" | "review" | "creator", { value: string; label: string }[]> = {
  template: [
    { value: "copyright_infringement", label: "Copyright infringement or design plagiarism" },
    { value: "inappropriate_content", label: "Inappropriate, explicit, or violent content" },
    { value: "spam", label: "Spam or fraudulent template" },
    { value: "bug_report", label: "Broken template or 3D loading issue" },
    { value: "other", label: "Other" },
  ],
  review: [
    { value: "harassment", label: "Harassment or personal attacks" },
    { value: "inappropriate_content", label: "Hateful, obscene, or offensive language" },
    { value: "spam", label: "Spam or fake review" },
    { value: "other", label: "Other" },
  ],
  creator: [
    { value: "copyright_infringement", label: "Impersonation or repeated plagiarism" },
    { value: "harassment", label: "Scams or harassment of other users" },
    { value: "spam", label: "Fake account or mass spam" },
    { value: "other", label: "Other" },
  ],
};

const TARGET_LABELS: Record<"template" | "review" | "creator", string> = {
  template: "3D design",
  review: "User review",
  creator: "Creator account",
};

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetUrl,
  onSuccess,
}: ReportModalProps) {
  const normalizedTargetType = (targetType ? String(targetType).toLowerCase() : "template") as "template" | "review" | "creator";
  const options = REASON_OPTIONS[normalizedTargetType] || REASON_OPTIONS.template;
  const [reason, setReason] = useState(options[0].value);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Choose an image file (PNG, JPG, or WEBP).");
      return;
    }

    try {
      setUploadingImage(true);
      setErrorMsg("");
      const url = await uploadFileToCloudinary(file, "pickme3d/reports");
      setAttachments((prev) => [...prev, url]);
    } catch (err: any) {
      setErrorMsg("Couldn’t upload the evidence image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Add details about the issue or violation.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await createReportApi({
        ticketType: "REPORT",
        targetType: normalizedTargetType === "creator" ? "CREATOR" : normalizedTargetType,
        targetId,
        targetTitle,
        targetUrl,
        reason,
        description: description.trim(),
        attachments,
      });

      if (!res.success) {
        setErrorMsg("Couldn’t submit the report. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Your report has been sent to the moderation team.");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setDescription("");
        setAttachments([]);
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred while submitting the report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e1422] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-rounded text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <span className="material-symbols-rounded text-2xl">flag</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Report content</h3>
            <p className="text-xs text-slate-400">
              Target: <span className="text-amber-400 font-semibold">{TARGET_LABELS[normalizedTargetType] || "Content"}</span>
              {targetTitle && (
                <span className="text-slate-300 ml-1 truncate max-w-[260px] inline-block align-bottom font-medium">
                  ({targetTitle})
                </span>
              )}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-sm">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-sm">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for report <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting || !!successMsg}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-400 transition-colors"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Describe the issue <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include details that can help moderators review your report (original links, dates, or relevant context)."
              disabled={submitting || !!successMsg}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 transition-colors resize-none"
            />
          </div>

          {/* Screenshot / Evidence Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Attach evidence image (optional)</span>
              {uploadingImage && <span className="text-blue-400 text-[11px] animate-pulse">Uploading image...</span>}
            </label>

            {/* Thumbnail previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((url, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                    <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                    >
                      <span className="material-symbols-rounded text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 border border-dashed border-white/20 hover:border-white/40 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-xs text-slate-300">
              <span className="material-symbols-rounded text-base text-slate-400">add_photo_alternate</span>
              <span>Upload a screenshot (PNG, JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImage || submitting || !!successMsg}
                className="hidden"
              />
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim() || !!successMsg}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/30 transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-sm">send</span>
                  <span>Submit report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

