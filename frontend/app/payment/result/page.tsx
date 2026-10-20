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
    loading: "Checking your order…",
    PENDING: paymentCopy.resultPending,
    PAID: paymentCopy.resultPaid,
    CANCELLED: "Order cancelled",
    missing: paymentCopy.resultMissing,
    error: "Could not check the order",
  }[view];

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.wrap} ${s.payWrap}`} aria-labelledby="resultTitle">
        <div className={s.payCard} data-single="true">
          <div className={s.paySum}>
            <div>
              <p className={s.kicker}>{orderCode ? `Order ${orderCode}` : "Payment"}</p>
              <h1 className={s.payTitle} id="resultTitle">{title}</h1>
            </div>

            {view === "PAID" && (
              <div className={s.status} data-tone="ok" role="status">
                <Icon name="check_circle" />
                <span>Your {PLAN_NAME[account?.plan || ""] || planName} plan is active{account?.planExpiresAt ? ` until ${formatDate(account.planExpiresAt)}` : ""}.</span>
              </div>
            )}
            {(view === "PENDING" || view === "loading") && (
              <div className={s.status} data-tone="wait" role="status">
                <Icon name="progress_activity" />
                <span>Waiting for the bank to confirm. This page checks again every 2 seconds, no need to reload.</span>
              </div>
            )}
            {view === "CANCELLED" && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="cancel" />
                <span>Nothing was charged. Create a new order from Pricing if you still want to upgrade.</span>
              </div>
            )}
            {(view === "missing" || view === "error") && (
              <div className={s.status} data-tone="bad" role="status">
                <Icon name="error" />
                <span>{view === "missing" ? "The link is missing an order code. Open it again from the confirmation email or create a new order." : error}</span>
              </div>
            )}

            {order && (
              <dl className={s.kv}>
                <dt>Plan</dt><dd>{planName}</dd>
                <dt>Amount</dt><dd>{formatVnd(order.amount)}</dd>
                <dt>Status</dt><dd>{view === "PAID" ? "Paid" : view === "CANCELLED" ? "Cancelled" : "Pending"}</dd>
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
