const { getPlan } = require('../config/plans');

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

// Configured by the deployment, never accepted from the checkout client.
function quote({ planId, months = 1, promoCode = '' }) {
  const plan = getPlan(planId);
  if (!['pro', 'studio'].includes(planId) || !plan || plan.price <= 0) invalid('Gói thanh toán không hợp lệ');
  if (!Number.isInteger(months) || months < 1 || months > 12) invalid('Số tháng phải từ 1 đến 12');
  if (typeof promoCode !== 'string' || promoCode.length > 64) invalid('Mã giảm giá không hợp lệ');
  const code = promoCode.trim().toUpperCase();
  const subtotal = plan.price * months;
  let discount = 0;
  if (code) {
    const codes = JSON.parse(process.env.PROMO_CODES_JSON || '[]');
    const promo = codes.find(p => p.code === code && p.active !== false);
    if (!promo || !['percent', 'fixed'].includes(promo.type) ||
        !Number.isFinite(promo.value) || promo.value <= 0 ||
        (promo.type === 'percent' && promo.value > 100) ||
        (promo.plans && !promo.plans.includes(planId)) ||
        (promo.expiresAt && (!Number.isFinite(Date.parse(promo.expiresAt)) || Date.parse(promo.expiresAt) <= Date.now()))) {
      invalid('Mã giảm giá không tồn tại, hết hạn hoặc không áp dụng cho gói này');
    }
    discount = Math.round(promo.type === 'percent' ? subtotal * promo.value / 100 : promo.value);
    // Keep a payable amount; zero-value orders need a separate fulfillment flow.
    if (discount >= subtotal) invalid('Mã giảm giá không áp dụng cho giá trị đơn hàng này');
  }
  return { planId, months, subtotal, discount, promoCode: code, amount: subtotal - discount };
}

module.exports = { quote };
