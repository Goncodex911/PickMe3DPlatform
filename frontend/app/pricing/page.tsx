"use client";

import { useEffect, useState } from "react";
import StudioShell, { Arrow, Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { formatDate } from "@/lib/deckFormat";
import { paymentCopy } from "@/lib/i18n.payment";
import { checkout, fetchAccount, fetchPlans, formatVnd, type AccountPlan, type PlanInfo } from "@/lib/paymentService";

const ORDER = ["free", "pro", "studio"];
const FOR: Record<string, string> = {
  free: "Thử Slide Studio với vài deck đầu tiên.",
  pro: "Cho nhà thiết kế làm pitch và lookbook hằng tuần.",
  studio: "Cho thương hiệu cần bộ nhận diện riêng trên mọi deck.",
};

function quota(value: number | null) {
  return value == null ? "Không giới hạn" : String(value);
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
      setError(err instanceof Error ? err.message : "Không tạo được đơn thanh toán");
    }
  };

  const mine = account?.plan || "free";
  const sorted = [...plans].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const mineName = plans.find((p) => p.id === mine)?.name || "Free";

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.page} ${s.wrap}`} aria-labelledby="pricingTitle">
        <div className={s.head}>
          <div>
            <p className={s.eyebrow}>{paymentCopy.pricing} · Free · Pro · Studio</p>
            <h1 className={s.h1} id="pricingTitle">Một tài khoản.<br />Ba cách làm việc.</h1>
          </div>
          <div className={s.headSide}>
            <p className={s.lede}>Giá theo tháng, thanh toán bằng QR ngân hàng qua payOS. Mỗi lần thanh toán cộng thêm 30 ngày vào gói.</p>
          </div>
        </div>
        {mock && <p className={s.notice}><Icon name="science" /><span>{paymentCopy.mockNote} Không có tiền nào bị trừ.</span></p>}
        {error && <p className={s.error}>{error}</p>}

        <div className={s.plans}>
          {sorted.map((plan) => {
            const isMine = plan.id === mine;
            const higher = ORDER.indexOf(plan.id) > ORDER.indexOf(mine);
            return (
              <article key={plan.id} className={s.plan} data-featured={plan.id === "pro"} data-mine={isMine}>
                {isMine ? <span className={s.tag} data-mine="true">Đang dùng</span> : plan.id === "pro" ? <span className={s.tag}>Phổ biến</span> : null}
                <div>
                  <h2>{plan.name}</h2>
                  <p className={s.for}>{FOR[plan.id]}</p>
                </div>
                <div className={s.price}>
                  <strong>{plan.price ? formatVnd(plan.price) : "0đ"}</strong>
                  <span>/ tháng</span>
                </div>
                <ul className={s.feats}>
                  <Feat ok label="Deck slide" value={quota(plan.quotas.slides)} />
                  <Feat ok label="Lượt AI mỗi tháng" value={quota(plan.quotas.ai)} />
                  <Feat ok label="Thiết kế đã lưu" value={quota(plan.quotas.designs)} />
                  <Feat ok={plan.exportPptx} label="Xuất PPTX" value={plan.exportPptx ? "Có" : "Không"} />
                  <Feat ok={plan.privateDeck} label="Deck riêng tư" value={plan.privateDeck ? "Có" : "Không"} />
                  <Feat ok={plan.brandKit} label="Brand kit (logo, màu, font)" value={plan.brandKit ? "Có" : "Không"} />
                </ul>
                <div className={s.cta}>
                  {isMine ? (
                    <>
                      <div className={s.state}>Gói của bạn</div>
                      <p>{plan.id === "free" ? "Miễn phí, không hết hạn" : account?.planExpiresAt ? `Hết hạn ${formatDate(account.planExpiresAt)}` : ""}</p>
                    </>
                  ) : higher ? (
                    <>
                      <button
                        type="button"
                        className={`${s.btn} ${plan.id === "pro" ? s.primary : ""}`}
                        disabled={Boolean(buying)}
                        onClick={() => buy(plan.id as "pro" | "studio")}
                      >
                        {buying === plan.id ? "Đang tạo đơn…" : `Nâng cấp lên ${plan.name}`} <Arrow />
                      </button>
                      <p>Thanh toán {formatVnd(plan.price)} qua QR payOS</p>
                    </>
                  ) : (
                    <>
                      <div className={s.state}>Đã bao gồm trong gói {mineName}</div>
                      <p />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className={s.foot}>
          <div><Icon name="lock_open" /><span><strong>Deck không bị xóa khi hết gói</strong>Deck vượt hạn mức chuyển sang chỉ xem cho tới khi bạn nâng cấp lại.</span></div>
          <div><Icon name="auto_awesome" /><span><strong>Lượt AI tính theo tháng</strong>Mỗi lần AI tạo một deck tính một lượt, kể cả khi bạn xóa deck đó.</span></div>
          <div><Icon name="download" /><span><strong>Xuất file</strong>PNG và PDF có ở mọi gói. PPTX từ gói Pro trở lên.</span></div>
        </div>
      </section>
    </StudioShell>
  );
}
