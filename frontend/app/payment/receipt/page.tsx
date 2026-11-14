"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, fetchReceipt, formatVnd } from "@/lib/paymentService";
import s from "./receipt.module.css";
export default function ReceiptPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const code = new URLSearchParams(window.location.search).get("orderCode");
    if (!code || !/^\d+$/.test(code)) { setError("A valid order code is required."); return; }
    fetchReceipt(code).then(value => { if (active) setReceipt(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  return <main className={s.page}>
    <div className={s.controls}><Link href="/settings/#billing"><span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>Billing history</Link>{receipt && <button onClick={() => window.print()}><span className="material-symbols-rounded" aria-hidden="true">download</span>Print / Save PDF</button>}</div>
    {error ? <p className={s.error} role="alert">{error}</p> : !receipt ? <p className={s.loading} role="status">Loading receipt…</p> : <article className={s.receipt}>
      <header className={s.brandRow}>
        <div className={s.brand}>
          <span className="material-symbols-rounded" aria-hidden="true">deployed_code</span>
          <div><strong>PickMe3D</strong><small>CREATIVE PLATFORM</small></div>
        </div>
        <span className={s.documentLabel}>ELECTRONIC RECEIPT</span>
      </header>
      <div className={s.successMark}><span className="material-symbols-rounded" aria-hidden="true">check_circle</span>Paid</div>
      <h1>Payment successful</h1><p className={s.receiptNumber}>Receipt number <strong>{receipt.receiptNumber}</strong></p>
      <dl className={s.details}><dt>Customer</dt><dd>{receipt.customer.name}</dd><dt>Email</dt><dd>{receipt.customer.email}</dd>
        <dt>Order code</dt><dd>{receipt.orderCode}</dd><dt>Payment date</dt><dd>{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString("en-US") : "—"}</dd>
        <dt>Plan</dt><dd>{receipt.planId.toUpperCase()} · {receipt.months} months</dd>
        <dt>Subtotal</dt><dd>{formatVnd(receipt.subtotal)}</dd>
        <dt>Discount{receipt.promoCode ? ` (${receipt.promoCode})` : ""}</dt><dd>-{formatVnd(receipt.discount)}</dd>
        <dt>Total paid</dt><dd><strong>{formatVnd(receipt.amount)}</strong></dd>
      </dl>
      <footer><span className="material-symbols-rounded" aria-hidden="true">verified_user</span><p>This receipt confirms payment for PickMe3D services. It is not a VAT invoice.</p></footer>
    </article>}
  </main>;
}
