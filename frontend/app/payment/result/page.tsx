"use client";

import { useEffect, useState } from "react";
import StudioShell, { Arrow, Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { formatDate } from "@/lib/deckFormat";
import { paymentCopy } from "@/lib/i18n.payment";
import { fetchAccount, fetchOrderStatus, formatVnd, type AccountPlan } from "@/lib/paymentService";

const PLAN_NAME: Record<string, string> = { free: "Free", pro: "Pro", studio: "Studio" };

type View = "loading" | "PENDING" | "PAID" | "CANCELLED" | "missing" | "error";

export default function PaymentResultPage() {
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [view, setView] = useState<View>("loading");
  const [orderCode, setOrderCode] = useState("");
  const [order, setOrder] = useState<{ planId: string; amount: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("orderCode") || "";
    setOrderCode(code);
    fetchAccount().then(setAccount).catch(() => setAccount(null));
    if (!code) { setView("missing"); return; }
    let stop = false;
    let finished = false;
    let timer = 0;
    const tick = async () => {
      if (finished) return;
      try {
        const result = await fetchOrderStatus(code);
        if (stop) return;
        setOrder({ planId: result.planId, amount: result.amount });
        setView(result.status);
        if (result.status === "PAID" || result.status === "CANCELLED") {
          finished = true;
          window.clearInterval(timer);
        }
        if (result.status === "PAID") setAccount(await fetchAccount());
      } catch (err) {
        if (stop) return;
        setError(err instanceof Error ? err.message : paymentCopy.resultMissing);
        setView("error");
      }
    };
    tick();
    timer = window.setInterval(tick, 2000);
    return () => { stop = true; window.clearInterval(timer); };
  }, []);

  const planName = order ? PLAN_NAME[order.planId] || order.planId : "";
  const title = {
    loading: "Đang kiểm tra đơn…",
    PENDING: paymentCopy.resultPending,
    PAID: paymentCopy.resultPaid,
    CANCELLED: "Đơn đã bị hủy",
    missing: paymentCopy.resultMissing,
    error: "Không kiểm tra được đơn",
  }[view];

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.wrap} ${s.payWrap}`} aria-labelledby="resultTitle">
        <div className={s.payCard} data-single="true">
          <div className={s.paySum}>
            <div>
              <p className={s.kicker}>{orderCode ? `Đơn ${orderCode}` : "Thanh toán"}</p>
              <h1 className={s.payTitle} id="resultTitle">{title}</h1>
            </div>

            {view === "PAID" && (
              <div className={s.status} data-tone="ok" role="status">
                <Icon name="check_circle" />
                <span>Gói {PLAN_NAME[account?.plan || ""] || planName} đã được kích hoạt{account?.planExpiresAt ? `, dùng đến ${formatDate(account.planExpiresAt)}` : ""}.</span>
              </div>
            )}
            {(view === "PENDING" || view === "loading") && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="progress_activity" />
                <span>Đang chờ ngân hàng xác nhận. Trang tự cập nhật mỗi 2 giây, bạn không cần tải lại.</span>
              </div>
            )}
            {view === "CANCELLED" && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="cancel" />
                <span>Không có khoản nào bị trừ. Tạo đơn mới từ bảng giá nếu bạn vẫn muốn nâng cấp.</span>
              </div>
            )}
            {(view === "missing" || view === "error") && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="error" />
                <span>{view === "missing" ? "Đường dẫn thiếu mã đơn. Mở lại từ email xác nhận hoặc tạo đơn mới." : error}</span>
              </div>
            )}

            {order && (
              <dl className={s.kv}>
                <dt>Gói</dt><dd>{planName}</dd>
                <dt>Số tiền</dt><dd>{formatVnd(order.amount)}</dd>
                <dt>Trạng thái</dt><dd>{view === "PAID" ? "Đã thanh toán" : view === "CANCELLED" ? "Đã hủy" : "Chờ xác nhận"}</dd>
              </dl>
            )}

            <div className={s.payActions}>
              {view === "PAID" ? (
                <>
                  <a className={`${s.btn} ${s.primary}`} href="/slides/">{paymentCopy.openSlides} <Arrow /></a>
                  <a className={s.btn} href="/pricing/">{paymentCopy.backPricing}</a>
                </>
              ) : (
                <>
                  <a className={s.btn} href="/pricing/"><Icon name="arrow_back" />{paymentCopy.backPricing}</a>
                  <a className={s.btn} href="/slides/">{paymentCopy.openSlides}</a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </StudioShell>
  );
}
