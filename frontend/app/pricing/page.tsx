"use client";

import { useEffect, useState } from "react";
import StudioShell, { Arrow, Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { formatDate } from "@/lib/deckFormat";
import { paymentCopy } from "@/lib/i18n.payment";
import { checkout, fetchAccount, fetchPlans, formatVnd, type AccountPlan, type PlanInfo } from "@/lib/paymentService";

const ORDER = ["free", "pro", "studio"];
const FOR: Record<string, string> = {
  free: "Try Slide Studio with your first few decks.",
  pro: "For designers who build pitches and lookbooks every week.",
  studio: "For brands that need their own identity on every deck.",
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

  const buy = async (planId: "pro" | "studio") => {
    setError("");
    setBuying(planId);
    try {
      const order = await checkout(planId, 1);
      window.location.href = order.checkoutUrl;
    } catch (err) {
      setBuying("");
      setError(err instanceof Error ? err.message : "Could not create the order");
    }
  };

  const mine = account?.plan || "free";
  const sorted = [...plans].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const mineName = plans.find((p) => p.id === mine)?.name || "Free";

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.page} ${s.wrap} ${s.pricingPage}`} aria-labelledby="pricingTitle">
        <div className={s.head}>
          <div>
            <p className={s.eyebrow}>{paymentCopy.pricing} · Free · Pro · Studio</p>
            <h1 className={s.h1} id="pricingTitle">One account.<br />Three ways to work.</h1>
          </div>
          <div className={s.headSide}>
            <p className={s.lede}>Monthly pricing, paid by bank QR through payOS. Each payment adds 30 days to your plan.</p>
          </div>
        </div>
        {mock && <p className={s.notice}><Icon name="science" /><span>{paymentCopy.mockNote} No money is charged.</span></p>}
        {error && <p className={s.error}>{error}</p>}

        <div className={s.plans}>
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
                  <Feat ok label="Slide decks" value={quota(plan.quotas.slides)} />
                  <Feat ok label="AI credits per month" value={quota(plan.quotas.ai)} />
                  <Feat ok label="Saved designs" value={quota(plan.quotas.designs)} />
                  <Feat ok={plan.exportPptx} label="PPTX export" value={plan.exportPptx ? "Yes" : "No"} />
                  <Feat ok={plan.privateDeck} label="Private decks" value={plan.privateDeck ? "Yes" : "No"} />
                  <Feat ok={plan.brandKit} label="Brand kit (logo, colors, fonts)" value={plan.brandKit ? "Yes" : "No"} />
                </ul>
                <div className={s.cta}>
                  {isMine ? (
                    <>
                      <div className={s.state}>Your plan</div>
                      <p>{plan.id === "free" ? "Free forever" : account?.planExpiresAt ? `Renews or expires ${formatDate(account.planExpiresAt)}` : ""}</p>
                    </>
                  ) : higher ? (
                    <>
                      <button
                        type="button"
                        className={`${s.btn} ${plan.id === "pro" ? s.primary : ""}`}
                        disabled={Boolean(buying)}
                        onClick={() => buy(plan.id as "pro" | "studio")}
                      >
                        {buying === plan.id ? "Creating order…" : `Upgrade to ${plan.name}`} <Arrow />
                      </button>
                      <p>Pay {formatVnd(plan.price)} with payOS QR</p>
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
          <div><Icon name="lock_open" /><span><strong>Your decks stay when a plan ends</strong>Decks over the limit become view only until you upgrade again.</span></div>
          <div><Icon name="auto_awesome" /><span><strong>AI credits reset monthly</strong>Each AI-generated deck uses one credit, even if you delete it later.</span></div>
          <div><Icon name="download" /><span><strong>Export</strong>PNG and PDF on every plan. PPTX from Pro and up.</span></div>
        </div>
      </section>
    </StudioShell>
  );
}
