"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  fetchAdminPayoutsApi,
  updatePayoutStatusApi,
  PayoutItem,
} from "@/lib/adminService";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({
    pendingCount: 0,
    paidCount: 0,
    rejectedCount: 0,
    totalPendingAmount: 0,
  });
  const [totalPages, setTotalPages] = useState(1);

  // Action Modal State
  const [activePayout, setActivePayout] = useState<PayoutItem | null>(null);
  const [actionType, setActionType] = useState<"PAID" | "REJECTED" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminPayoutsApi({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setPayouts(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          if (res.meta.summary) {
            setSummary(res.meta.summary);
          }
        }
      } else {
        setError(res.message || "Không thể tải danh sách yêu cầu rút tiền");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const openActionModal = (payout: PayoutItem, type: "PAID" | "REJECTED") => {
    setActivePayout(payout);
    setActionType(type);
    setAdminNote(
      type === "PAID"
        ? "Đã chuyển khoản thành công qua cổng thanh toán liên ngân hàng Napas 24/7."
        : "Thông tin thụ hưởng hoặc số tài khoản không hợp lệ, vui lòng kiểm tra lại."
    );
  };

  const closeModal = () => {
    setActivePayout(null);
    setActionType(null);
    setAdminNote("");
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayout || !actionType) return;

    setSubmitting(true);
    try {
      const res = await updatePayoutStatusApi(activePayout._id, {
        status: actionType,
        adminNote: adminNote.trim(),
      });

      if (res.success) {
        setToastMessage(
          actionType === "PAID"
            ? `Đã duyệt chi trả thành công cho ${activePayout.creatorName}!`
            : `Đã từ chối yêu cầu rút tiền của ${activePayout.creatorName}!`
        );
        setTimeout(() => setToastMessage(null), 4000);
        closeModal();
        loadPayouts();
      } else {
        alert("Lỗi: " + (res.message || "Không thể cập nhật trạng thái"));
      }
    } catch (err: any) {
      alert("Lỗi: " + (err.message || "Không thể xử lý yêu cầu"));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/90 text-white font-medium text-xs shadow-xl backdrop-blur-md animate-fade-in">
          <span className="material-symbols-rounded text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">
              PickMe3D Creator Economy
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Rule 2.1.B: 70% Creator Share
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Yêu Cầu Rút Tiền (Payouts)
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Xem xét và phê duyệt các lệnh rút hoa hồng bán template của Creator. Kiểm tra số dư và thông tin tài khoản ngân hàng trước khi xác nhận.
          </p>
        </div>

        <button
          onClick={() => loadPayouts()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-rounded text-base">refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Payouts */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              Đang Chờ Duyệt (Pending)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">hourglass_top</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary.pendingCount} <span className="text-xs font-normal text-zinc-500">lệnh</span>
          </div>
          <div className="mt-2 text-xs text-amber-400/90 font-mono">
            Tổng tiền: {formatCurrency(summary.totalPendingAmount)}
          </div>
        </div>

        {/* Paid */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              Đã Chi Trả (Paid)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">check_circle</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary.paidCount} <span className="text-xs font-normal text-zinc-500">lệnh</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Đã hoàn tất thanh toán cho Creator
          </div>
        </div>

        {/* Rejected */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
              Đã Từ Chối (Rejected)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">cancel</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary.rejectedCount} <span className="text-xs font-normal text-zinc-500">lệnh</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Thông tin sai lệch hoặc không đủ điều kiện
          </div>
        </div>

        {/* Revenue Share Rule Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400">
              Tỷ Lệ Chia Sẻ Chuẩn
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-base">pie_chart</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            70% <span className="text-xs font-normal text-zinc-500">Creator</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Admin giữ 30% phí nền tảng & hạ tầng
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/70 border border-white/5 overflow-x-auto">
          {[
            { id: "all", label: "Tất cả" },
            { id: "PENDING", label: "Chờ duyệt", count: summary.pendingCount },
            { id: "PAID", label: "Đã chi trả", count: summary.paidCount },
            { id: "REJECTED", label: "Bị từ chối", count: summary.rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? "bg-black/10 text-black font-semibold"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadPayouts();
          }}
          className="relative flex-1 max-w-md"
        >
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo Creator, Email, Số tài khoản..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white/30"
          />
        </form>
      </div>

      {/* Payouts Table */}
      <div className="rounded-2xl bg-zinc-900/50 border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
            Đang tải dữ liệu yêu cầu rút tiền...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Không có yêu cầu rút tiền nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Creator / Tác Giả</th>
                  <th className="py-3.5 px-4">Số Dư Hiện Có</th>
                  <th className="py-3.5 px-4">Số Tiền Rút</th>
                  <th className="py-3.5 px-4">Tài Khoản Thụ Hưởng</th>
                  <th className="py-3.5 px-4">Ngày Yêu Cầu</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payouts.map((payout) => {
                  const isPending = payout.status === "PENDING";
                  const isPaid = payout.status === "PAID";
                  const isRejected = payout.status === "REJECTED";

                  return (
                    <tr
                      key={payout._id}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Creator */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{payout.creatorName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{payout.creatorEmail}</div>
                      </td>

                      {/* Creator Balance */}
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        {formatCurrency(payout.creatorBalance)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-mono font-bold text-base text-emerald-400">
                        {formatCurrency(payout.amount)}
                      </td>

                      {/* Bank Info */}
                      <td className="py-4 px-4 text-xs">
                        <div className="font-medium text-white">{payout.bankInfo?.bankName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {payout.bankInfo?.accountNumber} • {payout.bankInfo?.accountHolder}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-[11px] text-zinc-400 font-mono">
                        {formatDate(payout.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Chờ duyệt
                          </span>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Đã chi trả
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Từ chối
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openActionModal(payout, "PAID")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-rounded text-sm">check</span>
                              <span>Duyệt chi trả</span>
                            </button>
                            <button
                              onClick={() => openActionModal(payout, "REJECTED")}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 border border-white/10 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-rounded text-sm">close</span>
                              <span>Từ chối</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-500 italic max-w-xs ml-auto truncate" title={payout.adminNote}>
                            {payout.adminNote || "Đã xử lý"}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Processing Modal */}
      {activePayout && actionType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span
                  className={`material-symbols-rounded ${
                    actionType === "PAID" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {actionType === "PAID" ? "check_circle" : "cancel"}
                </span>
                <span>
                  {actionType === "PAID" ? "Xác Nhận Chi Trả Creator" : "Từ Chối Yêu Cầu Rút Tiền"}
                </span>
              </h3>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Creator:</span>
                <span className="text-white font-semibold">{activePayout.creatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Số tiền rút:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {formatCurrency(activePayout.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Số dư hiện có:</span>
                <span className="text-zinc-300 font-mono">
                  {formatCurrency(activePayout.creatorBalance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Ngân hàng:</span>
                <span className="text-white">
                  {activePayout.bankInfo?.bankName} ({activePayout.bankInfo?.accountNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Chủ tài khoản:</span>
                <span className="text-white uppercase font-mono">
                  {activePayout.bankInfo?.accountHolder}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Ghi chú quản trị viên (Admin Note)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  placeholder="Nhập ghi chú hoặc mã giao dịch ngân hàng..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer shadow-md ${
                    actionType === "PAID"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  } disabled:opacity-50`}
                >
                  {submitting
                    ? "Đang lưu..."
                    : actionType === "PAID"
                    ? "Xác Nhận Đã Thanh Toán"
                    : "Xác Nhận Từ Chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

