"use client";

import { useState } from "react";
import { PaymentQuote, formatVnd, quotePayment } from "@/lib/paymentService";
import styles from "./PromoCheckout.module.css";

export default function PromoCheckout({
  planId,
  name,
  price,
  busy,
  onBuy,
}: {
  planId: "pro" | "studio";
  name: string;
  price: number;
  busy: boolean;
  onBuy: (id: "pro" | "studio", code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function applyCode() {
    if (!code.trim()) return;
    setChecking(true);
    setError("");
    try {
      setQuote(await quotePayment(planId, code.trim()));
    } catch (reason) {
      setQuote(null);
      setError(reason instanceof Error ? reason.message : "Could not apply this code.");
    } finally {
      setChecking(false);
    }
  }

  const disabled = busy || checking;
  const mustApply = Boolean(code.trim()) && !quote;

  return (
    <section className={styles.checkout} data-featured={planId === "pro"} aria-label={`${name} checkout`}>
      <label className={styles.label} htmlFor={`promo-${planId}`}>
        <span><span className="material-symbols-rounded" aria-hidden="true">sell</span>Promo code</span>
        <small>Optional</small>
      </label>

      <div className={styles.codeRow}>
        <span className={styles.codeIcon} aria-hidden="true">
          <span className="material-symbols-rounded">confirmation_number</span>
        </span>
        <input
          id={`promo-${planId}`}
          maxLength={64}
          value={code}
          disabled={disabled}
          autoComplete="off"
          placeholder="Enter code"
          onChange={(event) => {
            setCode(event.target.value);
            setQuote(null);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void applyCode();
            }
          }}
        />
        <button type="button" className={styles.applyButton} disabled={disabled || !code.trim()} onClick={applyCode}>
          {checking ? "Checking…" : quote ? "Applied" : "Apply"}
        </button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {quote && (
        <div className={styles.quote} role="status" aria-live="polite">
          <div><span>Subtotal</span><span>{formatVnd(quote.subtotal)}</span></div>
          <div className={styles.discount}><span>Discount · {quote.promoCode}</span><span>−{formatVnd(quote.discount)}</span></div>
          <div className={styles.total}><strong>Due today</strong><strong>{formatVnd(quote.amount)}</strong></div>
        </div>
      )}

      <button
        type="button"
        className={styles.checkoutButton}
        data-featured={planId === "pro"}
        disabled={disabled || mustApply}
        onClick={() => onBuy(planId, quote?.promoCode || "")}
      >
        {busy ? "Creating order…" : `Upgrade to ${name}`}
        <span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
      </button>
      <p className={styles.paymentNote}>
        <span className="material-symbols-rounded" aria-hidden="true">account_balance</span>
        Pay {formatVnd(quote?.amount ?? price)} with bank QR through payOS.
      </p>
    </section>
  );
}
