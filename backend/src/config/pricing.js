/** Price rules shared by Admin and Creator template pricing and UI Marketplace pricing (VND). */
const MIN_PAID_PRICE_VND = 1000; // payOS minimum charge
const MAX_PRICE_VND = 50000000;

/** 0 = free, otherwise an integer between MIN_PAID_PRICE_VND and MAX_PRICE_VND. */
function isValidPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_PRICE_VND) return false;
  return n === 0 || n >= MIN_PAID_PRICE_VND;
}

const PRICE_ERROR = `Giá phải là số nguyên VND: 0 (miễn phí) hoặc từ ${MIN_PAID_PRICE_VND.toLocaleString('vi-VN')} đến ${MAX_PRICE_VND.toLocaleString('vi-VN')}`;

module.exports = { MIN_PAID_PRICE_VND, MAX_PRICE_VND, isValidPrice, PRICE_ERROR };
