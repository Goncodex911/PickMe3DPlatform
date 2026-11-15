"use client";

import { useEffect } from "react";
import StudioShell from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";

// Thanh toán chỉ ghi nhận qua payOS: trang giả lập (QR giả + nút "I have paid") đã bỏ.
// Link cũ tới trang này được chuyển sang trang kết quả đơn hàng, nơi trạng thái được xác minh với payOS.
export default function MockPaymentPage() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("orderCode") || "";
    window.location.replace(code ? `/payment/result/?orderCode=${encodeURIComponent(code)}` : "/pricing/");
  }, []);

  return (
    <StudioShell active="pricing">
      <section className={s.wrap} aria-live="polite">
        <p className={s.kicker}>Đang chuyển tới trang đơn hàng…</p>
      </section>
    </StudioShell>
  );
}
