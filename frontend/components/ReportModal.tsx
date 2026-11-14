"use client";

import React, { useState } from "react";
import { createReportApi } from "@/lib/reportService";
import { uploadFileToCloudinary } from "@/lib/mediaUpload";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "template" | "review" | "creator";
  targetId: string;
  targetTitle: string;
  onSuccess?: () => void;
}

const REASON_OPTIONS: Record<"template" | "review" | "creator", { value: string; label: string }[]> = {
  template: [
    { value: "copyright_infringement", label: "Vi phạm bản quyền / Đạo nhái thiết kế" },
    { value: "inappropriate_content", label: "Nội dung phản cảm, đồi trụy hoặc bạo lực" },
    { value: "spam", label: "Spam / Mẫu quảng cáo giả mạo" },
    { value: "bug_report", label: "Mẫu hỏng nặng / Lỗi không load được 3D" },
    { value: "other", label: "Lý do khác" },
  ],
  review: [
    { value: "harassment", label: "Quấy rối / Công kích xúc phạm cá nhân" },
    { value: "inappropriate_content", label: "Ngôn từ thù ghét, tục tĩu hoặc phản cảm" },
    { value: "spam", label: "Spam / Đánh giá giả mạo hoặc phá hoại" },
    { value: "other", label: "Lý do khác" },
  ],
  creator: [
    { value: "copyright_infringement", label: "Mạo danh tác giả / Đạo nhái có hệ thống" },
    { value: "harassment", label: "Hành vi lừa đảo / Quấy rối người dùng khác" },
    { value: "spam", label: "Tài khoản giả mạo / Spam hàng loạt" },
    { value: "other", label: "Lý do khác" },
  ],
};

const TARGET_LABELS: Record<"template" | "review" | "creator", string> = {
  template: "Mẫu thiết kế 3D",
  review: "Đánh giá của người dùng",
  creator: "Tài khoản Creator",
};

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}: ReportModalProps) {
  const options = REASON_OPTIONS[targetType] || REASON_OPTIONS.template;
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
      setErrorMsg("Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP)");
      return;
    }

    try {
      setUploadingImage(true);
      setErrorMsg("");
      const url = await uploadFileToCloudinary(file, "pickme3d/reports");
      setAttachments((prev) => [...prev, url]);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể tải lên ảnh bằng chứng");
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
      setErrorMsg("Vui lòng nhập mô tả chi tiết sự cố hoặc hành vi vi phạm");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await createReportApi({
        ticketType: "REPORT",
        targetType,
        targetId,
        targetTitle,
        reason,
        description: description.trim(),
        attachments,
      });

      if (!res.success) {
        setErrorMsg(res.message || "Gửi báo cáo không thành công");
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Báo cáo vi phạm của bạn đã được gửi đến Ban Quản Trị để kiểm duyệt.");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setDescription("");
        setAttachments([]);
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi không xác định khi gửi báo cáo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
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
            <h3 className="text-lg font-bold text-white">Báo cáo vi phạm</h3>
            <p className="text-xs text-slate-400">
              Đối tượng: <span className="text-amber-400 font-semibold">{TARGET_LABELS[targetType]}</span>
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
              Lý do báo cáo vi phạm <span className="text-red-400">*</span>
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
              Mô tả chi tiết bằng chứng vi phạm <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp các chi tiết cụ thể để Admin dễ dàng xác minh (đường link gốc vi phạm, thời điểm, nội dung công kích...)"
              disabled={submitting || !!successMsg}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 transition-colors resize-none"
            />
          </div>

          {/* Screenshot / Evidence Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Đính kèm ảnh bằng chứng (Tùy chọn)</span>
              {uploadingImage && <span className="text-blue-400 text-[11px] animate-pulse">Đang tải ảnh lên...</span>}
            </label>

            {/* Thumbnail previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((url, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                    <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
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
              <span>Tải ảnh chụp màn hình bằng chứng (PNG, JPG)</span>
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
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim() || !!successMsg}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/30 transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-sm">send</span>
                  <span>Gửi báo cáo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

