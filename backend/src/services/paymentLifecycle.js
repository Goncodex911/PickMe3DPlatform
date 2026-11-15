/**
 * Payment lifecycle: checkout creation, confirmation (webhook / polling / reconcile), fulfillment with retry,
 * cancellation, expiry, refunds and reconciliation against payOS.
 *
 * Rules that protect the customer's money:
 *  - An order is marked PAID at most once (atomic conditional update); webhook replays and polling are idempotent.
 *  - "Could not reach payOS" is never read as "not paid": the order goes to VERIFYING and is re-checked by the job.
 *  - While an order of the same product is VERIFYING, a new checkout is refused (no double charge).
 *  - Payment success and delivery (fulfillment) are tracked separately; delivery is retried, never re-charged.
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const PaymentEvent = require('../models/PaymentEvent');
const billing = require('./billingStore');
const payos = require('./payosService');
const { notifyAdmins, notifyUser } = require('../helpers/notificationHelper');

const MAX_FULFILLMENT_ATTEMPTS = 5;
const FULFILLMENT_STUCK_MS = 10 * 60 * 1000;
const VERIFY_RECHECK_MS = 2 * 60 * 1000;
const VERIFY_REVIEW_AFTER_MS = 24 * 60 * 60 * 1000;
const STATUS_CHECK_THROTTLE_MS = 5000;
const MAX_OPEN_ORDERS_PER_USER = 5;
const OPEN_STATUSES = ['PENDING', 'VERIFYING'];
const CLOSED_UNPAID = ['CANCELLED', 'EXPIRED', 'FAILED'];
const DAY_MS = 24 * 60 * 60 * 1000;

function dbOn() {
  return mongoose.connection.readyState === 1;
}

function ttlMinutes() {
  const n = Number(process.env.PAYMENT_ORDER_TTL_MINUTES);
  return Number.isFinite(n) && n > 0 ? Math.min(1440, Math.max(5, Math.round(n))) : 15;
}

function refundWindowDays() {
  const n = Number(process.env.REFUND_WINDOW_DAYS);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

function httpError(statusCode, code, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.extra = extra;
  return error;
}

/**
 * The money of this order has been (or is being) sent back as a collection mistake: a later webhook, poll or
 * reconciliation must never turn it back into a sale.
 */
function isReturnSettled(order) {
  if (!order) return false;
  if (order.status === 'VOIDED') return true;
  const er = order.excessReturn || {};
  return er.type === 'PARTIAL_PAYMENT' && (er.status === 'PENDING' || er.status === 'COMPLETED');
}

function isExpired(order, now = Date.now()) {
  return Boolean(order.expiresAt) && new Date(order.expiresAt).getTime() <= now;
}

function fmt(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}₫`;
}

/** Status shown to the customer: separates "paid, delivering" and "refund in progress" from plain PAID. */
function displayStatus(order) {
  if (!order) return 'UNKNOWN';
  const refund = (order.refund && order.refund.status) || 'NONE';
  if (order.status === 'PAID') {
    if (refund === 'REQUESTED' || refund === 'APPROVED') return 'REFUND_IN_PROGRESS';
    if (['PENDING', 'PROCESSING', 'FAILED'].includes(order.fulfillmentStatus)) return 'PROCESSING';
    return 'COMPLETED';
  }
  if (order.status === 'PENDING') return isExpired(order) ? 'EXPIRED' : 'AWAITING_PAYMENT';
  return order.status;
}

function plain(order) {
  if (!order) return null;
  return order.toObject ? order.toObject() : { ...order };
}

/** Order as returned to its owner (no internal admin data, no raw gateway payload). */
function publicOrder(order) {
  const o = plain(order);
  if (!o) return null;
  const refund = o.refund || {};
  const canResume = o.status === 'PENDING' && !isExpired(o) && Boolean(o.checkoutUrl);
  return {
    orderCode: o.orderCode,
    orderType: o.orderType || 'SUBSCRIPTION',
    planId: o.planId || null,
    months: o.months || 1,
    templateId: o.templateId ? String(o.templateId) : null,
    productId: o.productId || '',
    productTitle: o.productTitle || '',
    currency: o.currency || 'VND',
    subtotal: o.subtotal ?? o.amount,
    discount: o.discount || 0,
    promoCode: o.promoCode || '',
    amount: o.amount,
    status: o.status,
    displayStatus: displayStatus(o),
    expiresAt: o.expiresAt || null,
    checkoutUrl: canResume ? o.checkoutUrl : '',
    paymentMode: o.paymentMode || '',
    paidAt: o.paidAt || null,
    paidAmount: o.paidAmount ?? (o.status === 'PAID' || o.status === 'REFUNDED' ? o.amount : null),
    gatewayReference: o.gatewayReference || '',
    fulfillmentStatus: o.fulfillmentStatus || (o.status === 'PAID' ? 'DONE' : 'NONE'),
    fulfilledAt: o.fulfilledAt || null,
    cancelledAt: o.cancelledAt || null,
    cancelReason: o.cancelReason || '',
    refund: {
      status: refund.status || 'NONE',
      reason: refund.reason || '',
      amount: refund.amount || 0,
      requestedAt: refund.requestedAt || null,
      reviewedAt: refund.reviewedAt || null,
      adminNote: refund.adminNote || '',
      reference: refund.reference || '',
      completedAt: refund.completedAt || null,
    },
    excessReturn: o.excessReturn && o.excessReturn.status && o.excessReturn.status !== 'NONE'
      ? {
        status: o.excessReturn.status,
        type: o.excessReturn.type,
        amount: o.excessReturn.amount || 0,
        reason: o.excessReturn.reason || '',
        keepOrderCode: o.excessReturn.keepOrderCode || null,
        reference: o.excessReturn.reference || '',
        createdAt: o.excessReturn.createdAt || null,
        completedAt: o.excessReturn.completedAt || null,
      }
      : null,
    refundable: isRefundableOrder(o),
    refundEligible: refundEligibility(o).ok,
    customer: o.customer || null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
    statusHistory: (o.statusHistory || []).map((h) => ({ from: h.from, to: h.to, at: h.at, source: h.source, note: h.note })),
  };
}

/** Never throws: tracing must not break a payment. */
async function logEvent(event) {
  if (!dbOn()) return null;
  try {
    return await PaymentEvent.create(event);
  } catch (err) {
    console.error('[payment] event log failed:', err.message);
    return null;
  }
}

/**
 * Optimistic status change: only applies if the order still has the status we read, so two concurrent callers
 * (webhook + polling) can never both move it. Returns the updated document or null.
 */
async function transition(order, allowedFrom, to, { set = {}, source = 'system', note = '', actor = null } = {}) {
  if (!order || !allowedFrom.includes(order.status)) return null;
  const now = new Date();
  const fields = { ...set, status: to };
  if (to === 'VERIFYING' && !order.verifyingSince) fields.verifyingSince = now;
  if (to !== 'VERIFYING') fields.verifyingSince = null;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    {
      $set: fields,
      $push: { statusHistory: { from: order.status, to, at: now, source, note: String(note || '').slice(0, 500), actor } },
    },
    { new: true }
  );
  return updated;
}

async function pushHistory(orderId, entry) {
  await Order.updateOne({ _id: orderId }, { $push: { statusHistory: { at: new Date(), source: 'system', ...entry } } });
}

// ---------------------------------------------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------------------------------------------

/** Delivers what the order bought. Each branch is idempotent except the subscription extension (see runFulfillment). */
async function deliver(order) {
  const access = require('./accessService');
  if (order.orderType === 'SUBSCRIPTION' && order.planId) {
    await billing.extendPlan(order.userId, order.planId, order.months);
  }
  if (order.orderType === 'TEMPLATE_PURCHASE') {
    await access.grantTemplateEntitlement(order);
  }
  if (order.orderType === 'UI_PURCHASE') {
    await access.grantUiEntitlement(order);
  }
}

/**
 * Claims the order for delivery (PENDING/FAILED -> PROCESSING atomically) so only one worker delivers it.
 * `force` lets an Admin retry after the automatic attempts are exhausted.
 */
async function runFulfillment(orderCode, { source = 'system', force = false } = {}) {
  if (!dbOn()) return null;
  const now = new Date();
  const filter = { orderCode: Number(orderCode), status: 'PAID', fulfillmentStatus: { $in: ['PENDING', 'FAILED'] } };
  if (!force) filter.fulfillmentAttempts = { $lt: MAX_FULFILLMENT_ATTEMPTS };
  const claimed = await Order.findOneAndUpdate(
    filter,
    { $set: { fulfillmentStatus: 'PROCESSING', fulfillmentUpdatedAt: now }, $inc: { fulfillmentAttempts: 1 } },
    { new: true }
  );
  if (!claimed) return null;

  try {
    await deliver(plain(claimed));
    const done = await Order.findOneAndUpdate(
      { _id: claimed._id, fulfillmentStatus: 'PROCESSING' },
      {
        $set: { fulfillmentStatus: 'DONE', fulfilledAt: new Date(), fulfillmentError: '', fulfillmentUpdatedAt: new Date() },
        $push: { statusHistory: { from: 'PAID', to: 'FULFILLED', at: new Date(), source, note: `Đã cấp quyền sử dụng (lần ${claimed.fulfillmentAttempts})` } },
      },
      { new: true }
    );
    await logEvent({ orderCode: claimed.orderCode, type: 'FULFILLMENT', source, result: 'OK', message: `Attempt ${claimed.fulfillmentAttempts}` });
    return done;
  } catch (err) {
    const gaveUp = claimed.fulfillmentAttempts >= MAX_FULFILLMENT_ATTEMPTS;
    const message = String(err && err.message ? err.message : err).slice(0, 500);
    const failed = await Order.findOneAndUpdate(
      { _id: claimed._id },
      {
        $set: {
          fulfillmentStatus: 'FAILED',
          fulfillmentError: message,
          fulfillmentUpdatedAt: new Date(),
          ...(gaveUp ? { needsReview: true, reviewReason: 'FULFILLMENT_FAILED' } : {}),
        },
        $push: { statusHistory: { from: 'PAID', to: 'FULFILLMENT_FAILED', at: new Date(), source, note: `Lần ${claimed.fulfillmentAttempts}: ${message}` } },
      },
      { new: true }
    );
    await logEvent({ orderCode: claimed.orderCode, type: 'FULFILLMENT', source, result: 'ERROR', message });
    if (gaveUp) {
      await notifyAdmins({
        type: 'system',
        message: `Đơn #${claimed.orderCode} đã thanh toán nhưng cấp quyền thất bại ${claimed.fulfillmentAttempts} lần: ${message}`,
        link: '/admin/billing',
        metadata: { orderCode: claimed.orderCode },
      }).catch(() => {});
    }
    return failed;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------------------------------------------

