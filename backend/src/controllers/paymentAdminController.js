/**
 * Admin payment operations: order detail with full trace, manual verification, fulfillment retry, manual
 * confirmation, cancellation, refunds and reconciliation with payOS. Every action is written to the AuditLog and
 * to the order's PaymentEvent trail.
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const PaymentEvent = require('../models/PaymentEvent');
const User = require('../models/User');
const lifecycle = require('../services/paymentLifecycle');
const { logAdminAction } = require('../helpers/auditLogger');

async function audit(req, action, order, details = {}) {
  await logAdminAction(req, {
    action,
    targetType: 'order',
    targetId: order ? order.orderCode : req.params.orderCode,
    targetLabel: order ? `#${order.orderCode} – ${Number(order.amount || 0).toLocaleString('vi-VN')}₫` : `#${req.params.orderCode}`,
    details,
  });
}

function adminView(order) {
  const o = order.toObject ? order.toObject() : order;
  delete o.raw;
  return { ...o, displayStatus: lifecycle.displayStatus(o) };
}

// @route GET /api/admin/payments/:orderCode
exports.getPaymentDetail = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderCode: Number(req.params.orderCode) }).populate('statusHistory.actor', 'name email').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    const [events, customer, excess] = await Promise.all([
      PaymentEvent.find({ orderCode: order.orderCode }).sort({ createdAt: -1 }).limit(100).populate('actor', 'name email').lean(),
      mongoose.isValidObjectId(String(order.userId)) ? User.findById(order.userId).select('name email picture plan planExpiresAt').lean() : null,
      lifecycle.excessReturnOptions(order).catch((err) => ({ received: null, options: [], error: err.message })),
    ]);
    return res.json({ success: true, data: { order: adminView(order), events, customer, excess } });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/verify – ask payOS now
exports.verifyPayment = async (req, res, next) => {
  try {
    const order = await lifecycle.verifyOrder(req.params.orderCode, { source: 'admin', actor: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    await audit(req, 'PAYMENT_VERIFY', order, { status: order.status, gatewayStatus: order.gatewayStatus });
    return res.json({ success: true, message: `Trạng thái hiện tại: ${order.status}`, data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/retry-fulfillment
exports.retryFulfillment = async (req, res, next) => {
  try {
    const before = await Order.findOne({ orderCode: Number(req.params.orderCode) });
    if (!before) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    if (before.status !== 'PAID' || !['PENDING', 'FAILED'].includes(before.fulfillmentStatus)) {
      return res.status(409).json({ success: false, message: `Không thể cấp quyền lại (đơn ${before.status}, cấp quyền ${before.fulfillmentStatus})` });
    }
    const order = await lifecycle.runFulfillment(before.orderCode, { source: 'admin', force: true });
    await audit(req, 'PAYMENT_RETRY_FULFILLMENT', before, { result: order ? order.fulfillmentStatus : 'NOT_CLAIMED', error: order ? order.fulfillmentError : '' });
    const fresh = await Order.findOne({ orderCode: before.orderCode });
    const ok = fresh.fulfillmentStatus === 'DONE';
    return res.status(ok ? 200 : 500).json({
      success: ok,
      message: ok ? 'Đã cấp quyền thành công' : `Cấp quyền thất bại: ${fresh.fulfillmentError}`,
      data: adminView(fresh),
    });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/mark-paid { reference, note }
exports.markPaid = async (req, res, next) => {
  try {
    const { reference, note } = req.body || {};
    const order = await lifecycle.adminMarkPaid(req.params.orderCode, { admin: req.user, reference, note });
    await audit(req, 'PAYMENT_MANUAL_CONFIRM', order, { reference, note, status: order.status });
    return res.json({ success: true, message: 'Đã ghi nhận thanh toán', data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/cancel { note }
exports.cancelPayment = async (req, res, next) => {
  try {
    const note = String((req.body && req.body.note) || '').trim();
    if (!note) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy' });
    const order = await lifecycle.cancelOrder(req.params.orderCode, { reason: 'ADMIN_CANCELLED', source: 'admin', actor: req.user._id, note });
    await audit(req, 'PAYMENT_CANCEL', order, { note, status: order.status });
    return res.json({ success: true, message: `Trạng thái: ${order.status}`, data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/resolve-review { note }
exports.resolveReview = async (req, res, next) => {
  try {
    const order = await lifecycle.resolveReview(req.params.orderCode, { admin: req.user, note: req.body && req.body.note });
    await audit(req, 'PAYMENT_RESOLVE_REVIEW', order, { note: req.body && req.body.note });
    return res.json({ success: true, message: 'Đã đánh dấu đã xử lý', data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route GET /api/admin/refunds?status=REQUESTED|APPROVED|REJECTED|COMPLETED|open
exports.listRefunds = async (req, res, next) => {
  try {
    const status = String(req.query.status || 'open').toUpperCase();
    const filter = status === 'OPEN'
      ? { 'refund.status': { $in: ['REQUESTED', 'APPROVED'] } }
      : status === 'ALL'
        ? { 'refund.status': { $in: ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] } }
        : { 'refund.status': status };
    const rows = await Order.find(filter).sort({ 'refund.requestedAt': -1 }).limit(200).select('-raw -statusHistory').lean();
    return res.json({ success: true, data: rows.map(adminView) });
  } catch (err) {
    return next(err);
  }
};

// @route PUT /api/admin/refunds/:orderCode { action: APPROVE|REJECT|COMPLETE, note, reference, proof, revokeAccess }
exports.processRefund = async (req, res, next) => {
  try {
    const { action, note, reference, proof, revokeAccess = true } = req.body || {};
    const order = await lifecycle.processRefund(req.params.orderCode, {
      action: String(action || '').toUpperCase(),
      admin: req.user,
      note,
      reference,
      proof,
      revokeAccess: revokeAccess !== false,
    });
    await audit(req, `REFUND_${String(action || '').toUpperCase()}`, order, {
      note,
      reference,
      proof,
      revokeAccess: revokeAccess !== false,
      refundAmount: order.refund && order.refund.amount,
    });
    return res.json({ success: true, message: 'Đã cập nhật hoàn tiền', data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/:orderCode/excess-return
//        { action: CREATE|COMPLETE|CANCEL, type: DUPLICATE_ORDER|OVERPAID|PARTIAL_PAYMENT, amount, note, reference, proof }
// Returns money collected by mistake. Independent from refunds: allowed for digital products too.
exports.processExcessReturn = async (req, res, next) => {
  try {
    const { action, type, amount, note, reference, proof } = req.body || {};
    const order = await lifecycle.processExcessReturn(req.params.orderCode, { action, admin: req.user, type, amount, note, reference, proof });
    const er = order.excessReturn || {};
    await audit(req, `EXCESS_RETURN_${String(action || '').toUpperCase()}`, order, {
      type: er.type,
      amount: er.amount,
      keepOrderCode: er.keepOrderCode,
      reference,
      proof,
      note,
      orderStatus: order.status,
    });
    return res.json({ success: true, message: 'Đã cập nhật trả lại tiền', data: adminView(order) });
  } catch (err) {
    return next(err);
  }
};

// @route POST /api/admin/payments/reconcile { from, to, autoFix }
exports.reconcile = async (req, res, next) => {
  try {
    const { from, to, autoFix = false } = req.body || {};
    const report = await lifecycle.reconcile({ from, to, autoFix: autoFix === true, admin: req.user });
    await audit(req, 'PAYMENT_RECONCILE', null, { from: report.summary.from, to: report.summary.to, autoFix: autoFix === true, issues: report.summary.issueCount, fixed: report.fixed.length });
    return res.json({ success: true, data: report });
  } catch (err) {
    return next(err);
  }
};

// @route GET /api/admin/payments/events?type=&result=&orderCode= – webhook / verification / action trail
exports.listEvents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type && req.query.type !== 'all') filter.type = String(req.query.type).toUpperCase();
    if (req.query.result && req.query.result !== 'all') filter.result = String(req.query.result).toUpperCase();
    if (req.query.orderCode) filter.orderCode = Number(req.query.orderCode);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await PaymentEvent.find(filter).sort({ createdAt: -1 }).limit(limit).populate('actor', 'name email').lean();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};
