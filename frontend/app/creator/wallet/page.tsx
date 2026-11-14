"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchCreatorWalletSummaryApi,
  requestPayoutApi,
  updateSavedBankInfoApi,
  CreatorWalletSummary,
  BankInfo,
} from "@/lib/payoutService";

export default function CreatorWalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<CreatorWalletSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"payouts" | "earnings" | "bank">("payouts");
  const [errorMsg, setErrorMsg] = useState("");

  // Payout Request Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number | "">("");
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [saveBankInfo, setSaveBankInfo] = useState(true);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutModalError, setPayoutModalError] = useState("");
  const [payoutModalSuccess, setPayoutModalSuccess] = useState("");

  // Bank Info Update Tab State
  const [editBankInfo, setEditBankInfo] = useState<BankInfo>({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [savingBankInfo, setSavingBankInfo] = useState(false);
  const [bankUpdateMsg, setBankUpdateMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const loadWallet = async () => {
    setLoading(true);
    setErrorMsg("");
    const res = await fetchCreatorWalletSummaryApi();
    if (res.success && res.data) {
      setWalletData(res.data);
      if (res.data.savedBankInfo) {
        setBankInfo(res.data.savedBankInfo);
        setEditBankInfo(res.data.savedBankInfo);
      }
    } else {
      setErrorMsg(res.message || "Không thể tải dữ liệu ví Creator. Vui lòng đăng nhập.");
    }
    setLoading(false);
  };

  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("pickme3d_user") : null;
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role === "admin") {
          router.replace("/admin/payouts");
          return;
        }
      }
    } catch {}
    loadWallet();
  }, [router]);

  const handleOpenPayoutModal = () => {
    setPayoutModalError("");
    setPayoutModalSuccess("");
    setPayoutAmount("");
    if (walletData?.savedBankInfo?.accountNumber) {
      setBankInfo(walletData.savedBankInfo);
    }
    setIsPayoutModalOpen(true);
  };

  const handleSetQuickAmount = (ratio: number) => {
    if (!walletData?.metrics.availableBalance) return;
    const calculated = Math.floor(walletData.metrics.availableBalance * ratio);
    setPayoutAmount(Math.max(0, calculated));
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(payoutAmount);

    if (!amountNum || amountNum < 10000) {
      setPayoutModalError("Số tiền rút tối thiểu là 10.000 VNĐ");
      return;
    }

    if (amountNum > (walletData?.metrics.availableBalance || 0)) {
      setPayoutModalError("Số tiền rút không thể vượt quá Số dư khả dụng hiện có");
      return;
    }

    if (!bankInfo.bankName.trim() || !bankInfo.accountNumber.trim() || !bankInfo.accountHolder.trim()) {
      setPayoutModalError("Vui lòng điền đầy đủ thông tin tài khoản ngân hàng nhận tiền");
      return;
    }

    try {
      setSubmittingPayout(true);
      setPayoutModalError("");

      const res = await requestPayoutApi({
        amount: amountNum,
        bankInfo: {
          bankName: bankInfo.bankName.trim(),
          accountNumber: bankInfo.accountNumber.trim(),
          accountHolder: bankInfo.accountHolder.trim().toUpperCase(),
        },
        saveBankInfo,
      });

      if (!res.success) {
        setPayoutModalError(res.message || "Gửi yêu cầu rút tiền thất bại");
        setSubmittingPayout(false);
        return;
      }

      setPayoutModalSuccess("Yêu cầu rút tiền đã được tạo thành công và đang chờ Admin duyệt!");
      setTimeout(() => {
        setIsPayoutModalOpen(false);
        setPayoutModalSuccess("");
        loadWallet();
      }, 1800);
    } catch (err: any) {
      setPayoutModalError(err?.message || "Lỗi kết nối khi gửi yêu cầu rút tiền");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBankInfo.bankName.trim() || !editBankInfo.accountNumber.trim() || !editBankInfo.accountHolder.trim()) {
      setBankUpdateMsg({ text: "Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và tên chủ sở hữu", error: true });
      return;
    }

    try {
      setSavingBankInfo(true);
      setBankUpdateMsg(null);
      const res = await updateSavedBankInfoApi(editBankInfo);
      if (res.success && res.data) {
        setBankUpdateMsg({ text: "Đã cập nhật thông tin tài khoản ngân hàng thành công!" });
        setBankInfo(res.data);
        if (walletData) {
          setWalletData({ ...walletData, savedBankInfo: res.data });
        }
      } else {
        setBankUpdateMsg({ text: res.message || "Lưu thông tin thất bại", error: true });
      }
    } catch (err: any) {
      setBankUpdateMsg({ text: err?.message || "Lỗi kết nối", error: true });
    } finally {
      setSavingBankInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">Đang tải dữ liệu Ví Creator & Thu nhập...</p>
      </div>
    );
  }

  const metrics = walletData?.metrics || {
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayout: 0,
    paidPayout: 0,
    rejectedPayout: 0,
    salesEarnings: 0,
    seededBalance: 0,
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      {/* Header bar */}
      <div className="border-b border-white/10 bg-[#0a0e17] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span>Khám phá</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-slate-200 font-bold">Ví Creator & Doanh thu</span>
        </div>

        <button
          onClick={handleOpenPayoutModal}
          disabled={metrics.availableBalance < 10000}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-base">payments</span>
          <span>Yêu cầu rút tiền</span>
        </button>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-base">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Earnings */}
          <div className="p-5 rounded-2xl bg-[#0e1422] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Tổng thu nhập</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-rounded text-lg">monetization_on</span>
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {metrics.totalEarnings.toLocaleString("vi-VN")}₫
            </div>
            <p className="text-[11px] text-slate-500 mt-1">70% doanh thu bán mẫu thiết kế</p>
          </div>

          {/* Available Balance */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0e1422] to-[#0e1422] border border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold">Số dư khả dụng</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <span className="material-symbols-rounded text-lg">account_balance_wallet</span>
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight">
              {metrics.availableBalance.toLocaleString("vi-VN")}₫
            </div>
            <p className="text-[11px] text-emerald-400/70 mt-1">Sẵn sàng để rút về tài khoản ngân hàng</p>
          </div>

          {/* Pending Payout */}
          <div className="p-5 rounded-2xl bg-[#0e1422] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Đang chờ giải ngân</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <span className="material-symbols-rounded text-lg">hourglass_top</span>
              </div>
            </div>
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              {metrics.pendingPayout.toLocaleString("vi-VN")}₫
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Lệnh rút tiền đang được Admin xét duyệt</p>
          </div>

          {/* Paid Out */}
          <div className="p-5 rounded-2xl bg-[#0e1422] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-colors" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Đã thanh toán</span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <span className="material-symbols-rounded text-lg">check_circle</span>
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {metrics.paidPayout.toLocaleString("vi-VN")}₫
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Đã chuyển thành công về ngân hàng</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "payouts"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-rounded text-sm">history</span>
            <span>Lịch sử rút tiền ({walletData?.payoutHistory?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("earnings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "earnings"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-rounded text-sm">trending_up</span>
            <span>Doanh số bán mẫu ({walletData?.earningsHistory?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "bank"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-rounded text-sm">account_balance</span>
            <span>Tài khoản ngân hàng</span>
          </button>
        </div>

        {/* Tab Content 1: Payout Requests History */}
        {activeTab === "payouts" && (
          <div className="rounded-2xl bg-[#0e1422] border border-white/10 overflow-hidden">
            {walletData?.payoutHistory && walletData.payoutHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Mã / Ngày tạo</th>
                      <th className="px-5 py-3.5">Số tiền yêu cầu</th>
                      <th className="px-5 py-3.5">Ngân hàng thụ hưởng</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5">Ghi chú từ Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {walletData.payoutHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono text-slate-300 font-medium">{item._id.slice(-8).toUpperCase()}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-white text-sm">
                          {item.amount.toLocaleString("vi-VN")}₫
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-200">{item.bankInfo?.bankName}</div>
                          <div className="font-mono text-slate-400 text-[11px]">
                            {item.bankInfo?.accountNumber} • {item.bankInfo?.accountHolder}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {item.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Chờ duyệt
                            </span>
                          )}
                          {item.status === "PAID" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Đã giải ngân
                            </span>
                          )}
                          {item.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Từ chối
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-300 text-xs">
                          {item.adminNote ? (
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300">
                              {item.adminNote}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Không có ghi chú</span>
                          )}
                          {item.paymentProof && (
                            <div className="mt-2">
                              <a
                                href={item.paymentProof}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                              >
                                <span className="material-symbols-rounded text-sm">receipt_long</span>
                                <span>Xem bill chuyển khoản</span>
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <span className="material-symbols-rounded text-4xl text-slate-600 block mb-2">payments</span>
                <p className="text-xs text-slate-400">Bạn chưa có yêu cầu rút tiền nào.</p>
                <button
                  onClick={handleOpenPayoutModal}
                  disabled={metrics.availableBalance < 10000}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition-all"
                >
                  Tạo yêu cầu rút tiền đầu tiên
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Template Sales Earnings History */}
        {activeTab === "earnings" && (
          <div className="rounded-2xl bg-[#0e1422] border border-white/10 overflow-hidden">
            {walletData?.earningsHistory && walletData.earningsHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Mẫu thiết kế</th>
                      <th className="px-5 py-3.5">Mã đơn hàng</th>
                      <th className="px-5 py-3.5">Người mua</th>
                      <th className="px-5 py-3.5">Giá bán</th>
                      <th className="px-5 py-3.5">Hoa hồng Creator (70%)</th>
                      <th className="px-5 py-3.5">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {walletData.earningsHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {item.templateThumbnail ? (
                              <img
                                src={item.templateThumbnail}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-rounded text-lg">view_in_ar</span>
                              </div>
                            )}
                            <div className="font-semibold text-white truncate max-w-xs">{item.templateTitle}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">#{item.orderCode}</td>
                        <td className="px-5 py-3.5 text-slate-300">{item.buyerName}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-300">
                          {item.amount.toLocaleString("vi-VN")}₫
                        </td>
                        <td className="px-5 py-3.5 font-bold text-emerald-400 text-sm">
                          +{item.creatorEarnings.toLocaleString("vi-VN")}₫
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                          {new Date(item.paidAt).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <span className="material-symbols-rounded text-4xl text-slate-600 block mb-2">trending_up</span>
                <p className="text-xs text-slate-400">Bạn chưa có lượt mua mẫu thiết kế nào từ cộng đồng.</p>
                <Link
                  href="/editor"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  <span>Tạo và bán mẫu thiết kế mới</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Saved Bank Settings */}
        {activeTab === "bank" && (
          <div className="max-w-2xl bg-[#0e1422] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-rounded text-2xl">account_balance</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tài khoản ngân hàng nhận tiền</h3>
                <p className="text-xs text-slate-400">
                  Thông tin này sẽ tự động điền mỗi khi bạn thực hiện yêu cầu rút tiền
                </p>
              </div>
            </div>

            {bankUpdateMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  bankUpdateMsg.error
                    ? "bg-red-500/10 border border-red-500/30 text-red-300"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                <span className="material-symbols-rounded text-sm">
                  {bankUpdateMsg.error ? "error" : "check_circle"}
                </span>
                <span>{bankUpdateMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveBankDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên ngân hàng (Bank Name) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBankInfo.bankName}
                  onChange={(e) => setEditBankInfo({ ...editBankInfo, bankName: e.target.value })}
                  placeholder="Ví dụ: MB Bank, Vietcombank, Techcombank, TPBank"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số tài khoản (Account Number) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBankInfo.accountNumber}
                  onChange={(e) => setEditBankInfo({ ...editBankInfo, accountNumber: e.target.value })}
                  placeholder="Ví dụ: 098877665544"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên chủ tài khoản (Account Holder) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBankInfo.accountHolder}
                  onChange={(e) => setEditBankInfo({ ...editBankInfo, accountHolder: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: NGUYEN VAN A (Viết hoa không dấu)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBankInfo}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  {savingBankInfo ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-sm">save</span>
                      <span>Lưu thông tin ngân hàng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e1422] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-200">
            <button
              onClick={() => setIsPayoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-rounded text-xl">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-rounded text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Yêu cầu rút tiền về ngân hàng</h3>
                <p className="text-xs text-slate-400">
                  Số dư khả dụng:{" "}
                  <span className="text-emerald-400 font-bold">
                    {metrics.availableBalance.toLocaleString("vi-VN")}₫
                  </span>
                </p>
              </div>
            </div>

            {payoutModalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <span className="material-symbols-rounded text-sm">error</span>
                <span>{payoutModalError}</span>
              </div>
            )}

            {payoutModalSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-rounded text-sm">check_circle</span>
                <span>{payoutModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Số tiền muốn rút (VNĐ) <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Tối thiểu: 10.000₫</span>
                </div>
                <input
                  type="number"
                  min={10000}
                  max={metrics.availableBalance}
                  step={1000}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Nhập số tiền (VD: 500000)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-bold text-emerald-400 font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                />

                {/* Quick percentage buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { label: "25%", ratio: 0.25 },
                    { label: "50%", ratio: 0.5 },
                    { label: "75%", ratio: 0.75 },
                    { label: "Tất cả (100%)", ratio: 1 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleSetQuickAmount(btn.ratio)}
                      className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 transition-colors"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank details inputs */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-sm text-slate-400">account_balance</span>
                  <span>Tài khoản nhận tiền</span>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={bankInfo.bankName}
                    onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                    placeholder="Tên ngân hàng (VD: MB Bank, Techcombank, VCB)"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={bankInfo.accountNumber}
                    onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                    placeholder="Số tài khoản ngân hàng"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={bankInfo.accountHolder}
                    onChange={(e) => setBankInfo({ ...bankInfo, accountHolder: e.target.value.toUpperCase() })}
                    placeholder="Tên chủ tài khoản (Viết hoa không dấu)"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveBankInfo}
                    onChange={(e) => setSaveBankInfo(e.target.checked)}
                    className="rounded border-white/20 text-emerald-500 focus:ring-0"
                  />
                  <span>Lưu thông tin ngân hàng này cho các lần rút tiếp theo</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  disabled={submittingPayout}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout || !payoutAmount || Number(payoutAmount) < 10000 || !!payoutModalSuccess}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {submittingPayout ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang gửi yêu cầu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-sm">send</span>
                      <span>Xác nhận rút tiền</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