async function nextOrderCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = Date.now() + Math.floor(Math.random() * 1000);
    if (!(await Order.exists({ orderCode: code }))) return code;
  }
  return Date.now() + Math.floor(Math.random() * 100000);
}

/**
 * Creates (or reuses) the checkout of one product for one user.
 * @param {object} p
 * @param {object} p.user       billing account { id, name, email }
 * @param {string} p.productKey e.g. SUB:pro, TPL:<id>, UI:<id>
 * @param {object} p.data       order fields (orderType, amount, subtotal, discount, ...): the price snapshot
 * @param {object} p.link       { description, returnPath, cancelPath }
 */
async function createCheckout({ user, productKey, data, link }) {
  if (!payos.isConfigured()) {
    throw httpError(503, 'PAYMENT_NOT_CONFIGURED', 'Cổng thanh toán chưa được cấu hình. Vui lòng thử lại sau.');
  }
  const front = payos.frontendUrl();
  const amount = Number(data.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw httpError(400, 'INVALID_AMOUNT', 'Số tiền thanh toán không hợp lệ');

  // In-memory dev fallback (no MongoDB): legacy behaviour without lifecycle tracking.
  if (!dbOn()) {
    const orderCode = Date.now();
    await billing.createOrder({ ...data, orderCode, userId: String(user.id), customer: { name: user.name, email: user.email }, status: 'PENDING' });
    const created = await payos.createPaymentLink({
      orderCode,
      amount,
      description: link.description,
      returnUrl: `${front}/payment/result/?orderCode=${orderCode}`,
      cancelUrl: `${front}${link.cancelPath}`,
    });
    return { orderCode, amount, checkoutUrl: created.checkoutUrl, mock: created.mock, reused: false, expiresAt: null };
  }

  const userId = String(user.id);
  const now = Date.now();
  const open = await Order.find({ userId, productKey, status: { $in: OPEN_STATUSES } }).sort({ createdAt: -1 });

  const verifying = open.find((o) => o.status === 'VERIFYING');
  if (verifying) {
    throw httpError(
      409,
      'PAYMENT_VERIFYING',
      `Đơn #${verifying.orderCode} cho sản phẩm này đang được xác minh với ngân hàng. Vui lòng chờ kết quả, không thanh toán lại để tránh bị trừ tiền hai lần.`,
      { orderCode: verifying.orderCode }
    );
  }

  // Same product, same price, link still valid: send the customer back to the same payment (closed tab, back button).
  const mode = payos.describeMode();
  const reusable = open.find((o) => o.status === 'PENDING' && o.checkoutUrl && o.amount === amount &&
    (o.months || 1) === (data.months || 1) && (o.promoCode || '') === (data.promoCode || '') &&
    o.paymentMode === mode && o.expiresAt && new Date(o.expiresAt).getTime() - now > 2 * 60 * 1000);
  if (reusable) {
    await logEvent({ orderCode: reusable.orderCode, type: 'LINK_CREATE', source: 'user', result: 'DUPLICATE', message: 'Reused open checkout' });
    return {
      orderCode: reusable.orderCode,
      amount,
      checkoutUrl: reusable.checkoutUrl,
      mock: mode === 'mock',
      reused: true,
      expiresAt: reusable.expiresAt,
    };
  }

  // Close older open orders of this product (verifying each with payOS first so a paid one is never cancelled).
  for (const old of open) {
    const closed = await cancelOrder(old.orderCode, { reason: 'SUPERSEDED', source: 'system', note: 'Thay bằng đơn hàng mới' });
    if (closed && closed.status === 'PAID') {
      throw httpError(409, 'ALREADY_PAID', `Đơn #${old.orderCode} trước đó của bạn đã thanh toán thành công.`, { orderCode: old.orderCode });
    }
    if (closed && closed.status === 'VERIFYING') {
      throw httpError(409, 'PAYMENT_VERIFYING', `Đơn #${old.orderCode} đang được xác minh. Vui lòng chờ kết quả trước khi tạo đơn mới.`, { orderCode: old.orderCode });
    }
  }

  const openCount = await Order.countDocuments({ userId, status: 'PENDING', expiresAt: { $gt: new Date() } });
  if (openCount >= MAX_OPEN_ORDERS_PER_USER) {
    throw httpError(429, 'TOO_MANY_OPEN_ORDERS', 'Bạn có quá nhiều đơn hàng chưa thanh toán. Vui lòng hoàn tất hoặc hủy bớt trước khi tạo đơn mới.');
  }

  const orderCode = await nextOrderCode();
  const expiresAt = new Date(now + ttlMinutes() * 60 * 1000);
  const order = await Order.create({
    ...data,
    orderCode,
    userId,
    productKey,
    amount,
    currency: 'VND',
    customer: { name: user.name, email: user.email },
    status: 'PENDING',
    expiresAt,
    paymentMode: mode,
    statusHistory: [{ from: '', to: 'PENDING', at: new Date(now), source: 'user', note: `Tạo đơn ${fmt(amount)}, hiệu lực ${ttlMinutes()} phút` }],
  });

  let created;
  try {
    created = await payos.createPaymentLink({
      orderCode,
      amount,
      description: link.description,
      returnUrl: `${front}/payment/result/?orderCode=${orderCode}`,
      cancelUrl: `${front}/payment/result/?orderCode=${orderCode}&cancelled=1&back=${encodeURIComponent(link.cancelPath)}`,
      expiresAt,
    });
  } catch (err) {
    await transition(order, ['PENDING'], 'FAILED', {
      source: 'system',
      note: `Không tạo được link thanh toán: ${err.message}`,
      set: { cancelReason: 'LINK_CREATE_FAILED', cancelledAt: new Date() },
    });
    await logEvent({ orderCode, type: 'LINK_CREATE', source: 'system', result: 'ERROR', message: err.message });
    // A timed-out request may still have created the link on payOS: close it so it cannot be paid.
    payos.cancelPaymentLink(orderCode, 'Link creation failed').catch(() => {});
    throw httpError(
      err.statusCode || 502,
      err.code || 'PAYMENT_GATEWAY_UNAVAILABLE',
      'Không kết nối được cổng thanh toán. Bạn chưa bị trừ tiền, vui lòng thử lại sau ít phút.',
      { orderCode }
    );
  }

  await Order.updateOne({ _id: order._id }, { $set: { checkoutUrl: created.checkoutUrl, paymentLinkId: created.paymentLinkId || '' } });
  await logEvent({ orderCode, type: 'LINK_CREATE', source: created.mock ? 'mock' : 'payos', result: 'OK', amount });
  return { orderCode, amount, checkoutUrl: created.checkoutUrl, mock: created.mock, reused: false, expiresAt };
}

// ---------------------------------------------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------------------------------------------

/**
 * Marks an order paid exactly once and starts delivery.
 * @returns {{ result: 'PAID'|'DUPLICATE'|'AMOUNT_MISMATCH'|'UNKNOWN_ORDER', order }}
 */
async function confirmPayment({ orderCode, amount, reference = '', gatewayStatus = 'PAID', source = 'system', raw = null, actor = null, note = '', _retry = 0 }) {
  const code = Number(orderCode);

  if (!dbOn()) {
    const order = await billing.findOrder(code);
    if (!order) return { result: 'UNKNOWN_ORDER', order: null };
    if (amount != null && Number(amount) !== Number(order.amount)) return { result: 'AMOUNT_MISMATCH', order };
    const marked = await billing.markPaid(code, raw);
    if (marked && !marked.already) await deliver(order);
    return { result: marked && marked.already ? 'DUPLICATE' : 'PAID', order: await billing.findOrder(code) };
  }

  const order = await Order.findOne({ orderCode: code });
  if (!order) {
    await logEvent({ orderCode: code, type: source === 'webhook' ? 'WEBHOOK' : 'STATUS_CHECK', source, result: 'IGNORED', message: 'Unknown order', amount, reference });
    return { result: 'UNKNOWN_ORDER', order: null };
  }

  if (isReturnSettled(order)) {
    // Money of this order is being sent back as a mistake; any new payment signal needs a human.
    await Order.updateOne({ _id: order._id }, { $set: { needsReview: true, reviewReason: `PAYMENT_AFTER_RETURN: ${reference || fmt(amount)}` } });
    await logEvent({ orderCode: code, type: source === 'webhook' ? 'WEBHOOK' : 'STATUS_CHECK', source, result: 'REVIEW', message: 'Payment signal on an order whose money is being returned', amount, reference });
    await notifyAdmins({ type: 'system', message: `Đơn #${code} đã/đang được trả lại tiền nhưng lại nhận tín hiệu thanh toán (${reference || fmt(amount)}).`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
    return { result: 'IGNORED', order };
  }

  if (order.status === 'PAID' || order.status === 'REFUNDED') {
    const known = [order.gatewayReference, ...(order.extraTransactions || []).map((t) => t.reference)].filter(Boolean);
    if (reference && order.gatewayReference && !known.includes(reference)) {
      // A second, different bank transaction for an order already paid: the customer paid twice.
      await Order.updateOne(
        { _id: order._id },
        {
          $set: { needsReview: true, reviewReason: `DUPLICATE_TRANSACTION: ${reference}` },
          $push: { extraTransactions: { reference, amount: Number(amount) || 0, at: new Date(), source } },
        }
      );
      await notifyAdmins({ type: 'system', message: `Đơn #${code} nhận thêm một giao dịch khác (${reference}, ${fmt(amount)}). Cần trả lại tiền thu thừa.`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
    }
    if (order.status === 'PAID' && ['PENDING', 'FAILED'].includes(order.fulfillmentStatus)) {
      await runFulfillment(code, { source });
    }
    return { result: 'DUPLICATE', order: await Order.findOne({ orderCode: code }) };
  }

  // Paid less than the price: nothing is delivered until an Admin decides (top-up or return the partial amount).
  // Paid more: the order is fully paid and delivered; the surplus is flagged for an excess return.
  const overpaid = amount != null && Number(amount) > Number(order.amount);
  if (amount != null && Number(amount) < Number(order.amount)) {
    const reason = `AMOUNT_MISMATCH: nhận ${fmt(amount)}, đơn ${fmt(order.amount)}`;
    const updated = await transition(order, [...OPEN_STATUSES, ...CLOSED_UNPAID], 'VERIFYING', {
      source,
      note: reason,
      set: { needsReview: true, reviewReason: reason, paidAmount: Number(amount), gatewayReference: reference || order.gatewayReference, gatewayStatus },
    });
    await notifyAdmins({ type: 'system', message: `Đơn #${code}: số tiền nhận được không khớp (${reason}).`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
    return { result: 'AMOUNT_MISMATCH', order: updated || order };
  }

  const late = CLOSED_UNPAID.includes(order.status);
  const now = new Date();
  const updated = await transition(order, [...OPEN_STATUSES, ...CLOSED_UNPAID], 'PAID', {
    source,
    actor,
    note: note || (late ? `Thanh toán đến sau khi đơn đã ${order.status}` : 'Xác nhận thanh toán thành công'),
    set: {
      paidAt: now,
      paidAmount: amount != null ? Number(amount) : (order.paidAmount ?? order.amount),
      gatewayReference: reference || order.gatewayReference || '',
      gatewayStatus,
      fulfillmentStatus: 'PENDING',
      fulfillmentUpdatedAt: now,
      raw: raw || order.raw || null,
      ...(late ? { needsReview: true, reviewReason: `LATE_PAYMENT: thanh toán sau khi đơn ${order.status}` } : {}),
      ...(overpaid ? { needsReview: true, reviewReason: `OVERPAID: nhận ${fmt(amount)}, đơn ${fmt(order.amount)} – cần trả lại ${fmt(Number(amount) - Number(order.amount))}` } : {}),
    },
  });

  if (!updated) {
    // Lost the race: someone else changed the order between our read and write. Retry once from the fresh state.
    const fresh = await Order.findOne({ orderCode: code });
    if (fresh && (fresh.status === 'PAID' || fresh.status === 'REFUNDED')) return { result: 'DUPLICATE', order: fresh };
    if (_retry >= 1) {
      await logEvent({ orderCode: code, type: 'STATUS_CHECK', source, result: 'ERROR', message: `Could not mark paid from status ${fresh && fresh.status}`, amount, reference });
      return { result: 'IGNORED', order: fresh };
    }
    return confirmPayment({ orderCode: code, amount, reference, gatewayStatus, source, raw, actor, note, _retry: _retry + 1 });
  }
  if (overpaid) {
    await notifyAdmins({ type: 'system', message: `Đơn #${code}: khách chuyển thừa ${fmt(Number(amount) - Number(order.amount))}. Cần trả lại tiền thu thừa.`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
  }

  if (late) {
    await notifyAdmins({ type: 'system', message: `Đơn #${code} được thanh toán sau khi đã ${order.status}. Đã cấp quyền, cần kiểm tra.`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
  }
  await runFulfillment(code, { source });
  return { result: 'PAID', order: await Order.findOne({ orderCode: code }) };
}

/**
 * Asks payOS what happened to the order and applies it. Gateway errors move an overdue order to VERIFYING instead
 * of failing it.
 */
async function verifyOrder(orderCode, { source = 'status_check', actor = null, throttle = false } = {}) {
  if (!dbOn()) return billing.findOrder(orderCode);
  const code = Number(orderCode);
  let order = await Order.findOne({ orderCode: code });
  if (!order) return null;
  if (!['PENDING', 'VERIFYING', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(order.status)) return order;
  if (isReturnSettled(order)) return order;
  if (throttle && order.lastVerifiedAt && Date.now() - order.lastVerifiedAt.getTime() < STATUS_CHECK_THROTTLE_MS) return order;

  // Mock orders have no gateway: only the local expiry applies.
  if (order.paymentMode === 'mock' || payos.isMockMode()) {
    if (order.status === 'PENDING' && isExpired(order)) {
      order = (await transition(order, ['PENDING'], 'EXPIRED', { source, note: 'Hết thời hạn thanh toán' })) || order;
      await logEvent({ orderCode: code, type: 'EXPIRE', source, result: 'OK', fromStatus: 'PENDING', toStatus: 'EXPIRED' });
    }
    return order;
  }

  const info = await payos.getPaymentLinkInformation(code);
  await Order.updateOne(
    { _id: order._id },
    { $set: { lastVerifiedAt: new Date(), ...(info.ok && info.status ? { gatewayStatus: info.status } : {}) }, $inc: { verifyAttempts: 1 } }
  );
  const interesting = !info.ok || info.status !== 'PENDING' || order.status !== 'PENDING';
  if (interesting) {
    await logEvent({
      orderCode: code,
      type: 'STATUS_CHECK',
      source,
      actor,
      result: info.ok ? 'OK' : 'ERROR',
      message: info.ok ? '' : info.error,
      gatewayStatus: info.status || '',
      amount: info.amountPaid ?? null,
      reference: info.reference || '',
    });
  }

  if (!info.ok) {
    if (order.status === 'PENDING' && isExpired(order)) {
      order = (await transition(order, ['PENDING'], 'VERIFYING', {
        source,
        note: 'Đơn hết hạn nhưng không kết nối được payOS: đang xác minh, chưa kết luận',
      })) || order;
    }
    return order;
  }

  switch (info.status) {
    case 'PAID': {
      if (order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'FAILED' || OPEN_STATUSES.includes(order.status)) {
        const { order: paid } = await confirmPayment({
          orderCode: code,
          amount: info.amountPaid || info.amount,
          reference: info.reference,
          gatewayStatus: 'PAID',
          source,
          actor,
          raw: info.raw,
        });
        return paid;
      }
      return order;
    }
    case 'UNDERPAID': {
      const reason = `UNDERPAID: đã nhận ${fmt(info.amountPaid)} / ${fmt(order.amount)}`;
      const updated = await transition(order, [...OPEN_STATUSES, ...CLOSED_UNPAID], 'VERIFYING', {
        source,
        note: reason,
        set: { needsReview: true, reviewReason: reason, paidAmount: info.amountPaid, gatewayReference: info.reference || '' },
      });
      if (updated && !order.needsReview) {
        await notifyAdmins({ type: 'system', message: `Đơn #${code}: khách chuyển thiếu tiền (${reason}).`, link: '/admin/billing', metadata: { orderCode: code } }).catch(() => {});
      }
      return updated || order;
    }
    case 'PROCESSING':
      return (await transition(order, ['PENDING'], 'VERIFYING', { source, note: 'payOS đang xử lý giao dịch' })) || order;
    case 'CANCELLED':
      return (await transition(order, OPEN_STATUSES, 'CANCELLED', {
        source,
        note: 'Link thanh toán đã bị hủy trên payOS',
        set: { cancelledAt: new Date(), cancelReason: order.cancelReason || 'GATEWAY_CANCELLED' },
      })) || order;
    case 'EXPIRED':
      return (await transition(order, OPEN_STATUSES, 'EXPIRED', { source, note: 'Link thanh toán đã hết hạn trên payOS' })) || order;
    case 'FAILED':
      return (await transition(order, OPEN_STATUSES, 'FAILED', { source, note: 'payOS báo giao dịch thất bại', set: { cancelReason: 'GATEWAY_FAILED' } })) || order;
    case 'NOT_FOUND':
      if (OPEN_STATUSES.includes(order.status) && isExpired(order)) {
        return (await transition(order, OPEN_STATUSES, 'EXPIRED', { source, note: 'payOS không có link cho đơn này' })) || order;
      }
      return order;
    case 'PENDING':
    default: {
      if (!isExpired(order)) {
        // We were unsure (gateway unreachable) and payOS now says it is simply unpaid and still valid.
        if (order.status === 'VERIFYING' && !order.needsReview) {
          return (await transition(order, ['VERIFYING'], 'PENDING', { source, note: 'payOS xác nhận đơn vẫn chờ thanh toán' })) || order;
        }
        return order;
      }
      if (!OPEN_STATUSES.includes(order.status) || order.needsReview) return order;
      const cancelled = await payos.cancelPaymentLink(code, 'Expired');
      if (!cancelled.ok) {
        return (await transition(order, ['PENDING'], 'VERIFYING', { source, note: `Đơn hết hạn, chưa đóng được link payOS: ${cancelled.error}` })) || order;
      }
      const expired = await transition(order, OPEN_STATUSES, 'EXPIRED', { source, note: 'Hết thời hạn thanh toán, đã đóng link payOS' });
      await logEvent({ orderCode: code, type: 'EXPIRE', source, result: 'OK', fromStatus: order.status, toStatus: 'EXPIRED' });
      return expired || order;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Cancellation (before payment)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Cancels an unpaid order. Always asks payOS first: if the customer has in fact paid, the order is confirmed instead.
 * Customers can only cancel PENDING; Admin can also close a VERIFYING order once payOS confirms it is unpaid.
 */
async function cancelOrder(orderCode, { reason = 'USER_CANCELLED', source = 'user', actor = null, note = '', userId = null } = {}) {
  if (!dbOn()) throw httpError(503, 'DB_UNAVAILABLE', 'Chức năng hủy đơn cần cơ sở dữ liệu');
  const code = Number(orderCode);
  let order = await Order.findOne({ orderCode: code });
  if (!order || (userId && String(order.userId) !== String(userId))) {
    throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  if (order.status === 'CANCELLED' || order.status === 'EXPIRED' || order.status === 'FAILED') return order;
  const allowed = source === 'admin' ? OPEN_STATUSES : ['PENDING'];
  if (!allowed.includes(order.status)) {
    const message = order.status === 'VERIFYING'
      ? 'Đơn đang được xác minh với ngân hàng nên chưa thể hủy. Nếu bạn đã chuyển tiền, hệ thống sẽ tự cập nhật.'
      : 'Chỉ hủy được đơn chưa thanh toán. Với đơn đã thanh toán, vui lòng gửi yêu cầu hoàn tiền.';
    throw httpError(409, 'CANNOT_CANCEL', message);
  }

  if (order.paymentMode !== 'mock' && !payos.isMockMode()) {
    const info = await payos.getPaymentLinkInformation(code);
    if (!info.ok) {
      throw httpError(503, 'PAYMENT_GATEWAY_UNAVAILABLE', 'Chưa kiểm tra được trạng thái với cổng thanh toán. Vui lòng thử lại sau ít phút.');
    }
    if (info.status === 'PAID' || info.status === 'UNDERPAID' || info.status === 'PROCESSING') {
      return verifyOrder(code, { source, actor });
    }
    if (info.status === 'PENDING') {
      const cancelled = await payos.cancelPaymentLink(code, reason);
      if (!cancelled.ok) {
        // Re-check: the customer may have paid in between.
        const again = await payos.getPaymentLinkInformation(code);
        if (again.ok && again.status !== 'PENDING' && again.status !== 'CANCELLED') return verifyOrder(code, { source, actor });
        note = `${note} (chưa đóng được link payOS: ${cancelled.error}; nếu khách vẫn trả, đơn sẽ được ghi nhận là thanh toán trễ)`.trim();
      }
    }
    order = await Order.findOne({ orderCode: code });
  }

  const updated = await transition(order, allowed, 'CANCELLED', {
    source,
    actor,
    note: note || 'Hủy đơn chưa thanh toán',
    set: { cancelledAt: new Date(), cancelReason: reason },
  });
  await logEvent({ orderCode: code, type: 'CANCEL', source, actor, result: updated ? 'OK' : 'IGNORED', message: reason, fromStatus: order.status, toStatus: 'CANCELLED' });
  return updated || (await Order.findOne({ orderCode: code }));
}

// ---------------------------------------------------------------------------------------------------------------
// Refunds (after payment)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Refund policy: only subscription plans are refundable. Digital products (Template, UI Marketplace) are delivered
 * as files/rights the buyer keeps the moment payment succeeds, so they are final sale and never refunded.
 */
const REFUNDABLE_ORDER_TYPES = ['SUBSCRIPTION'];
const DIGITAL_NO_REFUND_MESSAGE = 'Sản phẩm số (Template, UI Marketplace) không áp dụng hoàn tiền sau khi thanh toán. Chỉ gói đăng ký được hoàn tiền.';

function isRefundableOrder(order) {
  return Boolean(order) && REFUNDABLE_ORDER_TYPES.includes(order.orderType || 'SUBSCRIPTION');
}

function refundEligibility(order) {
  if (!order) return { ok: false, reason: 'Không tìm thấy đơn hàng' };
  if (!isRefundableOrder(order)) return { ok: false, reason: DIGITAL_NO_REFUND_MESSAGE };
  if (order.status !== 'PAID') return { ok: false, reason: 'Chỉ hoàn tiền cho đơn đã thanh toán' };
  const status = (order.refund && order.refund.status) || 'NONE';
  if (status === 'REQUESTED' || status === 'APPROVED') return { ok: false, reason: 'Đơn đang có yêu cầu hoàn tiền' };
  if (status === 'REJECTED') return { ok: false, reason: 'Yêu cầu hoàn tiền của đơn này đã bị từ chối' };
  if (status === 'COMPLETED') return { ok: false, reason: 'Đơn đã được hoàn tiền' };
  const days = refundWindowDays();
  const paidAt = order.paidAt ? new Date(order.paidAt).getTime() : 0;
  if (!paidAt || Date.now() - paidAt > days * DAY_MS) return { ok: false, reason: `Đã quá thời hạn ${days} ngày để yêu cầu hoàn tiền` };
  return { ok: true };
}

async function requestRefund(orderCode, { userId, reason }) {
  if (!dbOn()) throw httpError(503, 'DB_UNAVAILABLE', 'Chức năng hoàn tiền cần cơ sở dữ liệu');
  const text = String(reason || '').trim();
  if (text.length < 10) throw httpError(400, 'REASON_REQUIRED', 'Vui lòng nêu lý do hoàn tiền (tối thiểu 10 ký tự)');
  const order = await Order.findOne({ orderCode: Number(orderCode) });
  if (!order || String(order.userId) !== String(userId)) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  const eligible = refundEligibility(order);
  if (!eligible.ok) throw httpError(409, 'REFUND_NOT_ALLOWED', eligible.reason);

  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'PAID', 'refund.status': { $in: ['NONE', null] } },
    {
      $set: {
        'refund.status': 'REQUESTED',
        'refund.reason': text.slice(0, 1000),
        'refund.amount': order.amount,
        'refund.requestedAt': now,
        'refund.requestedBy': mongoose.isValidObjectId(String(userId)) ? userId : null,
      },
      $push: { statusHistory: { from: 'PAID', to: 'REFUND_REQUESTED', at: now, source: 'user', note: text.slice(0, 500) } },
    },
    { new: true }
  );
  if (!updated) throw httpError(409, 'REFUND_NOT_ALLOWED', 'Đơn đang có yêu cầu hoàn tiền');
  await logEvent({ orderCode: order.orderCode, type: 'REFUND', source: 'user', result: 'OK', message: 'REQUESTED', amount: order.amount });
  await notifyAdmins({
    type: 'refund_request',
    message: `Yêu cầu hoàn tiền đơn #${order.orderCode} (${fmt(order.amount)}): ${text.slice(0, 120)}`,
    link: '/admin/billing',
    metadata: { orderCode: order.orderCode, amount: order.amount },
  }).catch(() => {});
  return updated;
}

/** Removes what a refunded subscription granted: the plan time is shortened by the purchased months. */
async function revokeOrderAccess(order) {
  if (order.orderType === 'SUBSCRIPTION' && mongoose.isValidObjectId(String(order.userId))) {
    const User = require('../models/User');
    const user = await User.findById(order.userId);
    if (user && user.planExpiresAt) {
      const left = user.planExpiresAt.getTime() - Math.max(1, Number(order.months) || 1) * 30 * DAY_MS;
      if (left <= Date.now()) {
        user.plan = 'free';
        user.planExpiresAt = null;
      } else {
        user.planExpiresAt = new Date(left);
      }
      await user.save();
    }
  }
}

/**
 * Admin refund workflow (subscriptions only): APPROVE (also opens a refund nobody requested) -> COMPLETE (money sent
 * back, reference recorded, plan time revoked) or REJECT. payOS has no refund API, so the transfer is made manually.
 */
async function processRefund(orderCode, { action, admin, note = '', reference = '', proof = '', revokeAccess = true }) {
  if (!dbOn()) throw httpError(503, 'DB_UNAVAILABLE', 'Chức năng hoàn tiền cần cơ sở dữ liệu');
  const order = await Order.findOne({ orderCode: Number(orderCode) });
  if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  const current = (order.refund && order.refund.status) || 'NONE';
  const now = new Date();
  const adminId = admin && admin._id ? admin._id : null;
  const text = String(note || '').trim();

  // Digital products can never be approved or paid back; an old pending request on one can only be rejected.
  if ((action === 'APPROVE' || action === 'COMPLETE') && !isRefundableOrder(order)) {
    throw httpError(409, 'REFUND_NOT_ALLOWED', DIGITAL_NO_REFUND_MESSAGE);
  }

  if (action === 'APPROVE') {
    if (order.status !== 'PAID' || !['REQUESTED', 'NONE'].includes(current)) {
      throw httpError(409, 'REFUND_STATE', `Không thể duyệt hoàn tiền khi đơn ${order.status} / hoàn tiền ${current}`);
    }
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: 'PAID', 'refund.status': current },
      {
        $set: {
          'refund.status': 'APPROVED',
          'refund.amount': order.paidAmount ?? order.amount,
          'refund.reviewedAt': now,
          'refund.reviewedBy': adminId,
          'refund.adminNote': text,
          ...(current === 'NONE' ? { 'refund.reason': text || 'Admin chủ động hoàn tiền', 'refund.requestedAt': now } : {}),
        },
        $push: { statusHistory: { from: 'PAID', to: 'REFUND_APPROVED', at: now, source: 'admin', note: text, actor: adminId } },
      },
      { new: true }
    );
    if (!updated) throw httpError(409, 'REFUND_STATE', 'Trạng thái hoàn tiền vừa thay đổi, vui lòng tải lại');
    await afterRefundStep(updated, 'APPROVED', admin, `Yêu cầu hoàn tiền đơn #${order.orderCode} đã được duyệt. Tiền sẽ được chuyển lại trong thời gian sớm nhất.`);
    return updated;
  }

  if (action === 'REJECT') {
    if (current !== 'REQUESTED') throw httpError(409, 'REFUND_STATE', 'Chỉ từ chối được yêu cầu đang chờ duyệt');
    if (!text) throw httpError(400, 'NOTE_REQUIRED', 'Vui lòng nhập lý do từ chối');
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, 'refund.status': 'REQUESTED' },
      {
        $set: { 'refund.status': 'REJECTED', 'refund.reviewedAt': now, 'refund.reviewedBy': adminId, 'refund.adminNote': text },
        $push: { statusHistory: { from: 'PAID', to: 'REFUND_REJECTED', at: now, source: 'admin', note: text, actor: adminId } },
      },
      { new: true }
    );
    if (!updated) throw httpError(409, 'REFUND_STATE', 'Trạng thái hoàn tiền vừa thay đổi, vui lòng tải lại');
    await afterRefundStep(updated, 'REJECTED', admin, `Yêu cầu hoàn tiền đơn #${order.orderCode} bị từ chối. Lý do: ${text}`);
    return updated;
  }

  if (action === 'COMPLETE') {
    if (order.status !== 'PAID' || current !== 'APPROVED') throw httpError(409, 'REFUND_STATE', 'Chỉ hoàn tất được yêu cầu đã duyệt');
    const ref = String(reference || '').trim();
    if (!ref) throw httpError(400, 'REFERENCE_REQUIRED', 'Vui lòng nhập mã giao dịch chuyển khoản hoàn tiền');
    const updated = await transition(order, ['PAID'], 'REFUNDED', {
      source: 'admin',
      actor: adminId,
      note: `Đã hoàn ${fmt(order.refund.amount || order.amount)} – mã GD ${ref}${text ? ` – ${text}` : ''}`,
      set: {
        'refund.status': 'COMPLETED',
        'refund.reference': ref,
        'refund.proof': String(proof || '').trim(),
        'refund.completedAt': now,
        'refund.revokeAccess': Boolean(revokeAccess),
        ...(text ? { 'refund.adminNote': text } : {}),
      },
    });
    if (!updated) throw httpError(409, 'REFUND_STATE', 'Trạng thái đơn vừa thay đổi, vui lòng tải lại');
    if (revokeAccess) {
      try {
        await revokeOrderAccess(plain(updated));
      } catch (err) {
        await Order.updateOne({ _id: updated._id }, { $set: { needsReview: true, reviewReason: `REVOKE_FAILED: ${err.message}` } });
        await logEvent({ orderCode: order.orderCode, type: 'REFUND', source: 'admin', actor: adminId, result: 'ERROR', message: `Revoke failed: ${err.message}` });
      }
    }
    await afterRefundStep(updated, 'COMPLETED', admin, `Đơn #${order.orderCode} đã được hoàn ${fmt(updated.refund.amount || order.amount)} (mã GD ${ref}).`);
    return Order.findOne({ _id: updated._id });
  }

  throw httpError(400, 'INVALID_ACTION', 'Hành động không hợp lệ (APPROVE | REJECT | COMPLETE)');
}

async function afterRefundStep(order, step, admin, message) {
  await logEvent({
    orderCode: order.orderCode,
    type: 'REFUND',
    source: 'admin',
    actor: admin && admin._id ? admin._id : null,
    result: 'OK',
    message: step,
    amount: order.refund ? order.refund.amount : order.amount,
    reference: order.refund ? order.refund.reference : '',
  });
  if (mongoose.isValidObjectId(String(order.userId))) {
    await notifyUser({
      recipientId: order.userId,
      actorId: admin && admin._id ? admin._id : null,
      type: 'refund_update',
      message,
      link: '/settings/#billing',
      metadata: { orderCode: order.orderCode, refundStatus: step },
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Excess return: money collected by mistake (not a refund – the customer keeps what they validly bought)
// ---------------------------------------------------------------------------------------------------------------

const DIGITAL_ORDER_TYPES = ['TEMPLATE_PURCHASE', 'UI_PURCHASE'];
const EXCESS_LABEL = {
  DUPLICATE_ORDER: 'Thu trùng – khách đã mua sản phẩm này ở đơn khác',
  OVERPAID: 'Thu thừa – khách chuyển nhiều hơn giá đơn',
  PARTIAL_PAYMENT: 'Thu thiếu – trả lại số tiền khách đã chuyển và đóng đơn',
};

/** Total the customer actually paid for the order: payOS when reachable, otherwise what we recorded. */
async function receivedTotal(order) {
  const extra = (order.extraTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const paidBase = order.paidAmount != null
    ? Number(order.paidAmount)
    : (order.status === 'PAID' || order.status === 'REFUNDED' || order.status === 'VOIDED' ? Number(order.amount) : 0);
  const local = paidBase + extra;
  if (order.paymentMode === 'payos' && payos.hasKeys() && !payos.isMockMode()) {
    const info = await payos.getPaymentLinkInformation(order.orderCode);
    if (info.ok && Number.isFinite(info.amountPaid)) {
      return { total: Math.max(info.amountPaid, local), local, gateway: info.amountPaid, gatewayStatus: info.status, source: 'payos' };
    }
    return { total: local, local, gateway: null, source: 'local', gatewayError: info.error || '' };
  }
  return { total: local, local, gateway: null, source: 'local' };
}

/** Another PAID order of the same buyer for the same digital product (the one that keeps the access). */
async function findKeptOrder(order) {
  if (!DIGITAL_ORDER_TYPES.includes(order.orderType)) return null;
  const sameProduct = order.orderType === 'TEMPLATE_PURCHASE'
    ? { templateId: order.templateId }
    : { productId: order.productId };
  return Order.findOne({ _id: { $ne: order._id }, userId: order.userId, orderType: order.orderType, status: 'PAID', ...sameProduct })
    .sort({ paidAt: 1, createdAt: 1 })
    .select('orderCode paidAt amount');
}

/**
 * What can be returned for this order, computed by the server (never from the client):
 *  - DUPLICATE_ORDER : digital product already owned through another PAID order → return this whole order.
 *  - OVERPAID        : paid order received more than its price → return the surplus.
 *  - PARTIAL_PAYMENT : unpaid order received less than its price → return what was received and close the order.
 */
async function excessReturnOptions(order) {
  const er = order.excessReturn || {};
  if (er.status === 'PENDING' || er.status === 'COMPLETED') return { received: null, options: [] };
  const received = await receivedTotal(order);
  const options = [];

  if (order.status === 'PAID' && DIGITAL_ORDER_TYPES.includes(order.orderType)) {
    const kept = await findKeptOrder(order);
    if (kept) {
      options.push({
        type: 'DUPLICATE_ORDER',
        amount: received.total,
        keepOrderCode: kept.orderCode,
        reason: `Khách đã sở hữu sản phẩm qua đơn #${kept.orderCode}; đơn này là thanh toán trùng`,
      });
    }
  }
  if (order.status === 'PAID' && received.total > Number(order.amount)) {
    options.push({ type: 'OVERPAID', amount: received.total - Number(order.amount), reason: `Nhận ${fmt(received.total)} cho đơn ${fmt(order.amount)}` });
  }
  if (['VERIFYING', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(order.status) && received.total > 0 && received.total < Number(order.amount)) {
    options.push({ type: 'PARTIAL_PAYMENT', amount: received.total, reason: `Khách mới chuyển ${fmt(received.total)} / ${fmt(order.amount)}` });
  }
  return { received, options };
}

async function notifyExcess(order, admin, message) {
  if (!mongoose.isValidObjectId(String(order.userId))) return;
  await notifyUser({
    recipientId: order.userId,
    actorId: admin && admin._id ? admin._id : null,
    type: 'refund_update',
    message,
    link: '/settings/#billing',
    metadata: { orderCode: order.orderCode, excessReturn: order.excessReturn && order.excessReturn.status },
  }).catch(() => {});
}

/**
 * Admin-only workflow, independent from the refund policy:
 *   CREATE   { type, amount, note }  – only a type the server detected, amount ≤ the detected surplus
 *   COMPLETE { reference, proof, note } – money sent back, bank reference recorded
 *   CANCEL   { note }                 – opened by mistake (not allowed for PARTIAL_PAYMENT: its link is closed)
 */
async function processExcessReturn(orderCode, { action, admin, type, amount, note = '', reference = '', proof = '' }) {
  if (!dbOn()) throw httpError(503, 'DB_UNAVAILABLE', 'Chức năng trả lại tiền cần cơ sở dữ liệu');
  const order = await Order.findOne({ orderCode: Number(orderCode) });
  if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  const adminId = admin && admin._id ? admin._id : null;
  const text = String(note || '').trim();
  const now = new Date();
  const current = (order.excessReturn && order.excessReturn.status) || 'NONE';
  const act = String(action || '').toUpperCase();

  if (act === 'CREATE') {
    if (current === 'PENDING' || current === 'COMPLETED') throw httpError(409, 'EXCESS_STATE', 'Đơn đã có yêu cầu trả lại tiền');
    const { received, options } = await excessReturnOptions(order);
    const option = options.find((o) => o.type === String(type || '').toUpperCase());
    if (!option) {
      throw httpError(409, 'EXCESS_NOT_DETECTED', 'Không phát hiện khoản thu trùng/thừa loại này cho đơn. Hãy chạy xác minh hoặc đối soát trước.');
    }
    const value = amount === undefined || amount === null || amount === '' ? option.amount : Number(amount);
    if (!Number.isInteger(value) || value <= 0 || value > option.amount) {
      throw httpError(400, 'INVALID_AMOUNT', `Số tiền trả lại phải là số nguyên từ 1 đến ${fmt(option.amount)}`);
    }
    const record = {
      'excessReturn.status': 'PENDING',
      'excessReturn.type': option.type,
      'excessReturn.amount': value,
      'excessReturn.receivedTotal': received.total,
      'excessReturn.keepOrderCode': option.keepOrderCode || null,
      'excessReturn.reason': text ? `${option.reason} – ${text}` : option.reason,
      'excessReturn.createdAt': now,
      'excessReturn.createdBy': adminId,
      'excessReturn.reference': '',
      'excessReturn.proof': '',
      'excessReturn.completedAt': null,
      'excessReturn.completedBy': null,
    };
    const historyNote = `Mở trả lại ${fmt(value)}: ${EXCESS_LABEL[option.type]}${text ? ` – ${text}` : ''}`;
    let updated;

    if (option.type === 'DUPLICATE_ORDER') {
      // Void the duplicate now: it stops counting as revenue and as Creator earnings. Access stays with the kept order.
      updated = await transition(order, ['PAID'], 'VOIDED', { source: 'admin', actor: adminId, note: historyNote, set: record });
      // Two admins voiding both copies at once would leave the buyer with nothing: keep at least one PAID order.
      if (updated && !(await Order.exists({ orderCode: option.keepOrderCode, status: 'PAID' }))) {
        await transition(updated, ['VOIDED'], 'PAID', {
          source: 'system',
          note: 'Hoàn tác: đơn được giữ quyền không còn ở trạng thái PAID',
          set: { 'excessReturn.status': 'CANCELLED', 'excessReturn.note': 'Auto-cancelled: kept order no longer PAID' },
        });
        throw httpError(409, 'EXCESS_STATE', `Đơn #${option.keepOrderCode} không còn PAID nên không thể coi đơn này là trùng`);
      }
      if (updated) {
        const Entitlement = require('../models/Entitlement');
        const productType = order.orderType === 'TEMPLATE_PURCHASE' ? 'TEMPLATE' : 'UI_PRODUCT';
        const productId = String(order.orderType === 'TEMPLATE_PURCHASE' ? order.templateId : order.productId);
        await Entitlement.updateOne({ userId: order.userId, productType, productId, orderCode: order.orderCode }, { $set: { orderCode: option.keepOrderCode } });
        if (order.orderType === 'UI_PURCHASE') {
          const MarketplacePurchase = require('../models/MarketplacePurchase');
          await MarketplacePurchase.updateOne(
            { user: order.userId, templateId: productId, transactionId: `order_${order.orderCode}` },
            { $set: { transactionId: `order_${option.keepOrderCode}` } }
          );
        }
      }
    } else if (option.type === 'PARTIAL_PAYMENT') {
      // Close the payment link first so the customer cannot top up while we send the money back.
      if (order.paymentMode === 'payos' && !payos.isMockMode()) {
        const closed = await payos.cancelPaymentLink(order.orderCode, 'Partial payment returned');
        if (!closed.ok && !['CANCELLED', 'EXPIRED'].includes(received.gatewayStatus)) {
          throw httpError(503, 'PAYMENT_GATEWAY_UNAVAILABLE', `Chưa đóng được link payOS (${closed.error}). Thử lại để tránh khách tiếp tục chuyển tiền.`);
        }
      }
      updated = await transition(order, ['VERIFYING', 'CANCELLED', 'EXPIRED', 'FAILED'], 'CANCELLED', {
        source: 'admin',
        actor: adminId,
        note: historyNote,
        set: { ...record, cancelledAt: order.cancelledAt || now, cancelReason: 'PARTIAL_PAYMENT_RETURN' },
      });
    } else {
      updated = await Order.findOneAndUpdate(
        { _id: order._id, status: 'PAID', 'excessReturn.status': { $nin: ['PENDING', 'COMPLETED'] } },
        { $set: record, $push: { statusHistory: { from: 'PAID', to: 'EXCESS_RETURN_OPENED', at: now, source: 'admin', note: historyNote, actor: adminId } } },
        { new: true }
      );
    }
    if (!updated) throw httpError(409, 'EXCESS_STATE', 'Trạng thái đơn vừa thay đổi, vui lòng tải lại');
    await logEvent({ orderCode: order.orderCode, type: 'REFUND', source: 'admin', actor: adminId, result: 'OK', message: `EXCESS_RETURN_CREATE ${option.type}`, amount: value });
    await notifyExcess(updated, admin, `Đơn #${order.orderCode}: hệ thống phát hiện thu ${option.type === 'PARTIAL_PAYMENT' ? 'chưa đủ' : 'trùng/thừa'} và sẽ trả lại ${fmt(value)} cho bạn.`);
    return updated;
  }

  if (act === 'COMPLETE') {
    if (current !== 'PENDING') throw httpError(409, 'EXCESS_STATE', 'Chỉ hoàn tất được yêu cầu trả lại đang chờ');
    const ref = String(reference || '').trim();
    if (!ref) throw httpError(400, 'REFERENCE_REQUIRED', 'Vui lòng nhập mã giao dịch chuyển khoản trả lại');
    const er = order.excessReturn;
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, 'excessReturn.status': 'PENDING' },
      {
        $set: {
          'excessReturn.status': 'COMPLETED',
          'excessReturn.reference': ref,
          'excessReturn.proof': String(proof || '').trim(),
          'excessReturn.note': text,
          'excessReturn.completedAt': now,
          'excessReturn.completedBy': adminId,
          needsReview: false,
        },
        $push: { statusHistory: { from: order.status, to: 'EXCESS_RETURNED', at: now, source: 'admin', note: `Đã trả lại ${fmt(er.amount)} – mã GD ${ref}${text ? ` – ${text}` : ''}`, actor: adminId } },
      },
      { new: true }
    );
    if (!updated) throw httpError(409, 'EXCESS_STATE', 'Trạng thái vừa thay đổi, vui lòng tải lại');
    await logEvent({ orderCode: order.orderCode, type: 'REFUND', source: 'admin', actor: adminId, result: 'OK', message: `EXCESS_RETURN_COMPLETE ${er.type}`, amount: er.amount, reference: ref });
    await notifyExcess(updated, admin, `Đơn #${order.orderCode}: đã trả lại ${fmt(er.amount)} tiền thu trùng/thừa (mã GD ${ref}).`);
    return updated;
  }

  if (act === 'CANCEL') {
    if (current !== 'PENDING') throw httpError(409, 'EXCESS_STATE', 'Chỉ hủy được yêu cầu trả lại đang chờ');
    if (!text) throw httpError(400, 'NOTE_REQUIRED', 'Vui lòng nhập lý do hủy');
    const er = order.excessReturn;
    if (er.type === 'PARTIAL_PAYMENT') {
      throw httpError(409, 'EXCESS_STATE', 'Link thanh toán đã đóng nên không thể mở lại đơn: hãy hoàn tất việc trả lại tiền.');
    }
    const set = { 'excessReturn.status': 'CANCELLED', 'excessReturn.note': text };
    let updated;
    if (er.type === 'DUPLICATE_ORDER') {
      // Opened by mistake: the order is a sale again.
      updated = await transition(order, ['VOIDED'], 'PAID', { source: 'admin', actor: adminId, note: `Hủy trả lại tiền: ${text}`, set });
    } else {
      updated = await Order.findOneAndUpdate(
        { _id: order._id, 'excessReturn.status': 'PENDING' },
        { $set: set, $push: { statusHistory: { from: order.status, to: 'EXCESS_RETURN_CANCELLED', at: now, source: 'admin', note: text, actor: adminId } } },
        { new: true }
      );
    }
    if (!updated) throw httpError(409, 'EXCESS_STATE', 'Trạng thái vừa thay đổi, vui lòng tải lại');
    await logEvent({ orderCode: order.orderCode, type: 'REFUND', source: 'admin', actor: adminId, result: 'OK', message: `EXCESS_RETURN_CANCEL ${er.type}: ${text}` });
    return updated;
  }

  throw httpError(400, 'INVALID_ACTION', 'Hành động không hợp lệ (CREATE | COMPLETE | CANCEL)');
}

// ---------------------------------------------------------------------------------------------------------------
// Admin manual actions
// ---------------------------------------------------------------------------------------------------------------

/** Admin records a payment confirmed outside the webhook (bank statement). Requires a reference and a note. */
async function adminMarkPaid(orderCode, { admin, reference, note }) {
  const ref = String(reference || '').trim();
  const text = String(note || '').trim();
  if (!ref || !text) throw httpError(400, 'REFERENCE_REQUIRED', 'Cần mã giao dịch ngân hàng và ghi chú đối soát');
  const order = await Order.findOne({ orderCode: Number(orderCode) });
  if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  if (order.status === 'PAID' || order.status === 'REFUNDED') throw httpError(409, 'ALREADY_PAID', 'Đơn đã được ghi nhận thanh toán');

  // Prefer the gateway's own answer when it is reachable.
  if (order.paymentMode === 'payos' && !payos.isMockMode()) {
    const verified = await verifyOrder(order.orderCode, { source: 'admin', actor: admin._id });
    if (verified && verified.status === 'PAID') return verified;
  }
  const { order: paid } = await confirmPayment({
    orderCode: order.orderCode,
    amount: undefined,
    reference: ref,
    gatewayStatus: 'MANUAL',
    source: 'admin',
    actor: admin._id,
    note: `Admin xác nhận thủ công: ${text}`,
  });
  await Order.updateOne({ orderCode: order.orderCode }, { $set: { needsReview: false, reviewReason: `MANUAL_CONFIRM: ${text}`.slice(0, 300) } });
  await logEvent({ orderCode: order.orderCode, type: 'ADMIN_ACTION', source: 'admin', actor: admin._id, result: 'OK', message: `MARK_PAID: ${text}`, reference: ref });
  return (await Order.findOne({ orderCode: order.orderCode })) || paid;
}

async function resolveReview(orderCode, { admin, note }) {
  const text = String(note || '').trim();
  if (!text) throw httpError(400, 'NOTE_REQUIRED', 'Vui lòng ghi chú cách đã xử lý');
  const order = await Order.findOneAndUpdate(
    { orderCode: Number(orderCode) },
    {
      $set: { needsReview: false },
      $push: { statusHistory: { from: '', to: 'REVIEW_RESOLVED', at: new Date(), source: 'admin', note: text, actor: admin._id } },
    },
    { new: true }
  );
  if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  await logEvent({ orderCode: order.orderCode, type: 'ADMIN_ACTION', source: 'admin', actor: admin._id, result: 'OK', message: `RESOLVE_REVIEW: ${text}` });
  return order;
}

// ---------------------------------------------------------------------------------------------------------------
// Background maintenance (expiry, verification, fulfillment retry)
// ---------------------------------------------------------------------------------------------------------------

let running = false;

async function runMaintenance() {
  if (running || !dbOn()) return;
  running = true;
  const now = Date.now();
  try {
    // Orders created before expiresAt existed get the default validity from their creation time.
    await Order.updateMany(
      { status: 'PENDING', expiresAt: null },
      [{ $set: { expiresAt: { $add: ['$createdAt', ttlMinutes() * 60 * 1000] } } }]
    );

    // 1. Overdue PENDING orders: confirm with payOS, then EXPIRED (or VERIFYING if payOS cannot be reached).
    const overdue = await Order.find({ status: 'PENDING', expiresAt: { $lte: new Date(now) } }).select('orderCode').limit(50);
    for (const o of overdue) {
      await verifyOrder(o.orderCode, { source: 'job' }).catch((err) => console.warn('[payment] expire failed', o.orderCode, err.message));
    }

    // 2. VERIFYING orders: keep asking payOS; escalate to Admin after 24h without an answer.
    const verifying = await Order.find({
      status: 'VERIFYING',
      $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lte: new Date(now - VERIFY_RECHECK_MS) } }],
    }).limit(30);
    for (const o of verifying) {
      if (!o.needsReview) {
        await verifyOrder(o.orderCode, { source: 'job' }).catch((err) => console.warn('[payment] verify failed', o.orderCode, err.message));
      }
      const fresh = await Order.findOne({ _id: o._id });
      if (fresh && fresh.status === 'VERIFYING' && !fresh.needsReview && fresh.verifyingSince && now - fresh.verifyingSince.getTime() > VERIFY_REVIEW_AFTER_MS) {
        await Order.updateOne({ _id: fresh._id }, { $set: { needsReview: true, reviewReason: 'VERIFY_TIMEOUT: quá 24h chưa xác minh được với payOS' } });
        await notifyAdmins({ type: 'system', message: `Đơn #${fresh.orderCode} quá 24h vẫn chưa xác minh được thanh toán.`, link: '/admin/billing', metadata: { orderCode: fresh.orderCode } }).catch(() => {});
      }
    }

    // 3. Delivery interrupted (process crash): template/UI grants are idempotent and retried; a subscription could
    //    already be extended, so it goes to Admin instead of being extended twice.
    const stuckBefore = new Date(now - FULFILLMENT_STUCK_MS);
    await Order.updateMany(
      { status: 'PAID', fulfillmentStatus: 'PROCESSING', fulfillmentUpdatedAt: { $lte: stuckBefore }, orderType: 'SUBSCRIPTION' },
      { $set: { fulfillmentStatus: 'FAILED', fulfillmentError: 'Bị gián đoạn khi gia hạn gói', fulfillmentAttempts: MAX_FULFILLMENT_ATTEMPTS, needsReview: true, reviewReason: 'FULFILLMENT_STUCK: kiểm tra hạn gói trước khi thử lại' } }
    );
    await Order.updateMany(
      { status: 'PAID', fulfillmentStatus: 'PROCESSING', fulfillmentUpdatedAt: { $lte: stuckBefore }, orderType: { $ne: 'SUBSCRIPTION' } },
      { $set: { fulfillmentStatus: 'FAILED', fulfillmentError: 'Bị gián đoạn khi cấp quyền' } }
    );

    // 4. Retry delivery with exponential backoff (1, 2, 4, 8 minutes).
    const retry = await Order.find({
      status: 'PAID',
      $or: [
        { fulfillmentStatus: 'FAILED', fulfillmentAttempts: { $lt: MAX_FULFILLMENT_ATTEMPTS } },
        { fulfillmentStatus: 'PENDING', fulfillmentUpdatedAt: { $lte: new Date(now - 60 * 1000) } },
      ],
    }).limit(20);
    for (const o of retry) {
      const wait = o.fulfillmentStatus === 'FAILED' ? Math.pow(2, Math.max(0, o.fulfillmentAttempts - 1)) * 60 * 1000 : 0;
      if (o.fulfillmentUpdatedAt && now - o.fulfillmentUpdatedAt.getTime() < wait) continue;
      await runFulfillment(o.orderCode, { source: 'job' }).catch((err) => console.warn('[payment] fulfillment retry failed', o.orderCode, err.message));
    }
  } catch (err) {
    console.error('[payment] maintenance failed:', err.message);
  } finally {
    running = false;
  }
}

let timer = null;
function startJobs() {
  if (timer) return;
  const every = Math.max(15000, Number(process.env.PAYMENT_JOB_INTERVAL_MS) || 60000);
  timer = setInterval(() => { runMaintenance(); }, every);
  if (timer.unref) timer.unref();
  if (!payos.isConfigured()) {
    console.warn('⚠️  [payment] payOS chưa cấu hình và chế độ mock bị tắt: checkout sẽ trả 503.');
  } else if (payos.isMockMode()) {
    console.warn(`⚠️  [payment] Đang chạy MOCK PAYMENT${payos.isProduction() ? ' TRÊN PRODUCTION' : ''}: đơn hàng có thể xác nhận mà không cần trả tiền.`);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------------------------------------------

function issue(order, code, message, extra = {}) {
  return {
    orderCode: order.orderCode,
    code,
    message,
    status: order.status,
    amount: order.amount,
    userId: order.userId,
    createdAt: order.createdAt,
    ...extra,
  };
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Compares local orders with payOS for a date range (max 31 days, 300 orders).
 * With autoFix: confirms payments payOS has but we missed, closes overdue orders and retries failed deliveries.
 * Discrepancies that need a human (paid locally but not on payOS, amount mismatch, double transactions) are only reported.
 */
async function reconcile({ from, to, autoFix = false, admin = null } = {}) {
  if (!dbOn()) throw httpError(503, 'DB_UNAVAILABLE', 'Đối soát cần cơ sở dữ liệu');
  const end = to ? new Date(to) : new Date();
  let start = from ? new Date(from) : new Date(end.getTime() - 7 * DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw httpError(400, 'INVALID_RANGE', 'Khoảng thời gian không hợp lệ');
  if (end.getTime() - start.getTime() > 31 * DAY_MS) start = new Date(end.getTime() - 31 * DAY_MS);

  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(300);
  const gatewayOn = payos.hasKeys() && !payos.isMockMode();
  const issues = [];
  const fixed = [];
  let gatewayChecked = 0;

  await mapLimit(orders, 5, async (o) => {
    const now = Date.now();
    if (o.status === 'PAID' && ['PENDING', 'FAILED', 'PROCESSING'].includes(o.fulfillmentStatus)) {
      issues.push(issue(o, 'FULFILLMENT_INCOMPLETE', `Đã thanh toán nhưng chưa cấp quyền (${o.fulfillmentStatus}, ${o.fulfillmentAttempts} lần): ${o.fulfillmentError || ''}`));
      if (autoFix && o.fulfillmentStatus !== 'PROCESSING' && !(o.orderType === 'SUBSCRIPTION' && o.needsReview)) {
        const r = await runFulfillment(o.orderCode, { source: 'reconcile', force: true });
        if (r) fixed.push({ orderCode: o.orderCode, action: 'RETRY_FULFILLMENT', result: r.fulfillmentStatus });
      }
    }
    if (o.status === 'PENDING' && isExpired(o, now)) {
      issues.push(issue(o, 'EXPIRED_NOT_CLOSED', 'Đơn quá hạn nhưng chưa được đóng'));
      if (autoFix) {
        const r = await verifyOrder(o.orderCode, { source: 'reconcile' });
        if (r) fixed.push({ orderCode: o.orderCode, action: 'VERIFY', result: r.status });
      }
    }
    if (o.status === 'VERIFYING') issues.push(issue(o, 'UNRESOLVED_VERIFYING', `Đang xác minh từ ${o.verifyingSince ? o.verifyingSince.toISOString() : '?'}`));
    if (o.needsReview) issues.push(issue(o, 'NEEDS_REVIEW', o.reviewReason || 'Cần Admin kiểm tra'));
    if (o.refund && o.refund.status === 'APPROVED' && o.refund.reviewedAt && now - o.refund.reviewedAt.getTime() > 3 * DAY_MS) {
      issues.push(issue(o, 'REFUND_NOT_COMPLETED', 'Đã duyệt hoàn tiền hơn 3 ngày nhưng chưa ghi nhận chuyển khoản'));
    }
    if (o.status === 'PAID' && o.paymentMode === 'payos' && !o.gatewayReference && o.gatewayStatus !== 'MANUAL') {
      issues.push(issue(o, 'PAID_WITHOUT_REFERENCE', 'Đơn PAID nhưng không có mã giao dịch ngân hàng'));
    }

    const er = o.excessReturn || {};
    if (er.status === 'PENDING' && er.createdAt && now - er.createdAt.getTime() > 3 * DAY_MS) {
      issues.push(issue(o, 'EXCESS_RETURN_NOT_COMPLETED', `Đã mở trả lại ${fmt(er.amount)} (${er.type}) hơn 3 ngày nhưng chưa ghi nhận chuyển khoản`));
    }

    // Orders whose money is being returned are expected to differ from payOS (paid there, voided here).
    if (isReturnSettled(o)) return;
    if (!gatewayOn || o.paymentMode === 'mock' || (o.status === 'FAILED' && o.cancelReason === 'LINK_CREATE_FAILED')) return;
    gatewayChecked += 1;
    const info = await payos.getPaymentLinkInformation(o.orderCode);
    if (!info.ok) {
      issues.push(issue(o, 'GATEWAY_UNREACHABLE', `Không tra được payOS: ${info.error}`));
      return;
    }
    const localPaid = o.status === 'PAID' || o.status === 'REFUNDED';
    if (info.status === 'PAID' && !localPaid) {
      issues.push(issue(o, 'MISSED_PAYMENT', 'payOS đã nhận tiền nhưng đơn chưa được ghi nhận PAID', { gatewayStatus: info.status, gatewayAmount: info.amountPaid }));
      if (autoFix) {
        const r = await confirmPayment({ orderCode: o.orderCode, amount: info.amountPaid || info.amount, reference: info.reference, source: 'reconcile', raw: info.raw });
        fixed.push({ orderCode: o.orderCode, action: 'CONFIRM_PAYMENT', result: r.result });
      }
    }
    if (localPaid && info.status !== 'PAID' && o.gatewayStatus !== 'MANUAL') {
      issues.push(issue(o, 'PAID_NOT_ON_GATEWAY', `Đơn ${o.status} nhưng payOS báo ${info.status}`, { gatewayStatus: info.status }));
    }
    if (info.status === 'PAID' && info.amountPaid && info.amountPaid !== o.amount) {
      const returned = er.type === 'OVERPAID' && er.status !== 'CANCELLED' ? er.amount : 0;
      if (info.amountPaid - o.amount !== returned) {
        issues.push(issue(o, info.amountPaid > o.amount ? 'OVERPAID' : 'AMOUNT_MISMATCH', `payOS nhận ${fmt(info.amountPaid)}, đơn ${fmt(o.amount)}${returned ? `, đã mở trả lại ${fmt(returned)}` : ''}`, { gatewayAmount: info.amountPaid }));
      }
    }
    if (info.status === 'UNDERPAID' && !localPaid) {
      issues.push(issue(o, 'PARTIAL_PAYMENT', `Khách mới trả ${fmt(info.amountPaid)} / ${fmt(o.amount)}: bổ sung hoặc trả lại tiền`, { gatewayAmount: info.amountPaid }));
    }
    if (info.transactionCount > 1) {
      issues.push(issue(o, 'MULTIPLE_TRANSACTIONS', `payOS ghi nhận ${info.transactionCount} giao dịch cho một đơn`));
    }
    if (localPaid && info.reference && o.gatewayReference && info.reference !== o.gatewayReference) {
      issues.push(issue(o, 'REFERENCE_MISMATCH', `Mã GD local ${o.gatewayReference} khác payOS ${info.reference}`));
    }
  });

  // Same buyer paid the same template / UI product more than once.
  const duplicates = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'PAID', orderType: { $in: ['TEMPLATE_PURCHASE', 'UI_PURCHASE'] } } },
    { $group: { _id: { userId: '$userId', orderType: '$orderType', templateId: '$templateId', productId: '$productId' }, count: { $sum: 1 }, orders: { $push: '$orderCode' }, amount: { $sum: '$amount' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  duplicates.forEach((d) => {
    issues.push({
      orderCode: d.orders[0],
      code: 'DUPLICATE_PURCHASE',
      message: `Khách trả ${d.count} lần cho cùng sản phẩm (đơn ${d.orders.join(', ')}), tổng ${fmt(d.amount)}`,
      orders: d.orders,
      userId: d._id.userId,
      amount: d.amount,
    });
  });

  const [totals] = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
        paidAmount: { $sum: { $cond: [{ $in: ['$status', ['PAID', 'REFUNDED']] }, '$amount', 0] } },
        refundedCount: { $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, 1, 0] } },
        refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, { $ifNull: ['$refund.amount', '$amount'] }, 0] } },
        netAdminRevenue: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, { $ifNull: ['$adminRevenue', '$amount'] }, 0] } },
        netCreatorEarnings: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, { $ifNull: ['$creatorEarnings', 0] }, 0] } },
        verifyingCount: { $sum: { $cond: [{ $eq: ['$status', 'VERIFYING'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
      },
    },
  ]);

  const summary = {
    from: start,
    to: end,
    checkedOrders: orders.length,
    gatewayChecked,
    gatewayEnabled: gatewayOn,
    truncated: orders.length >= 300,
    totals: totals ? { ...totals, _id: undefined } : {},
    issueCount: issues.length,
    issuesByCode: issues.reduce((acc, i) => ({ ...acc, [i.code]: (acc[i.code] || 0) + 1 }), {}),
  };

  await logEvent({
    type: 'RECONCILE',
    source: 'admin',
    actor: admin && admin._id ? admin._id : null,
    result: issues.length ? 'MISMATCH' : 'OK',
    message: `${orders.length} đơn, ${issues.length} vấn đề, ${fixed.length} đã sửa`,
    payload: { summary, issues: issues.slice(0, 200), fixed, autoFix },
  });

  return { summary, issues, fixed };
}

module.exports = {
  MAX_FULFILLMENT_ATTEMPTS,
  dbOn,
  ttlMinutes,
  refundWindowDays,
  displayStatus,
  publicOrder,
  refundEligibility,
  isRefundableOrder,
  isReturnSettled,
  excessReturnOptions,
  processExcessReturn,
  REFUNDABLE_ORDER_TYPES,
  DIGITAL_NO_REFUND_MESSAGE,
  logEvent,
  createCheckout,
  confirmPayment,
  verifyOrder,
  cancelOrder,
  runFulfillment,
  requestRefund,
  processRefund,
  adminMarkPaid,
  resolveReview,
  reconcile,
  runMaintenance,
  startJobs,
  httpError,
};
