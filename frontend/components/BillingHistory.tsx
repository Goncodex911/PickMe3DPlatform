"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DISPLAY_STATUS_LABEL,
  EXCESS_TYPE_LABEL,
  OrderInfo,
  cancelOrder,
  displayStatusOf,
  fetchOrders,
  historyLabel,
  requestRefund,
  type DisplayStatus,
} from "@/lib/paymentService";
import s from "./BillingHistory.module.css";

type Filter = "all" | "paid" | "open" | "closed";
type Tone = "ok" | "warn" | "bad" | "info" | "muted";

const PAID_STATES: DisplayStatus[] = ["COMPLETED", "PROCESSING", "REFUND_IN_PROGRESS"];
const OPEN_STATES: DisplayStatus[] = ["AWAITING_PAYMENT", "VERIFYING"];

const TONE: Record<DisplayStatus, Tone> = {
  COMPLETED: "ok",
  PROCESSING: "warn",
  AWAITING_PAYMENT: "warn",
  VERIFYING: "warn",
  REFUND_IN_PROGRESS: "info",
  REFUNDED: "info",
  VOIDED: "info",
  CANCELLED: "muted",
  EXPIRED: "muted",
  FAILED: "bad",
  UNKNOWN: "muted",
};

const REFUND_TEXT: Record<string, string> = {
  REQUESTED: "Đang chờ duyệt",
  APPROVED: "Đã duyệt – đang chuyển",
  REJECTED: "Bị từ chối",
  COMPLETED: "Đã hoàn",
};

const vnd = (n?: number | null) => `${new Intl.NumberFormat("vi-VN").format(Number(n || 0))} ₫`;

function shortDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fullDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Product name first, product type as metadata. */
function describe(order: OrderInfo) {
  if (order.orderType === "TEMPLATE_PURCHASE") {
    return { name: order.productTitle || "Template", type: "Template", icon: "dashboard_customize" };
  }
  if (order.orderType === "UI_PURCHASE") {
    return { name: order.productTitle || order.productId || "Sản phẩm UI", type: "UI Marketplace", icon: "widgets" };
  }
  const plan = (order.planId || "pro").toUpperCase();
  return { name: `Gói ${plan}`, type: `Gói đăng ký · ${order.months || 1} tháng`, icon: "workspace_premium" };
}

function bucket(d: DisplayStatus): Exclude<Filter, "all"> {
  if (PAID_STATES.includes(d)) return "paid";
  if (OPEN_STATES.includes(d)) return "open";
  return "closed";
}

