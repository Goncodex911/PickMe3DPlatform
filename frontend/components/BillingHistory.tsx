"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrderInfo, fetchOrders, formatVnd } from "@/lib/paymentService";
import s from "@/app/settings/settings.module.css";

function orderDate(value: string | null) {
  if (!value) return "Ngày chưa xác định";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Ngày chưa xác định" : date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: OrderInfo["status"]) {
  if (status === "PAID") return "Đã thanh toán";
  if (status === "CANCELLED") return "Đã hủy";
  return "Đang chờ";
}

export default function BillingHistory() {
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchOrders()
      .then((rows) => { if (active) setOrders(rows); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử thanh toán."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  return (
    <section className={s.card} aria-labelledby="billing-title">
      <div className={s.billingHead}>
        <header className={s.cardHeader}>
          <div className={s.headingGroup}>
            <span className={s.iconTile} aria-hidden="true">
              <span className="material-symbols-rounded">receipt_long</span>
            </span>
            <div className={s.headingCopy}>
              <h1 id="billing-title">Biên lai</h1>
              <p>Đơn hàng và chứng từ thanh toán.</p>
            </div>
          </div>
        </header>
        <div className={s.billingActions}>
          <Link className={s.buttonLink} href="/pricing/">
            <span className="material-symbols-rounded" aria-hidden="true">sell</span>
            Mã giảm giá
          </Link>
          <button type="button" aria-label="Tải lại lịch sử thanh toán" onClick={() => setRetry((value) => value + 1)} disabled={loading}>
            <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className={s.loadingRows} role="status" aria-label="Đang tải biên lai">
          <div className={s.skeletonRow} />
          <div className={s.skeletonRow} />
        </div>
      )}

      {error && (
        <div className={s.emptyState} role="alert">
          <span className={s.iconTile} aria-hidden="true"><span className="material-symbols-rounded">cloud_off</span></span>
          <h3>Chưa tải được biên lai</h3>
          <p>{error}</p>
          <button type="button" className={s.primary} onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className={s.emptyState}>
          <span className={s.iconTile} aria-hidden="true"><span className="material-symbols-rounded">receipt</span></span>
          <h3>Chưa có thanh toán</h3>
          <p>Biên lai sẽ xuất hiện tại đây sau khi bạn nâng cấp gói.</p>
          <Link className={s.buttonLink} href="/pricing/">Xem các gói</Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className={s.orderList}>
          {orders.map((order) => {
            const paid = order.status === "PAID";
            const cancelled = order.status === "CANCELLED";
            return (
              <article className={s.orderCard} key={order.orderCode}>
                <div className={s.orderMain}>
                  <strong className={s.orderTitle}>Gói {order.planId.toUpperCase()} · {order.months} tháng</strong>
                  <span className={s.orderAmount}>{formatVnd(order.amount)}</span>
                  <time className={s.orderDate} dateTime={order.createdAt || undefined}>{orderDate(order.paidAt || order.createdAt)}</time>
                  <div className={s.orderDetails}>
                    <span>Đơn #{order.orderCode}</span>
                    <span className={s.orderStatus} data-status={paid ? "paid" : cancelled ? "cancelled" : "pending"}>
                      {statusLabel(order.status)}
                    </span>
                    {order.discount > 0 && <span>Mã {order.promoCode}: −{formatVnd(order.discount)}</span>}
                  </div>
                </div>
                <div className={s.orderAction}>
                  {paid ? (
                    <Link className={s.buttonLink} href={`/payment/receipt/?orderCode=${order.orderCode}`}>
                      <span className="material-symbols-rounded" aria-hidden="true">download</span>
                      Biên lai / PDF
                    </Link>
                  ) : (
                    <Link className={s.buttonLink} href={`/payment/result/?orderCode=${order.orderCode}`}>
                      Kiểm tra đơn
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
