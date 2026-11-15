"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StudioShell, { Arrow, Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { formatDate } from "@/lib/deckFormat";
import { paymentCopy } from "@/lib/i18n.payment";
import {
  DIGITAL_NO_REFUND_NOTICE,
  DISPLAY_STATUS_LABEL,
  EXCESS_TYPE_LABEL,
  cancelOrder,
  displayStatusOf,
  fetchAccount,
  fetchOrderStatus,
  formatVnd,
  historyLabel,
  orderItemLabel,
  type AccountPlan,
  type DisplayStatus,
  type OrderStatus,
} from "@/lib/paymentService";

const PLAN_NAME: Record<string, string> = { free: "Free", pro: "Pro", studio: "Studio" };

type View = DisplayStatus | "loading" | "missing" | "error";

// Statuses that can still change on their own: keep polling.
const LIVE: View[] = ["loading", "AWAITING_PAYMENT", "VERIFYING", "PROCESSING"];

function safeBackPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/pricing/";
}

function useCountdown(target?: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!target) { setLeft(null); return; }
    const end = new Date(target).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [target]);
  if (left == null) return "";
  const m = Math.floor(left / 60000);
  const sec = Math.floor((left % 60000) / 1000);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function PaymentResultPage() {
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [view, setView] = useState<View>("loading");
  const [orderCode, setOrderCode] = useState("");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [backPath, setBackPath] = useState("/pricing/");
  const viewRef = useRef<View>("loading");

  const apply = useCallback((result: OrderStatus) => {
    setOrder(result);
    const next = displayStatusOf(result);
    viewRef.current = next;
    setView(next);
    return next;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("orderCode") || "";
    const cancelledOnGateway = params.get("cancelled") === "1";
    setBackPath(safeBackPath(params.get("back")));
    setOrderCode(code);
    fetchAccount().then(setAccount).catch(() => setAccount(null));
    if (!code) { setView("missing"); return; }

    let stop = false;
    let timer = 0;
    const schedule = (current: View) => {
      if (stop || !LIVE.includes(current)) return;
      // An unknown payment is re-checked less often; the server keeps verifying in the background anyway.
      timer = window.setTimeout(tick, current === "VERIFYING" ? 10000 : 3000);
    };
    const tick = async () => {
      try {
        const result = await fetchOrderStatus(code);
        if (stop) return;
        const next = apply(result);
        if (next === "COMPLETED") setAccount(await fetchAccount());
        schedule(next);
      } catch (err) {
        if (stop) return;
        setError(err instanceof Error ? err.message : paymentCopy.resultMissing);
        setView("error");
      }
    };

    (async () => {
      // The customer pressed "Cancel" on the payOS page: close the order (the server checks payOS first).
      if (cancelledOnGateway) {
        try {
          const res = await cancelOrder(code, "Khách hủy trên trang thanh toán");
          if (!stop) { apply(res.data); setNotice(res.message); }
          if (!stop && LIVE.includes(displayStatusOf(res.data))) schedule(displayStatusOf(res.data));
          return;
        } catch {
          // Fall through to a normal status check.
        }
      }
      tick();
    })();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [apply]);

  const countdown = useCountdown(view === "AWAITING_PAYMENT" ? order?.expiresAt : null);

  const onCancel = async () => {
    if (!orderCode || !window.confirm("Hủy đơn hàng này? Bạn chưa bị trừ tiền.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await cancelOrder(orderCode);
      apply(res.data);
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được đơn");
    } finally {
      setBusy(false);
    }
  };

  const isProduct = Boolean(order?.orderType && order.orderType !== "SUBSCRIPTION");
  const planName = order ? (isProduct ? orderItemLabel(order) : PLAN_NAME[order.planId || ""] || order.planId || "") : "";
  const title: Record<View, string> = {
    loading: "Đang kiểm tra đơn hàng…",
    AWAITING_PAYMENT: paymentCopy.resultPending,
    VERIFYING: "Đang xác minh giao dịch với ngân hàng",
    PROCESSING: "Đã nhận thanh toán – đang kích hoạt",
    COMPLETED: paymentCopy.resultPaid,
    REFUND_IN_PROGRESS: "Đơn đang được xử lý hoàn tiền",
    REFUNDED: "Đơn đã được hoàn tiền",
    VOIDED: "Thanh toán trùng – tiền được trả lại",
    CANCELLED: "Đơn hàng đã hủy",
    EXPIRED: "Đơn hàng đã hết hạn",
    FAILED: "Chưa tạo được giao dịch",
    UNKNOWN: "Không xác định được trạng thái",
    missing: paymentCopy.resultMissing,
    error: "Không kiểm tra được đơn hàng",
  };
  const paidLike = view === "COMPLETED" || view === "PROCESSING" || view === "REFUND_IN_PROGRESS" || view === "REFUNDED";

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.wrap} ${s.payWrap}`} aria-labelledby="resultTitle">
        <div className={s.payCard} data-single="true">
          <div className={s.paySum}>
            <div>
              <p className={s.kicker}>{orderCode ? `Đơn ${orderCode}` : "Thanh toán"}</p>
              <h1 className={s.payTitle} id="resultTitle">{title[view]}</h1>
            </div>

            {notice && <p className={s.notice} style={{ marginTop: 0 }}><Icon name="info" /><span>{notice}</span></p>}

            {view === "COMPLETED" && (
              <div className={s.status} data-tone="ok" role="status">
                <Icon name="check_circle" />
                <span>{isProduct ? `Đã thêm ${planName} vào tài khoản của bạn.` : <>Gói {PLAN_NAME[account?.plan || ""] || planName} đã kích hoạt{account?.planExpiresAt ? ` đến ${formatDate(account.planExpiresAt)}` : ""}.</>}</span>
              </div>
            )}
            {view === "PROCESSING" && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="progress_activity" />
                <span>Tiền đã được ghi nhận. Hệ thống đang cấp quyền sử dụng và sẽ tự thử lại nếu gặp lỗi. Bạn <b>không cần thanh toán lại</b>.</span>
              </div>
            )}
            {(view === "AWAITING_PAYMENT" || view === "loading") && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="progress_activity" />
                <span>Đang chờ ngân hàng xác nhận. Trang tự cập nhật, không cần tải lại.{countdown ? ` Đơn còn hiệu lực ${countdown}.` : ""}</span>
              </div>
            )}
            {view === "VERIFYING" && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="hourglass_top" />
                <span>Chưa có kết quả cuối cùng từ cổng thanh toán. Nếu bạn đã chuyển tiền, <b>đừng thanh toán lại</b>: hệ thống đang tiếp tục xác minh và sẽ tự cập nhật (hoặc Admin sẽ kiểm tra trong 24 giờ).</span>
              </div>
            )}
            {isProduct && (view === "AWAITING_PAYMENT" || view === "COMPLETED" || view === "PROCESSING") && (
              <p className={s.notice} style={{ marginTop: 0 }}><Icon name="info" /><span>{DIGITAL_NO_REFUND_NOTICE}</span></p>
            )}
            {order?.excessReturn && order.excessReturn.status !== "CANCELLED" && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="currency_exchange" />
                <span>
                  {order.excessReturn.status === "COMPLETED"
                    ? `Đã trả lại ${formatVnd(order.excessReturn.amount)} tiền ${EXCESS_TYPE_LABEL[order.excessReturn.type]}${order.excessReturn.reference ? ` (mã GD ${order.excessReturn.reference})` : ""}.`
                    : `Hệ thống phát hiện ${EXCESS_TYPE_LABEL[order.excessReturn.type]} và đang trả lại ${formatVnd(order.excessReturn.amount)} cho bạn.`}
                  {order.excessReturn.keepOrderCode ? ` Quyền sử dụng của bạn vẫn giữ nguyên qua đơn #${order.excessReturn.keepOrderCode}.` : ""}
                </span>
              </div>
            )}
            {(view === "REFUND_IN_PROGRESS" || view === "REFUNDED") && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="currency_exchange" />
                <span>
                  {view === "REFUNDED"
                    ? `Đã hoàn ${formatVnd(order?.refund?.amount || order?.amount || 0)}${order?.refund?.reference ? ` (mã GD ${order.refund.reference})` : ""}.`
                    : order?.refund?.status === "APPROVED" ? "Yêu cầu hoàn tiền đã được duyệt, tiền đang được chuyển lại." : "Yêu cầu hoàn tiền đang chờ Admin xét duyệt."}
                </span>
              </div>
            )}
            {(view === "CANCELLED" || view === "EXPIRED" || view === "FAILED") && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="cancel" />
                <span>Bạn chưa bị trừ tiền. Tạo đơn mới nếu vẫn muốn mua. Nếu tài khoản ngân hàng đã bị trừ, hệ thống sẽ tự đối soát và ghi nhận.</span>
              </div>
            )}
            {(view === "missing" || view === "error") && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="error" />
                <span>{view === "missing" ? "Liên kết thiếu mã đơn hàng. Mở lại từ lịch sử thanh toán hoặc tạo đơn mới." : error}</span>
              </div>
            )}
            {error && view !== "error" && <p className={s.error} style={{ margin: 0 }}>{error}</p>}

            {order && (
              <dl className={s.kv}>
                <dt>{isProduct ? "Sản phẩm" : "Gói"}</dt><dd>{planName}</dd>
                <dt>Số tiền</dt><dd>{formatVnd(order.amount)}{order.discount ? ` (giảm ${formatVnd(order.discount)})` : ""}</dd>
                <dt>Trạng thái</dt><dd>{DISPLAY_STATUS_LABEL[displayStatusOf(order)]}</dd>
                {order.paidAt && <><dt>Thanh toán lúc</dt><dd>{new Date(order.paidAt).toLocaleString("vi-VN")}</dd></>}
                {order.gatewayReference && <><dt>Mã giao dịch</dt><dd>{order.gatewayReference}</dd></>}
              </dl>
            )}

            {order?.statusHistory && order.statusHistory.length > 0 && (
              <details>
                <summary style={{ cursor: "pointer", fontSize: 13 }}>Lịch sử trạng thái ({order.statusHistory.length})</summary>
                <ol style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                  {order.statusHistory.map((h, i) => (
                    <li key={i}>
                      <b>{historyLabel(h.to)}</b> · {new Date(h.at).toLocaleString("vi-VN")}
                      {h.note ? <> – {h.note}</> : null}
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className={s.payActions}>
              {view === "AWAITING_PAYMENT" && order?.checkoutUrl && (
                <a className={`${s.btn} ${s.primary}`} href={order.checkoutUrl}>Tiếp tục thanh toán <Arrow /></a>
              )}
              {view === "AWAITING_PAYMENT" && (
                <button type="button" className={s.btn} onClick={onCancel} disabled={busy}>{busy ? "Đang hủy…" : "Hủy đơn"}</button>
              )}
              {view === "COMPLETED" && (
                order?.orderType === "UI_PURCHASE" ? (
                  <a className={`${s.btn} ${s.primary}`} href="/ui-marketplace/">Mở UI Marketplace <Arrow /></a>
                ) : order?.orderType === "TEMPLATE_PURCHASE" ? (
                  <a className={`${s.btn} ${s.primary}`} href={order.templateId ? `/templates/${order.templateId}` : "/templates/"}>Mở Template <Arrow /></a>
                ) : (
                  <a className={`${s.btn} ${s.primary}`} href="/slides/">{paymentCopy.openSlides} <Arrow /></a>
                )
              )}
              {paidLike && (
                <a className={s.btn} href={`/payment/receipt/?orderCode=${orderCode}`}>Xem biên lai / Lưu PDF</a>
              )}
              {(view === "CANCELLED" || view === "EXPIRED" || view === "FAILED") && (
                <a className={`${s.btn} ${s.primary}`} href={backPath}>Tạo đơn mới <Arrow /></a>
              )}
              <a className={s.btn} href="/settings/#billing">Lịch sử thanh toán</a>
              <a className={s.btn} href={backPath}><Icon name="arrow_back" />Quay lại</a>
            </div>
          </div>
        </div>
      </section>
    </StudioShell>
  );
}
