"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AdminOrder,
  ExcessInfo,
  ExcessReturnType,
  PaymentEventItem,
  ReconcileReport,
  excessReturnApi,
  fetchPaymentDetailApi,
  paymentActionApi,
  processRefundApi,
  reconcilePaymentsApi,
} from "@/lib/adminService";

const vnd = (n?: number | null) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n || 0));
const when = (v?: string | null) => (v ? new Date(v).toLocaleString("vi-VN") : "—");

export const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Chờ thanh toán", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  VERIFYING: { label: "Đang xác minh", cls: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  PAID: { label: "Đã thanh toán", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  CANCELLED: { label: "Đã hủy", cls: "bg-zinc-900 text-zinc-500 border-white/10" },
  EXPIRED: { label: "Hết hạn", cls: "bg-zinc-900 text-zinc-500 border-white/10" },
  FAILED: { label: "Thất bại", cls: "bg-red-500/10 text-red-300 border-red-500/20" },
  REFUNDED: { label: "Đã hoàn tiền", cls: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  VOIDED: { label: "Đơn trùng (trả lại)", cls: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20" },
};

const EXCESS_LABEL: Record<ExcessReturnType, string> = {
  DUPLICATE_ORDER: "Thu trùng (đơn lặp)",
  OVERPAID: "Thu thừa",
  PARTIAL_PAYMENT: "Thu thiếu – trả lại & đóng đơn",
};

export function StatusBadge({ order }: { order: AdminOrder }) {
  const st = STATUS_STYLE[order.status] || { label: order.status, cls: "bg-zinc-900 text-zinc-400 border-white/10" };
  const fulfil = order.status === "PAID" && order.fulfillmentStatus && !["DONE", "NONE"].includes(order.fulfillmentStatus);
  const refund = order.refund?.status && order.refund.status !== "NONE" && order.refund.status !== "COMPLETED";
  return (
    <div className="flex flex-col gap-1">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit ${st.cls}`}>{st.label}</span>
      {fulfil && <span className="text-[10px] text-orange-300">Cấp quyền: {order.fulfillmentStatus}</span>}
      {refund && <span className="text-[10px] text-indigo-300">Hoàn tiền: {order.refund?.status}</span>}
      {order.excessReturn?.status === "PENDING" && <span className="text-[10px] text-fuchsia-300">Chờ trả lại {vnd(order.excessReturn.amount)}</span>}
      {order.excessReturn?.status === "COMPLETED" && <span className="text-[10px] text-fuchsia-300">Đã trả lại {vnd(order.excessReturn.amount)}</span>}
      {order.needsReview && <span className="text-[10px] text-red-300 font-semibold">⚠ Cần kiểm tra</span>}
    </div>
  );
}

const btn = "px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 cursor-pointer";
const btnNeutral = `${btn} bg-zinc-900 border-white/10 text-white hover:bg-zinc-800`;
const btnGood = `${btn} bg-emerald-600/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-600/30`;
const btnBad = `${btn} bg-red-600/20 border-red-500/30 text-red-200 hover:bg-red-600/30`;

/** Order detail drawer: full trace + every admin payment action. */
export function PaymentOrderDrawer({ orderCode, onClose, onChanged }: { orderCode: number; onClose: () => void; onChanged: () => void }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [events, setEvents] = useState<PaymentEventItem[]>([]);
  const [excess, setExcess] = useState<ExcessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchPaymentDetailApi(orderCode);
    if (res.success && res.data) {
      setOrder(res.data.order);
      setEvents(res.data.events || []);
      setExcess(res.data.excess || null);
    } else {
      setMsg({ ok: false, text: res.message || "Không tải được đơn hàng" });
    }
    setLoading(false);
  }, [orderCode]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<{ success: boolean; message?: string }>) => {
    setBusy(true);
    setMsg(null);
    const res = await fn();
    setMsg({ ok: res.success, text: res.message || (res.success ? "Đã cập nhật" : "Thao tác thất bại") });
    setBusy(false);
    await load();
    onChanged();
  };

  const ask = (label: string, required = true) => {
    const v = window.prompt(label);
    if (v === null) return null;
    if (required && !v.trim()) { window.alert("Bắt buộc nhập"); return null; }
    return v.trim();
  };

  const o = order;
  const refund = o?.refund?.status || "NONE";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-zinc-950 border-l border-white/10 p-5 space-y-5 text-sm text-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Đơn #{orderCode}</h2>
          <button className={btnNeutral} onClick={onClose}>Đóng</button>
        </div>

        {msg && <div className={`rounded-lg px-3 py-2 text-xs border ${msg.ok ? "border-emerald-500/30 text-emerald-200" : "border-red-500/30 text-red-200"}`}>{msg.text}</div>}
        {loading && !o && <p className="text-zinc-400">Đang tải…</p>}

        {o && (
          <>
            {o.needsReview && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <b>Cần kiểm tra:</b> {o.reviewReason || "—"}
              </div>
            )}

            <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-zinc-500">Trạng thái</dt><dd><StatusBadge order={o} /></dd>
              <dt className="text-zinc-500">Khách hàng</dt><dd>{o.customer?.name || o.userName || o.userId} · {o.customer?.email || o.userEmail}</dd>
              <dt className="text-zinc-500">Sản phẩm</dt><dd>{o.orderType} · {o.productTitle || o.templateTitle || o.planId?.toUpperCase()} {o.orderType === "SUBSCRIPTION" ? `(${o.months} tháng)` : ""}</dd>
              <dt className="text-zinc-500">Giá gốc / giảm / thu</dt><dd>{vnd((o as any).subtotal ?? o.amount)} / −{vnd(o.discount)} {o.promoCode ? `(${o.promoCode})` : ""} / <b>{vnd(o.amount)}</b></dd>
              <dt className="text-zinc-500">Chia doanh thu</dt><dd>Admin {vnd(o.adminRevenue)} · Creator {vnd(o.creatorEarnings)}</dd>
              <dt className="text-zinc-500">Cổng / chế độ</dt><dd>{o.paymentMode || "—"} · payOS: {o.gatewayStatus || "—"}</dd>
              <dt className="text-zinc-500">Tạo / hết hạn</dt><dd>{when(o.createdAt)} → {when(o.expiresAt)}</dd>
              <dt className="text-zinc-500">Thanh toán</dt><dd>{when(o.paidAt)} · nhận {o.paidAmount != null ? vnd(o.paidAmount) : "—"} · mã GD {o.gatewayReference || "—"}</dd>
              <dt className="text-zinc-500">Cấp quyền</dt><dd>{o.fulfillmentStatus} ({o.fulfillmentAttempts || 0} lần){o.fulfillmentError ? ` – ${o.fulfillmentError}` : ""}</dd>
              {o.cancelReason && <><dt className="text-zinc-500">Lý do đóng</dt><dd>{o.cancelReason}</dd></>}
              {refund !== "NONE" && (
                <>
                  <dt className="text-zinc-500">Hoàn tiền</dt>
                  <dd>
                    {refund} · {vnd(o.refund?.amount)} · lý do: {o.refund?.reason || "—"}
                    {o.refund?.adminNote ? ` · ghi chú: ${o.refund.adminNote}` : ""}
                    {o.refund?.reference ? ` · mã GD hoàn ${o.refund.reference}` : ""}
                  </dd>
                </>
              )}
            </dl>

            <div className="flex flex-wrap gap-2">
              {["PENDING", "VERIFYING", "EXPIRED", "CANCELLED", "FAILED"].includes(o.status) && (
                <button className={btnNeutral} disabled={busy} onClick={() => run(() => paymentActionApi(o.orderCode, "verify"))}>Xác minh với payOS</button>
              )}
              {o.status === "PAID" && ["PENDING", "FAILED"].includes(o.fulfillmentStatus || "") && (
                <button className={btnGood} disabled={busy} onClick={() => run(() => paymentActionApi(o.orderCode, "retry-fulfillment"))}>Cấp quyền lại</button>
              )}
              {["PENDING", "VERIFYING", "EXPIRED", "CANCELLED", "FAILED"].includes(o.status) && (
                <button className={btnGood} disabled={busy} onClick={() => {
                  const reference = ask("Mã giao dịch ngân hàng đã đối chiếu (bắt buộc):");
                  if (!reference) return;
                  const note = ask("Ghi chú đối soát (bắt buộc, ví dụ: sao kê VCB ngày ...):");
                  if (!note) return;
                  if (!window.confirm(`Xác nhận đơn #${o.orderCode} ĐÃ THANH TOÁN ${vnd(o.amount)} và cấp quyền cho khách?`)) return;
                  run(() => paymentActionApi(o.orderCode, "mark-paid", { reference, note }));
                }}>Xác nhận đã thanh toán (thủ công)</button>
              )}
              {["PENDING", "VERIFYING"].includes(o.status) && (
                <button className={btnBad} disabled={busy} onClick={() => {
                  const note = ask("Lý do hủy đơn (hệ thống sẽ kiểm tra payOS trước khi hủy):");
                  if (note) run(() => paymentActionApi(o.orderCode, "cancel", { note }));
                }}>Hủy đơn</button>
              )}
              {o.needsReview && (
                <button className={btnNeutral} disabled={busy} onClick={() => {
                  const note = ask("Đã xử lý thế nào?");
                  if (note) run(() => paymentActionApi(o.orderCode, "resolve-review", { note }));
                }}>Đánh dấu đã kiểm tra</button>
              )}
            </div>

            {((excess && excess.options.length > 0) || (o.excessReturn && o.excessReturn.status !== "NONE")) && (
              <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 space-y-2 text-xs">
                <p className="font-semibold text-fuchsia-200">Trả lại tiền thu trùng / thừa (không phải hoàn tiền – áp dụng cả sản phẩm số)</p>
                {excess?.received && (
                  <p className="text-zinc-400">
                    Khách đã trả: <b className="text-white">{vnd(excess.received.total)}</b> (nguồn: {excess.received.source}
                    {excess.received.gateway != null ? `, payOS ${vnd(excess.received.gateway)}` : ""}
                    {excess.received.gatewayError ? `, lỗi payOS: ${excess.received.gatewayError}` : ""}) · giá đơn {vnd(o.amount)}
                  </p>
                )}
                {(o.extraTransactions || []).length > 0 && (
                  <p className="text-zinc-400">Giao dịch phát sinh thêm: {(o.extraTransactions || []).map((t) => `${t.reference} (${vnd(t.amount)})`).join(", ")}</p>
                )}

                {o.excessReturn && o.excessReturn.status !== "NONE" && (
                  <p className="text-zinc-300">
                    {o.excessReturn.type ? EXCESS_LABEL[o.excessReturn.type as ExcessReturnType] : ""} · <b>{o.excessReturn.status}</b> · {vnd(o.excessReturn.amount)}
                    {o.excessReturn.keepOrderCode ? ` · giữ quyền ở đơn #${o.excessReturn.keepOrderCode}` : ""}
                    {o.excessReturn.reference ? ` · mã GD ${o.excessReturn.reference}` : ""}
                    {o.excessReturn.reason ? <><br /><span className="text-zinc-500">{o.excessReturn.reason}</span></> : null}
                    {o.excessReturn.note ? <><br /><span className="text-zinc-500">Ghi chú: {o.excessReturn.note}</span></> : null}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {o.excessReturn?.status !== "PENDING" && o.excessReturn?.status !== "COMPLETED" && excess?.options.map((opt) => (
                    <button key={opt.type} className={btnGood} disabled={busy} title={opt.reason} onClick={() => {
                      const raw = window.prompt(`${EXCESS_LABEL[opt.type]}\n${opt.reason}\n\nSố tiền trả lại (tối đa ${vnd(opt.amount)}):`, String(opt.amount));
                      if (raw === null) return;
                      const amount = Number(raw.replace(/[^\d]/g, ""));
                      const note = ask("Ghi chú (tùy chọn):", false) ?? "";
                      const warn = opt.type === "DUPLICATE_ORDER"
                        ? `\n\nĐơn này sẽ chuyển VOIDED: không tính doanh thu, không tính phần Creator. Quyền sử dụng giữ ở đơn #${opt.keepOrderCode}.`
                        : opt.type === "PARTIAL_PAYMENT" ? "\n\nLink payOS sẽ bị đóng và đơn bị hủy." : "";
                      if (!window.confirm(`Mở trả lại ${vnd(amount)} cho khách?${warn}`)) return;
                      run(() => excessReturnApi(o.orderCode, { action: "CREATE", type: opt.type, amount, note }));
                    }}>{EXCESS_LABEL[opt.type]}: {vnd(opt.amount)}</button>
                  ))}
                  {o.excessReturn?.status === "PENDING" && (
                    <>
                      <button className={btnGood} disabled={busy} onClick={() => {
                        const reference = ask(`Mã giao dịch đã chuyển trả ${vnd(o.excessReturn?.amount)}:`);
                        if (!reference) return;
                        const proof = ask("Link ảnh chứng từ (tùy chọn):", false) || "";
                        run(() => excessReturnApi(o.orderCode, { action: "COMPLETE", reference, proof }));
                      }}>Ghi nhận đã chuyển trả</button>
                      {o.excessReturn.type !== "PARTIAL_PAYMENT" && (
                        <button className={btnBad} disabled={busy} onClick={() => {
                          const note = ask("Lý do hủy (mở nhầm):");
                          if (note) run(() => excessReturnApi(o.orderCode, { action: "CANCEL", note }));
                        }}>Hủy (mở nhầm)</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {o.status === "PAID" && o.orderType && o.orderType !== "SUBSCRIPTION" && (
              <div className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
                Sản phẩm số (Template / UI Marketplace) không áp dụng hoàn tiền theo chính sách.
                {refund === "REQUESTED" && (
                  <button className={`${btnBad} ml-2`} disabled={busy} onClick={() => {
                    const note = ask("Lý do từ chối (gửi cho khách):") || "Sản phẩm số không áp dụng hoàn tiền";
                    run(() => processRefundApi(o.orderCode, { action: "REJECT", note }));
                  }}>Từ chối yêu cầu cũ</button>
                )}
              </div>
            )}
            {o.status === "PAID" && (!o.orderType || o.orderType === "SUBSCRIPTION") && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-indigo-200">Hoàn tiền gói đăng ký (chuyển khoản thủ công – payOS không có API hoàn tiền)</p>
                <div className="flex flex-wrap gap-2">
                  {(refund === "REQUESTED" || refund === "NONE") && (
                    <button className={btnGood} disabled={busy} onClick={() => {
                      const note = ask(refund === "NONE" ? "Lý do Admin chủ động hoàn tiền:" : "Ghi chú duyệt (tùy chọn):", refund === "NONE");
                      if (note === null) return;
                      run(() => processRefundApi(o.orderCode, { action: "APPROVE", note }));
                    }}>{refund === "NONE" ? "Mở hoàn tiền" : "Duyệt hoàn tiền"}</button>
                  )}
                  {refund === "REQUESTED" && (
                    <button className={btnBad} disabled={busy} onClick={() => {
                      const note = ask("Lý do từ chối (gửi cho khách):");
                      if (note) run(() => processRefundApi(o.orderCode, { action: "REJECT", note }));
                    }}>Từ chối</button>
                  )}
                  {refund === "APPROVED" && (
                    <button className={btnGood} disabled={busy} onClick={() => {
                      const reference = ask(`Mã giao dịch đã chuyển hoàn ${vnd(o.refund?.amount || o.amount)}:`);
                      if (!reference) return;
                      const proof = ask("Link ảnh chứng từ (tùy chọn):", false) || "";
                      const revokeAccess = window.confirm("Rút ngắn hạn gói tương ứng số tháng đã hoàn? (OK = rút ngắn)");
                      run(() => processRefundApi(o.orderCode, { action: "COMPLETE", reference, proof, revokeAccess }));
                    }}>Ghi nhận đã hoàn tiền</button>
                  )}
                </div>
              </div>
            )}

            <section>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Lịch sử trạng thái</h3>
              <ol className="space-y-1 text-xs">
                {(o.statusHistory || []).map((h, i) => (
                  <li key={i} className="border-l border-white/10 pl-3">
                    <span className="text-zinc-500">{when(h.at)}</span> · <b className="text-white">{h.from ? `${h.from} → ` : ""}{h.to}</b>
                    <span className="text-zinc-500"> [{h.source}{h.actor?.name ? ` · ${h.actor.name}` : ""}]</span>
                    {h.note ? <div className="text-zinc-400">{h.note}</div> : null}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Webhook / xác minh / thao tác ({events.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-zinc-500"><tr><th className="text-left p-1">Thời gian</th><th className="text-left p-1">Loại</th><th className="text-left p-1">Nguồn</th><th className="text-left p-1">Kết quả</th><th className="text-left p-1">Chi tiết</th></tr></thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e._id} className="border-t border-white/5">
                        <td className="p-1 whitespace-nowrap">{when(e.createdAt)}</td>
                        <td className="p-1">{e.type}</td>
                        <td className="p-1">{e.source}{e.actor?.name ? ` · ${e.actor.name}` : ""}</td>
                        <td className={`p-1 ${["ERROR", "REJECTED", "MISMATCH"].includes(e.result) ? "text-red-300" : "text-zinc-300"}`}>{e.result}{e.signatureValid === false ? " (sai chữ ký)" : ""}</td>
                        <td className="p-1 text-zinc-400">{[e.gatewayStatus, e.amount != null ? vnd(e.amount) : "", e.reference, e.message].filter(Boolean).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

const ISSUE_LABEL: Record<string, string> = {
  MISSED_PAYMENT: "payOS đã nhận tiền, hệ thống chưa ghi nhận",
  PAID_NOT_ON_GATEWAY: "PAID nội bộ nhưng payOS không xác nhận",
  AMOUNT_MISMATCH: "Lệch số tiền",
  MULTIPLE_TRANSACTIONS: "Nhiều giao dịch cho một đơn",
  REFERENCE_MISMATCH: "Lệch mã giao dịch",
  DUPLICATE_PURCHASE: "Khách trả nhiều lần cùng sản phẩm",
  FULFILLMENT_INCOMPLETE: "Đã trả tiền, chưa cấp quyền",
  EXPIRED_NOT_CLOSED: "Quá hạn chưa đóng",
  UNRESOLVED_VERIFYING: "Đang xác minh chưa có kết quả",
  NEEDS_REVIEW: "Cần Admin kiểm tra",
  REFUND_NOT_COMPLETED: "Hoàn tiền đã duyệt nhưng chưa chuyển",
  OVERPAID: "Khách chuyển thừa – cần trả lại",
  PARTIAL_PAYMENT: "Khách chuyển thiếu – bổ sung hoặc trả lại",
  EXCESS_RETURN_NOT_COMPLETED: "Đã mở trả lại tiền nhưng chưa chuyển",
  PAID_WITHOUT_REFERENCE: "PAID không có mã giao dịch",
  GATEWAY_UNREACHABLE: "Không tra được payOS",
};

/** Reconciliation of local orders against payOS for a date range. */
export function ReconcilePanel({ onOpenOrder, onChanged }: { onOpenOrder: (code: number) => void; onChanged: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [autoFix, setAutoFix] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [error, setError] = useState("");

  const runReconcile = async () => {
    setBusy(true);
    setError("");
    const res = await reconcilePaymentsApi({ from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59`).toISOString(), autoFix });
    if (res.success && res.data) {
      setReport(res.data);
      if (autoFix) onChanged();
    } else setError(res.message || "Đối soát thất bại");
    setBusy(false);
  };

  const t = report?.summary.totals || {};
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 text-sm text-zinc-200">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Đối soát với payOS</h2>
          <p className="text-[11px] text-zinc-500">So sánh đơn nội bộ với dữ liệu thực tế trên payOS (tối đa 31 ngày / 300 đơn mỗi lần).</p>
        </div>
        <label className="text-xs">Từ <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-1 bg-zinc-900 border border-white/10 rounded px-2 py-1" /></label>
        <label className="text-xs">Đến <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-1 bg-zinc-900 border border-white/10 rounded px-2 py-1" /></label>
        <label className="text-xs flex items-center gap-1.5" title="Tự ghi nhận thanh toán bị sót, đóng đơn quá hạn, cấp quyền lại. Sai lệch cần người xem (PAID không có trên payOS, lệch tiền) chỉ được báo cáo.">
          <input type="checkbox" checked={autoFix} onChange={(e) => setAutoFix(e.target.checked)} /> Tự sửa lỗi an toàn
        </label>
        <button className={btnGood} disabled={busy} onClick={runReconcile}>{busy ? "Đang đối soát…" : "Chạy đối soát"}</button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {report && (
        <>
          {!report.summary.gatewayEnabled && <p className="text-xs text-amber-300">payOS chưa cấu hình / đang ở chế độ mock: chỉ kiểm tra dữ liệu nội bộ.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg bg-zinc-900 p-2">Đơn kiểm tra<br /><b className="text-white">{report.summary.checkedOrders}</b> (payOS: {report.summary.gatewayChecked})</div>
            <div className="rounded-lg bg-zinc-900 p-2">Đã thu (gồm đã hoàn)<br /><b className="text-white">{vnd(t.paidAmount)}</b></div>
            <div className="rounded-lg bg-zinc-900 p-2">Đã hoàn<br /><b className="text-white">{vnd(t.refundedAmount)}</b> ({t.refundedCount || 0} đơn)</div>
            <div className="rounded-lg bg-zinc-900 p-2">Doanh thu Admin ròng<br /><b className="text-white">{vnd(t.netAdminRevenue)}</b></div>
          </div>
          {report.fixed.length > 0 && <p className="text-xs text-emerald-300">Đã tự sửa {report.fixed.length} đơn: {report.fixed.map((f) => `#${f.orderCode} ${f.action}→${f.result}`).join(", ")}</p>}
          {report.issues.length === 0 ? (
            <p className="text-xs text-emerald-300">Không phát hiện sai lệch.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="text-zinc-500"><tr><th className="text-left p-1">Đơn</th><th className="text-left p-1">Vấn đề</th><th className="text-left p-1">Chi tiết</th><th className="text-left p-1">Số tiền</th></tr></thead>
              <tbody>
                {report.issues.map((i, idx) => (
                  <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => onOpenOrder(i.orderCode)}>
                    <td className="p-1 font-mono text-white">#{i.orderCode}</td>
                    <td className="p-1 text-amber-200">{ISSUE_LABEL[i.code] || i.code}</td>
                    <td className="p-1 text-zinc-400">{i.message}</td>
                    <td className="p-1">{vnd(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