export default function BillingHistory() {
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [openCode, setOpenCode] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);
  const [refundFor, setRefundFor] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("");

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

  const stats = useMemo(() => {
    let paid = 0, paidCount = 0, waiting = 0, returned = 0;
    for (const o of orders) {
      const d = displayStatusOf(o);
      if (o.status === "PAID") { paid += o.amount; paidCount += 1; }
      if (OPEN_STATES.includes(d) || d === "PROCESSING") waiting += 1;
      if (o.status === "REFUNDED") returned += o.refund?.amount || o.amount;
      if (o.excessReturn?.status === "COMPLETED") returned += o.excessReturn.amount;
    }
    return { paid, paidCount, waiting, returned };
  }, [orders]);

  const counts = useMemo(() => {
    const c = { all: orders.length, paid: 0, open: 0, closed: 0 };
    orders.forEach((o) => { c[bucket(displayStatusOf(o))] += 1; });
    return c;
  }, [orders]);

  const visible = filter === "all" ? orders : orders.filter((o) => bucket(displayStatusOf(o)) === filter);

  const replace = (updated: Partial<OrderInfo>) =>
    setOrders((rows) => rows.map((row) => (row.orderCode === updated.orderCode ? ({ ...row, ...updated } as OrderInfo) : row)));

  const onCancel = async (order: OrderInfo) => {
    if (!window.confirm(`Hủy đơn #${order.orderCode}? Bạn chưa bị trừ tiền.`)) return;
    setBusy(order.orderCode);
    setNotice(null);
    try {
      const res = await cancelOrder(order.orderCode);
      replace(res.data);
      setNotice({ text: res.message });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Không hủy được đơn", bad: true });
    } finally {
      setBusy(null);
    }
  };

  const onRefund = async (order: OrderInfo) => {
    setBusy(order.orderCode);
    setNotice(null);
    try {
      const res = await requestRefund(order.orderCode, refundReason.trim());
      replace(res.data);
      setNotice({ text: res.message });
      setRefundFor(null);
      setRefundReason("");
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Không gửi được yêu cầu hoàn tiền", bad: true });
    } finally {
      setBusy(null);
    }
  };

  const primaryAction = (order: OrderInfo, d: DisplayStatus) => {
    if (order.status === "PAID" || order.status === "REFUNDED") {
      return (
        <Link className={s.btn} href={`/payment/receipt/?orderCode=${order.orderCode}`}>
          <span className="material-symbols-rounded" aria-hidden="true">receipt_long</span>Biên lai
        </Link>
      );
    }
    if (d === "AWAITING_PAYMENT" && order.checkoutUrl) {
      return <a className={`${s.btn} ${s.btnPrimary}`} href={order.checkoutUrl}>Thanh toán</a>;
    }
    if (d === "VERIFYING" || d === "AWAITING_PAYMENT") {
      return <Link className={s.btn} href={`/payment/result/?orderCode=${order.orderCode}`}>Theo dõi</Link>;
    }
    return null;
  };

  return (
    <section className={s.root} aria-labelledby="billing-title">
      <header className={s.head}>
        <div>
          <h1 id="billing-title">Lịch sử thanh toán</h1>
          <p>Đơn hàng, trạng thái giao dịch và biên lai của bạn.</p>
        </div>
        <div className={s.headActions}>
          <Link className={s.btn} href="/pricing/">
            <span className="material-symbols-rounded" aria-hidden="true">workspace_premium</span>Xem gói
          </Link>
          <button type="button" className={`${s.btn} ${s.iconBtn}`} aria-label="Tải lại" title="Tải lại" onClick={() => setRetry((v) => v + 1)} disabled={loading}>
            <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
          </button>
        </div>
      </header>

      {!loading && !error && orders.length > 0 && (
        <div className={s.summary}>
          <div className={s.stat}>
            <div className={s.statLabel}>Đã thanh toán</div>
            <div className={s.statValue}>{vnd(stats.paid)}</div>
            <div className={s.statSub}>{stats.paidCount} đơn thành công</div>
          </div>
          <div className={s.stat}>
            <div className={s.statLabel}>Đang xử lý</div>
            <div className={s.statValue}>{stats.waiting}</div>
            <div className={s.statSub}>chờ thanh toán / xác minh / cấp quyền</div>
          </div>
          <div className={s.stat}>
            <div className={s.statLabel}>Đã hoàn / trả lại</div>
            <div className={s.statValue}>{stats.returned ? vnd(stats.returned) : "—"}</div>
            <div className={s.statSub}>hoàn gói và tiền thu trùng/thừa</div>
          </div>
        </div>
      )}

      {notice && (
        <div className={s.notice} data-tone={notice.bad ? "bad" : undefined} role="status">
          <span className="material-symbols-rounded" aria-hidden="true">{notice.bad ? "error" : "info"}</span>
          {notice.text}
        </div>
      )}

      {loading && (
        <div className={s.skeleton} role="status" aria-label="Đang tải lịch sử thanh toán"><div /><div /><div /></div>
      )}

      {error && (
        <div className={s.empty} role="alert">
          <span className={s.emptyIcon}><span className="material-symbols-rounded" aria-hidden="true">cloud_off</span></span>
          <h3>Chưa tải được lịch sử thanh toán</h3>
          <p>{error}</p>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className={s.empty}>
          <span className={s.emptyIcon}><span className="material-symbols-rounded" aria-hidden="true">receipt_long</span></span>
          <h3>Chưa có thanh toán nào</h3>
          <p>Đơn hàng và biên lai sẽ xuất hiện tại đây sau khi bạn nâng cấp gói hoặc mua Template / UI.</p>
          <Link className={`${s.btn} ${s.btnPrimary}`} href="/pricing/">Xem các gói</Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className={s.tabs} role="tablist" aria-label="Lọc đơn hàng">
            {([
              ["all", "Tất cả"],
              ["paid", "Đã thanh toán"],
              ["open", "Chờ xử lý"],
              ["closed", "Đã đóng"],
            ] as [Filter, string][]).map(([key, label]) => (
              <button key={key} type="button" role="tab" className={s.tab} aria-selected={filter === key} onClick={() => setFilter(key)}>
                {label}<span className={s.tabCount}>{counts[key]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className={s.empty}><p>Không có đơn nào trong mục này.</p></div>
          ) : (
            <ul className={s.list}>
              {visible.map((order) => {
                const d = displayStatusOf(order);
                const info = describe(order);
                const open = openCode === order.orderCode;
                const closed = ["CANCELLED", "EXPIRED", "FAILED"].includes(d);
                const isMock = order.paymentMode === "mock" || (order.gatewayReference || "").startsWith("MOCK-");
                const er = order.excessReturn && order.excessReturn.status !== "CANCELLED" ? order.excessReturn : null;
                const refundStatus = order.refund?.status || "NONE";
                return (
                  <li key={order.orderCode} className={s.row} data-open={open} data-closed={closed}>
                    <button
                      type="button"
                      className={s.rowMain}
                      aria-expanded={open}
                      aria-controls={`order-${order.orderCode}`}
                      onClick={() => { setOpenCode(open ? null : order.orderCode); setRefundFor(null); }}
                    >
                      <span className={s.typeIcon} data-type={order.orderType || "SUBSCRIPTION"} aria-hidden="true">
                        <span className="material-symbols-rounded">{info.icon}</span>
                      </span>
                      <span className={s.rowText}>
                        <span className={s.rowTitle}>{info.name}</span>
                        <span className={s.rowMeta}>{info.type} · {shortDate(order.paidAt || order.createdAt)}</span>
                      </span>
                      <span className={s.chip} data-tone={TONE[d]}>{DISPLAY_STATUS_LABEL[d]}</span>
                      <span className={s.rowAmount}>{vnd(order.amount)}</span>
                      <span className={`material-symbols-rounded ${s.chevron}`} aria-hidden="true">expand_more</span>
                    </button>
                    <div className={s.rowAction}>{primaryAction(order, d)}</div>

                    {open && (
                      <div className={s.detail} id={`order-${order.orderCode}`}>
                        <div>
                          <p className={s.sectionLabel}>Chi tiết</p>
                          <dl className={s.facts}>
                            <dt>Mã đơn</dt><dd className={s.mono}>#{order.orderCode}</dd>
                            <dt>Sản phẩm</dt><dd>{info.name} <span style={{ color: "var(--muted)" }}>({info.type})</span></dd>
                            {order.discount > 0 && <><dt>Giá gốc</dt><dd>{vnd(order.subtotal)}</dd></>}
                            {order.discount > 0 && <><dt>Giảm giá</dt><dd>−{vnd(order.discount)}{order.promoCode ? ` (${order.promoCode})` : ""}</dd></>}
                            <dt>Số tiền</dt><dd><b>{vnd(order.amount)}</b></dd>
                            <dt>Tạo lúc</dt><dd>{fullDate(order.createdAt)}</dd>
                            {order.paidAt && <><dt>Thanh toán lúc</dt><dd>{fullDate(order.paidAt)}</dd></>}
                            {d === "AWAITING_PAYMENT" && order.expiresAt && <><dt>Hết hạn lúc</dt><dd>{fullDate(order.expiresAt)}</dd></>}
                            {(order.gatewayReference || isMock) && (
                              <><dt>Mã giao dịch</dt><dd className={isMock ? undefined : s.mono}>{isMock ? "Thanh toán thử nghiệm" : order.gatewayReference}</dd></>
                            )}
                            {refundStatus !== "NONE" && (
                              <>
                                <dt>Hoàn tiền</dt>
                                <dd>
                                  {REFUND_TEXT[refundStatus]}
                                  {order.refund?.adminNote ? ` – ${order.refund.adminNote}` : ""}
                                  {order.refund?.reference ? ` (mã GD ${order.refund.reference})` : ""}
                                </dd>
                              </>
                            )}
                          </dl>
                        </div>

                        {order.statusHistory && order.statusHistory.length > 0 && (
                          <div>
                            <p className={s.sectionLabel}>Lịch sử trạng thái</p>
                            <ol className={s.timeline}>
                              {order.statusHistory.map((h, i) => (
                                <li key={i}>
                                  <span className={s.tlTitle}>{historyLabel(h.to)}</span>
                                  <span className={s.tlTime}>{fullDate(h.at)}</span>
                                  {h.note ? <div className={s.tlNote}>{h.note}</div> : null}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {er && (
                          <div className={s.policy} data-tone="info">
                            <span className="material-symbols-rounded" aria-hidden="true">currency_exchange</span>
                            <span>
                              {er.status === "COMPLETED" ? "Đã trả lại" : "Đang trả lại"} {vnd(er.amount)} do {EXCESS_TYPE_LABEL[er.type]}
                              {er.reference ? ` (mã GD ${er.reference})` : ""}.
                              {er.keepOrderCode ? ` Quyền sử dụng của bạn vẫn giữ nguyên qua đơn #${er.keepOrderCode}.` : ""}
                            </span>
                          </div>
                        )}
                        {d === "VERIFYING" && (
                          <div className={s.policy} data-tone="warn">
                            <span className="material-symbols-rounded" aria-hidden="true">hourglass_top</span>
                            <span>Chưa có kết quả cuối cùng từ ngân hàng. Nếu bạn đã chuyển tiền, đừng thanh toán lại – hệ thống đang tự xác minh.</span>
                          </div>
                        )}
                        {(order.status === "PAID" || order.status === "REFUNDED") && (
                          <div className={s.policy}>
                            <span className="material-symbols-rounded" aria-hidden="true">policy</span>
                            <span>
                              {order.refundable === false
                                ? "Sản phẩm số không áp dụng hoàn tiền sau khi thanh toán."
                                : order.refundEligible
                                  ? "Gói đăng ký có thể yêu cầu hoàn tiền trong thời hạn quy định."
                                  : "Đơn này không còn trong thời hạn hoặc điều kiện hoàn tiền."}
                            </span>
                          </div>
                        )}

                        {refundFor === order.orderCode && (
                          <form className={s.refundForm} onSubmit={(e) => { e.preventDefault(); onRefund(order); }}>
                            <label htmlFor={`refund-${order.orderCode}`}>Lý do yêu cầu hoàn tiền</label>
                            <textarea
                              id={`refund-${order.orderCode}`}
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="Mô tả ngắn lý do (tối thiểu 10 ký tự)"
                              maxLength={1000}
                            />
                            <span className={s.refundHint}>Admin sẽ xem xét và phản hồi qua thông báo. Khi hoàn tiền, thời hạn gói được rút ngắn tương ứng.</span>
                            <div className={s.detailActions}>
                              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy === order.orderCode || refundReason.trim().length < 10}>
                                {busy === order.orderCode ? "Đang gửi…" : "Gửi yêu cầu"}
                              </button>
                              <button type="button" className={s.btn} onClick={() => setRefundFor(null)}>Hủy</button>
                            </div>
                          </form>
                        )}

                        <div className={s.detailActions}>
                          <Link className={s.btn} href={`/payment/result/?orderCode=${order.orderCode}`}>
                            <span className="material-symbols-rounded" aria-hidden="true">open_in_new</span>Trang đơn hàng
                          </Link>
                          {d === "AWAITING_PAYMENT" && (
                            <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={busy === order.orderCode} onClick={() => onCancel(order)}>
                              Hủy đơn
                            </button>
                          )}
                          {order.refundEligible && refundFor !== order.orderCode && (
                            <button type="button" className={s.btn} onClick={() => { setRefundFor(order.orderCode); setRefundReason(""); }}>
                              Yêu cầu hoàn tiền
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
