// Thời hạn gói trả phí (Pro): mỗi tháng mua = 30 ngày, gia hạn khi còn hạn thì cộng dồn (backend billingStore.extendPlan).
// Dùng chung cho lịch sử thanh toán của user và chi tiết đơn ở trang admin.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlanExpiry {
  expiresAt: Date;
  /** Số ngày còn lại, làm tròn lên (còn vài giờ vẫn tính là 1 ngày); 0 khi đã hết hạn. */
  daysLeft: number;
  expired: boolean;
}

/** null khi gói miễn phí hoặc không có ngày hết hạn (vd. tài khoản demo được cấp sẵn). */
export function planExpiry(plan: string | null | undefined, expiresAt: string | Date | null | undefined, now = Date.now()): PlanExpiry | null {
  if (!plan || plan === "free" || !expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const left = date.getTime() - now;
  return { expiresAt: date, daysLeft: left > 0 ? Math.ceil(left / DAY_MS) : 0, expired: left <= 0 };
}

export function formatPlanExpiry(info: PlanExpiry) {
  const date = info.expiresAt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return info.expired ? `Đã hết hạn ${date}` : `Hết hạn ${date} · còn ${info.daysLeft} ngày`;
}
