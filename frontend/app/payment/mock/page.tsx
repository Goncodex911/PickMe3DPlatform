"use client";

import { useEffect, useMemo, useState } from "react";
import StudioShell, { Icon } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { confirmMockPayment, fetchAccount, fetchOrderStatus, formatVnd, type AccountPlan } from "@/lib/paymentService";

const PLAN_NAME: Record<string, string> = { pro: "Pro", studio: "Studio" };

// Mã QR minh hoạ (không quét được), sinh cố định theo mã đơn để mỗi đơn trông khác nhau
function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const out: [number, number][] = [];
    const finder = (x: number, y: number) => x < 8 && y < 8 || x > 16 && y < 8 || x < 8 && y > 16;
    for (let y = 0; y < 25; y += 1) {
      for (let x = 0; x < 25; x += 1) {
        if (finder(x, y)) continue;
        h = Math.imul(h ^ (x * 31 + y), 2654435761);
        if ((h >>> 28) % 2 === 0) out.push([x, y]);
      }
    }
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#0a0d15" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#f3efe7" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#0a0d15" />
    </g>
  );
  return (
    <svg viewBox="0 0 25 25" shapeRendering="crispEdges" role="img" aria-label="Mã QR giả lập">
      {cells.map(([x, y]) => <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill="#0a0d15" />)}
      {finder(0, 0)}{finder(18, 0)}{finder(0, 18)}
    </svg>
  );
}

export default function MockPaymentPage() {
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("orderCode") || "";
    setOrderCode(code);
    fetchAccount().then(setAccount).catch(() => setAccount(null));
    if (!code) { setError("Thiếu mã đơn. Quay lại bảng giá để tạo đơn mới."); return; }
    fetchOrderStatus(code)
      .then((order) => {
        setAmount(order.amount);
        setPlanId(order.planId);
        if (order.status === "PAID") window.location.href = `/payment/result/?orderCode=${code}`;
      })
      .catch((err) => setError(err.message));
  }, []);

  const pay = async () => {
    setError("");
    setPaying(true);
    try {
      await confirmMockPayment(orderCode, amount);
      window.location.href = `/payment/result/?orderCode=${orderCode}`;
    } catch (err) {
      setPaying(false);
      setError(err instanceof Error ? err.message : "Không xác nhận được thanh toán");
    }
  };

  const planName = PLAN_NAME[planId] || planId;

  return (
    <StudioShell plan={account?.plan} active="pricing">
      <section className={`${s.wrap} ${s.payWrap}`} aria-labelledby="payTitle">
        <div className={s.payCard}>
          <div className={s.paySum}>
            <a className={s.back} href="/pricing/"><Icon name="arrow_back" />Bảng giá</a>
            <div>
              <p className={s.kicker}>Đơn {orderCode || "—"}</p>
              <h1 className={s.payTitle} id="payTitle">{planName ? `Nâng cấp gói ${planName}` : "Thanh toán PickMe3D"}</h1>
            </div>
            <dl className={s.kv}>
              <dt>Gói</dt><dd>{planName || "—"}</dd>
              <dt>Thời hạn</dt><dd>30 ngày</dd>
              <dt>Phương thức</dt><dd>QR ngân hàng (payOS)</dd>
            </dl>
            <div>
              <p className={s.kicker}>Tổng thanh toán</p>
              <div className={s.amount}>{amount ? formatVnd(amount) : "—"}</div>
            </div>
            <p className={s.notice} style={{ marginTop: 0 }}><Icon name="science" /><span>Chế độ giả lập: máy này chưa có khóa payOS. Bấm xác nhận sẽ kích hoạt gói ngay, không trừ tiền.</span></p>
          </div>
          <div className={s.payBox}>
            <div className={s.qr}><FakeQr seed={orderCode || "pickme"} /></div>
            <ol className={s.steps}>
              <li>Mở app ngân hàng và quét mã QR.</li>
              <li>Kiểm tra số tiền {amount ? formatVnd(amount) : ""} và nội dung chuyển khoản.</li>
              <li>Xác nhận, rồi quay lại trang này.</li>
            </ol>
            {error && <p className={s.error} style={{ margin: 0 }}>{error}</p>}
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={pay} disabled={!orderCode || !amount || paying}>
              <Icon name="check" />{paying ? "Đang xác nhận…" : "Tôi đã thanh toán"}
            </button>
          </div>
        </div>
      </section>
    </StudioShell>
  );
}
