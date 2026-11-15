"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import PromoCheckout from "@/components/PromoCheckout";
import StudioShell, { Arrow, Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { formatDate } from "@/lib/deckFormat";
import { paymentCopy } from "@/lib/i18n.payment";
import { checkout, fetchAccount, fetchPlans, formatVnd, type AccountPlan, type PlanInfo } from "@/lib/paymentService";

const ORDER = ["free", "pro"];
const FOR: Record<string, string> = {
  free: "Build your first decks by hand in Slide Studio. AI and 3D stay locked.",
  pro: "AI slide generation and the 3D blueprint studio, with no deck limit.",
};

function quota(value: number | null) {
  return value == null ? "Unlimited" : String(value);
}

function Feat({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li data-ok={ok}>
      <Icon name={ok ? "check" : "remove"} />
      <span>{label}</span>
      <b>{value}</b>
    </li>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState("");

  useEffect(() => {
    fetchPlans().then((result) => { setPlans(result.plans); setMock(result.mock); }).catch((err) => setError(err.message));
    fetchAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  const buy = async (planId: "pro", promoCode: string) => {
    setError("");
    setBuying(planId);
    try {
      const order = await checkout(planId, 1, promoCode);
      window.location.href = order.checkoutUrl;
    } catch (err) {
      setBuying("");
      setError(err instanceof Error ? err.message : "Could not create the order");
    }
  };

  // Admin owns Slide and 3D: it never buys a plan, it sets the plan prices in the admin console.
  const isAdmin = account?.role === "admin";
  const mine = account?.plan || "free";
  const sorted = [...plans].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const mineName = plans.find((p) => p.id === mine)?.name || "Free";

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.page} ${s.wrap} ${s.pricingPage}`} aria-labelledby="pricingTitle">
        <div className={s.head}>
          <div>
            <p className={s.eyebrow}>{paymentCopy.pricing} · Free · Pro</p>
            <h1 className={s.h1} id="pricingTitle">Start free.<br />Go Pro for AI and 3D.</h1>
          </div>
          <div className={s.headSide}>
            <p className={s.lede}>Slide Studio is free to try. AI slide generation and the 3D blueprint studio need Pro. Paid monthly by bank QR through payOS; each payment adds 30 days.</p>
          </div>
        </div>
        {mock && <p className={s.notice}><Icon name="science" /><span>{paymentCopy.mockNote} No money is charged.</span></p>}
        {error && <p className={s.error}>{error}</p>}

        <div className={s.plans} style={{ "--cols": Math.max(sorted.length, 1) } as CSSProperties}>
          {sorted.map((plan) => {
            const isMine = plan.id === mine;
            const higher = ORDER.indexOf(plan.id) > ORDER.indexOf(mine);
            return (
              <article key={plan.id} className={s.plan} data-featured={plan.id === "pro"} data-mine={isMine}>
                {isMine ? <span className={s.tag} data-mine="true"><i aria-hidden="true" />Current plan</span> : plan.id === "pro" ? <span className={s.tag}>Most popular</span> : null}
                <div>
                  <h2>{plan.name}</h2>
                  <p className={s.for}>{FOR[plan.id]}</p>
                </div>
                <div className={s.price}>
                  <strong>{plan.price ? formatVnd(plan.price) : formatVnd(0)}</strong>
                  <span>/ month</span>
                </div>
                <ul className={s.feats}>
                  <Feat ok label="Slide decks (built by hand)" value={quota(plan.quotas.slides)} />
                  <Feat ok={Boolean(plan.aiSlides)} label="AI slide generation" value={plan.aiSlides ? `${quota(plan.quotas.ai)} / month` : "No"} />
                  <Feat ok={Boolean(plan.blueprint3d)} label="3D blueprint studio (2D plan → 3D, AI 4K render)" value={plan.blueprint3d ? "Yes" : "No"} />
                  <Feat ok label="Saved designs" value={quota(plan.quotas.designs)} />
                  <Feat ok={plan.exportPptx} label="PPTX export" value={plan.exportPptx ? "Yes" : "No"} />
                  <Feat ok={plan.privateDeck} label="Private decks" value={plan.privateDeck ? "Yes" : "No"} />
                  <Feat ok={!plan.watermark} label="No PickMe3D watermark" value={plan.watermark ? "No" : "Yes"} />
                </ul>
                <div className={s.cta}>
                  {isAdmin ? (
                    <>
                      <div className={s.state}>Admin · không mua gói</div>
                      <p>{plan.price > 0 ? <Link href="/admin/billing/">Chỉnh giá gói {plan.name}</Link> : "Gói miễn phí"}</p>
                    </>
                  ) : isMine ? (
                    <>
                      <div className={s.state}>Your plan</div>
                      <p>{plan.id === "free" ? "Free forever" : account?.planExpiresAt ? `Renews or expires ${formatDate(account.planExpiresAt)}` : ""}</p>
                    </>
                  ) : higher ? (
                    <>
                      <PromoCheckout planId="pro" name={plan.name} price={plan.price} busy={Boolean(buying)} onBuy={buy} />
                    </>
                  ) : (
                    <>
                      <div className={s.state}>Included in {mineName}</div>
                      <p />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className={s.foot}>
          <div><Icon name="auto_awesome" /><span><strong>AI and 3D are Pro features</strong>Generate decks with AI (50 credits a month, one per deck, reset monthly) and turn 2D floor plans into walkable 3D models.</span></div>
          <div><Icon name="lock_open" /><span><strong>Your work stays when a plan ends</strong>Decks over the Free limit become view only and AI or 3D tools lock again until you renew. Nothing is deleted.</span></div>
          <div><Icon name="download" /><span><strong>Export</strong>PNG and PDF on every plan. PPTX on Pro.</span></div>
        </div>
      </section>
    </StudioShell>
  );
}
