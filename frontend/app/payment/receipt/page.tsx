"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, fetchReceipt, formatVnd, orderItemLabel } from "@/lib/paymentService";
import s from "./receipt.module.css";
export default function ReceiptPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const code = new URLSearchParams(window.location.search).get("orderCode");
    if (!code || !/^\d+$/.test(code)) { setError("Thiếu mã đơn hàng hợp lệ."); return; }
    fetchReceipt(code).then(value => { if (active) setReceipt(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  return <main className={s.page}>
    <div className={s.controls}><Link href="/settings/#billing"><span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>Lịch sử thanh toán</Link>{receipt && <button onClick={() => window.print()}><span className="material-symbols-rounded" aria-hidden="true">download</span>In / Lưu PDF</button>}</div>
    {error ? <p className={s.error} role="alert">{error}</p> : !receipt ? <p className={s.loading} role="status">Đang tải biên lai…</p> : <article className={s.receipt}>
      <header className={s.brandRow}>
        <div className={s.brand}>
          <span className="material-symbols-rounded" aria-hidden="true">deployed_code</span>
          <div><strong>PickMe3D</strong><small>CREATIVE PLATFORM</small></div>
        </div>
        <span className={s.documentLabel}>BIÊN LAI ĐIỆN TỬ</span>
      </header>
      <div className={s.successMark}><span className="material-symbols-rounded" aria-hidden="true">{receipt.status === "REFUNDED" ? "currency_exchange" : "check_circle"}</span>{receipt.status === "REFUNDED" ? "Đã hoàn tiền" : "Đã thanh toán"}</div>
      <h1>{receipt.status === "REFUNDED" ? "Giao dịch đã được hoàn tiền" : "Thanh toán thành công"}</h1><p className={s.receiptNumber}>Số biên lai <strong>{receipt.receiptNumber}</strong></p>
      <dl className={s.details}><dt>Khách hàng</dt><dd>{receipt.customer.name}</dd><dt>Email</dt><dd>{receipt.customer.email}</dd>
        <dt>Mã đơn hàng</dt><dd>{receipt.orderCode}</dd><dt>Ngày thanh toán</dt><dd>{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString("vi-VN") : "—"}</dd>
        <dt>{receipt.orderType && receipt.orderType !== "SUBSCRIPTION" ? "Sản phẩm" : "Gói dịch vụ"}</dt><dd>{orderItemLabel(receipt)}</dd>
        <dt>Tạm tính</dt><dd>{formatVnd(receipt.subtotal)}</dd>
        <dt>Giảm giá{receipt.promoCode ? ` (${receipt.promoCode})` : ""}</dt><dd>-{formatVnd(receipt.discount)}</dd>
        <dt>Tổng đã thanh toán</dt><dd><strong>{formatVnd(receipt.amount)}</strong></dd>
        {receipt.gatewayReference && <><dt>Mã giao dịch ngân hàng</dt><dd>{receipt.gatewayReference}</dd></>}
        {receipt.status === "REFUNDED" && receipt.refund && <>
          <dt>Đã hoàn</dt><dd><strong>{formatVnd(receipt.refund.amount || receipt.amount)}</strong></dd>
          <dt>Ngày hoàn</dt><dd>{receipt.refund.completedAt ? new Date(receipt.refund.completedAt).toLocaleString("vi-VN") : "—"}</dd>
          {receipt.refund.reference && <><dt>Mã GD hoàn tiền</dt><dd>{receipt.refund.reference}</dd></>}
        </>}
      </dl>
      <footer><span className="material-symbols-rounded" aria-hidden="true">verified_user</span><p>Biên lai xác nhận thanh toán dịch vụ PickMe3D. Đây không phải hóa đơn giá trị gia tăng.{receipt.orderType && receipt.orderType !== "SUBSCRIPTION" ? " Sản phẩm số không áp dụng hoàn tiền." : ""}</p></footer>
    </article>}
  </main>;
}
