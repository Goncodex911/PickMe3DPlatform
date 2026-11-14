const { listPlans, getPlan } = require('../config/plans');
const billing = require('../services/billingStore');
const { quote } = require('../services/promoService');
const payos = require('../services/payosService');
const lifecycle = require('../services/paymentLifecycle');
const mongoose = require('mongoose');
const { isAdmin } = require('../config/permissions');
const {
  templateOwnerType,
  isTemplateOwner,
  hasTemplateEntitlement,
  hasUiProduct,
} = require('../services/accessService');
const uiProducts = require('../services/uiProductService');

/** attachUser gives a billing account without role; authorization needs the stored User. */
async function loadDbUser(account) {
  const id = String((account && account.id) || '');
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(id)) return null;
  const User = require('../models/User');
  return User.findById(id);
}

/** Loads an order of the current user (404 for anybody else's order). */
async function ownOrder(req) {
  const code = Number(req.params.orderCode);
  if (!Number.isFinite(code)) return null;
  if (lifecycle.dbOn()) {
    const Order = require('../models/Order');
    const order = await Order.findOne({ orderCode: code });
    return order && String(order.userId) === String(req.user.id) ? order : null;
  }
  const order = await billing.findOrder(code);
  return order && String(order.userId) === String(req.user.id) ? order : null;
}

function checkoutResponse(res, result, extra = {}) {
  return res.json({
    success: true,
    orderCode: result.orderCode,
    amount: result.amount,
    checkoutUrl: result.checkoutUrl,
    mock: result.mock,
    reused: result.reused,
    expiresAt: result.expiresAt,
    ...extra,
  });
}

/**
 * Checkout a paid UI Marketplace product. Price always comes from the server price list (S22).
 * @route POST /api/payments/checkout-ui
 */
exports.checkoutUiProduct = async (req, res, next) => {
  try {
    const productId = String((req.body && req.body.productId) || '').trim();
    const product = uiProducts.getCatalogProduct(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm UI' });
    }
    const buyer = await loadDbUser(req.user);
    if (!buyer) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập bằng tài khoản hợp lệ để mua sản phẩm' });
    }
    // BR-06 / BR-14: Admin owns the UI Marketplace and never buys from it.
    if (isAdmin(buyer)) {
      return res.status(409).json({ success: false, code: 'SELF_PURCHASE', message: 'Admin sở hữu UI Marketplace nên không cần mua' });
    }
    const price = await uiProducts.getPrice(product.id);
    if (price <= 0) {
      return res.status(400).json({ success: false, code: 'FREE_PRODUCT', message: 'Sản phẩm này miễn phí, không cần thanh toán' });
    }
    if (await hasUiProduct(buyer, product.id)) {
      return res.status(409).json({ success: false, code: 'ALREADY_ENTITLED', message: 'Bạn đã sở hữu sản phẩm này' });
    }

    const result = await lifecycle.createCheckout({
      user: req.user,
      productKey: `UI:${product.id}`,
      data: {
        orderType: 'UI_PURCHASE',
        productId: product.id,
        productTitle: product.title,
        sellerId: null,
        sellerType: 'ADMIN',
        transactionSource: 'ADMIN_MARKETPLACE',
        amount: price,
        grossAmount: price,
        subtotal: price,
        discount: 0,
        creatorEarnings: 0,
        adminRevenue: price,
      },
      link: { description: `UI ${product.title}`, cancelPath: '/ui-marketplace/' },
    });
    return checkoutResponse(res, result);
  } catch (err) {
    return next(err);
  }
};

exports.plans = (req, res) => {
  res.json({
    success: true,
    mock: payos.isMockMode(),
    paymentAvailable: payos.isConfigured(),
    orderTtlMinutes: lifecycle.ttlMinutes(),
    refundWindowDays: lifecycle.refundWindowDays(),
    refundPolicy: {
      refundableOrderTypes: lifecycle.REFUNDABLE_ORDER_TYPES,
      digitalProducts: lifecycle.DIGITAL_NO_REFUND_MESSAGE,
    },
    data: listPlans().map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      quotas: plan.quotas,
      aiSlides: plan.aiSlides,
      blueprint3d: plan.blueprint3d,
      exportPptx: plan.exportPptx,
      privateDeck: plan.privateDeck,
      brandKit: plan.brandKit,
      watermark: plan.watermark,
    })),
  });
};

exports.me = (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.myOrders = async (req, res, next) => {
  try {
    if (lifecycle.dbOn()) {
      const Order = require('../models/Order');
      const rows = await Order.find({ userId: String(req.user.id) }).sort({ createdAt: -1 }).limit(50);
      const data = rows.map(lifecycle.publicOrder);
      // Orders created before productTitle was stored: show the template's current title instead of a generic label.
      const missing = [...new Set(data.filter((o) => o.orderType === 'TEMPLATE_PURCHASE' && !o.productTitle && o.templateId).map((o) => o.templateId))]
        .filter((id) => mongoose.isValidObjectId(id));
      if (missing.length) {
        const Template = require('../models/Template');
        const titles = new Map((await Template.find({ _id: { $in: missing } }).select('title').lean()).map((t) => [String(t._id), t.title]));
        data.forEach((o) => { if (!o.productTitle && o.templateId) o.productTitle = titles.get(o.templateId) || ''; });
      }
      return res.json({ success: true, data });
    }
    const data = await billing.listOrders(req.user.id);
    return res.json({ success: true, data: data.map(lifecycle.publicOrder) });
  } catch (err) { return next(err); }
};

/** @route GET /api/payments/orders/:orderCode – full detail with status history. */
exports.orderDetail = async (req, res, next) => {
  try {
    const order = await ownOrder(req);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    return res.json({ success: true, data: lifecycle.publicOrder(order) });
  } catch (err) { return next(err); }
};

exports.checkout = async (req, res, next) => {
  try {
    const dbUser = await loadDbUser(req.user);
    if (dbUser && isAdmin(dbUser)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Admin sở hữu Slide và 3D nên không cần mua gói đăng ký',
      });
    }
    const pricing = quote(req.body || {});
    const { planId } = pricing;
    const plan = getPlan(planId);
    const result = await lifecycle.createCheckout({
      user: req.user,
      productKey: `SUB:${planId}`,
      data: {
        orderType: 'SUBSCRIPTION',
        transactionSource: 'SUBSCRIPTION',
        sellerType: 'ADMIN',
        ...pricing,
      },
      link: { description: `PickMe ${plan.name}`, cancelPath: '/pricing/' },
    });
    return checkoutResponse(res, result);
  } catch (err) {
    return next(err);
  }
};

/**
 * Checkout a paid Template (Rule 2.1 & 3.2)
 * Free templates are rejected (Rule: Do not count free template downloads as paid orders or revenue)
 */
exports.checkoutTemplate = async (req, res, next) => {
  try {
    const { templateId, source } = req.body || {};
    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã mẫu thiết kế (templateId)' });
    }

    const Template = require('../models/Template');
    if (!mongoose.isValidObjectId(String(templateId))) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });
    }
    const template = await Template.findById(templateId).populate('author', 'name email role');
    if (!template) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });
    }

    const buyer = await loadDbUser(req.user);
    if (!buyer) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập bằng tài khoản hợp lệ để mua Template' });
    }
    const listed = template.isPublic && !['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'TAKEN_DOWN'].includes(template.reviewStatus);
    if (!listed) {
      return res.status(404).json({ success: false, message: 'Mẫu thiết kế không còn được bán' });
    }
    // BR-14: nobody buys their own product (Admin owns the system catalogue).
    if (isTemplateOwner(buyer, template)) {
      return res.status(409).json({ success: false, code: 'SELF_PURCHASE', message: 'Bạn là chủ sở hữu Template này' });
    }
    if (await hasTemplateEntitlement(buyer, template)) {
      return res.status(409).json({ success: false, code: 'ALREADY_ENTITLED', message: 'Bạn đã sở hữu quyền sử dụng Template này' });
    }

    // Rule 2.1 & 3.2: Free templates generate no revenue and must not be checked out as paid orders
    const price = Number(template.price || 0);
    if (!template.isPaid || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mẫu thiết kế này miễn phí, không tạo giao dịch thanh toán hoặc doanh thu.',
      });
    }

    // Seller = owner of the template (never inferred from the author's role).
    const sellerType = templateOwnerType(template);

    // Determine transaction source
    const transactionSource =
      source === 'ADMIN_MARKETPLACE' || template.marketplaceSource === 'ADMIN_MARKETPLACE'
        ? 'ADMIN_MARKETPLACE'
        : 'TEMPLATE_SECTION';

    // Financial split:
    // If Admin-owned or Admin Marketplace: 100% Admin, 0% Creator
    // If Creator-owned in Template Section: 70% Creator, 30% Admin
    let creatorEarnings = 0;
    let adminRevenue = price;
    if (sellerType === 'CREATOR' && transactionSource === 'TEMPLATE_SECTION') {
      creatorEarnings = Math.round(price * 0.7);
      adminRevenue = price - creatorEarnings;
    }

    const result = await lifecycle.createCheckout({
      user: req.user,
      productKey: `TPL:${template._id}`,
      data: {
        orderType: 'TEMPLATE_PURCHASE',
        templateId: template._id,
        productTitle: template.title || '',
        sellerId: sellerType === 'CREATOR' && template.author ? template.author._id : null,
        sellerType,
        transactionSource,
        amount: price,
        grossAmount: price,
        subtotal: price,
        discount: 0,
        creatorEarnings,
        adminRevenue,
      },
      link: { description: `Template ${template.title}`, cancelPath: `/templates/${template._id}` },
    });

    return checkoutResponse(res, result, { sellerType, transactionSource, creatorEarnings, adminRevenue });
  } catch (err) {
    return next(err);
  }
};

/**
 * payOS webhook. Every call is recorded. Answers:
 *  - 400 for a bad signature / malformed body (not from payOS),
 *  - 200 for anything payOS should stop retrying (processed, duplicate, unknown order, amount mismatch put on review),
 *  - 5xx only when processing crashed, so payOS retries the delivery.
 */
exports.webhook = async (req, res) => {
  const body = req.body || {};
  const verified = payos.verifyWebhook(body);
  const data = body.data || {};

  if (!verified.ok) {
    await lifecycle.logEvent({
      orderCode: Number(data.orderCode) || null,
      type: 'WEBHOOK',
      source: 'payos',
      result: verified.signatureValid ? 'IGNORED' : 'REJECTED',
      signatureValid: verified.signatureValid ?? null,
      message: verified.message,
      amount: Number(data.amount) || null,
      reference: String(data.reference || ''),
      payload: { data, code: body.code, desc: body.desc },
    });
    // A signed but unsuccessful transaction is a valid notification: acknowledge it.
    if (verified.signatureValid) return res.json({ success: true, ignored: true, message: verified.message });
    return res.status(400).json({ success: false, message: verified.message });
  }

  try {
    const outcome = await lifecycle.confirmPayment({
      orderCode: verified.orderCode,
      amount: verified.amount,
      reference: verified.reference,
      gatewayStatus: 'PAID',
      source: 'webhook',
      raw: data,
    });
    await lifecycle.logEvent({
      orderCode: verified.orderCode,
      type: 'WEBHOOK',
      source: 'payos',
      result: { PAID: 'OK', DUPLICATE: 'DUPLICATE', AMOUNT_MISMATCH: 'MISMATCH', UNKNOWN_ORDER: 'IGNORED', IGNORED: 'REVIEW' }[outcome.result] || 'OK',
      signatureValid: true,
      amount: verified.amount,
      reference: verified.reference,
      gatewayStatus: 'PAID',
      payload: data,
    });
    return res.json({ success: true, result: outcome.result, idempotent: outcome.result === 'DUPLICATE' });
  } catch (err) {
    await lifecycle.logEvent({
      orderCode: verified.orderCode,
      type: 'WEBHOOK',
      source: 'payos',
      result: 'ERROR',
      signatureValid: true,
      message: err.message,
      amount: verified.amount,
      reference: verified.reference,
      payload: data,
    });
    console.error('[payment] webhook processing failed:', err);
    return res.status(500).json({ success: false, message: 'Processing failed, please retry' });
  }
};

/**
 * Local test checkout (mock mode only): the owner confirms their own order. Never available with real payOS.
 * @route POST /api/payments/mock/confirm/:orderCode
 */
exports.mockConfirm = async (req, res, next) => {
  try {
    if (!payos.isMockMode()) {
      return res.status(403).json({ success: false, code: 'MOCK_DISABLED', message: 'Chế độ thanh toán giả lập đang tắt' });
    }
    const order = await ownOrder(req);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    if (order.paymentMode && order.paymentMode !== 'mock') {
      return res.status(409).json({ success: false, message: 'Đơn này được tạo qua payOS thật, không thể xác nhận giả lập' });
    }
    if (order.status === 'PENDING' && order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      await lifecycle.verifyOrder(order.orderCode, { source: 'user' });
      return res.status(409).json({ success: false, code: 'ORDER_EXPIRED', message: 'Đơn hàng đã hết hạn, vui lòng tạo đơn mới' });
    }
    if (order.status !== 'PENDING' && order.status !== 'PAID') {
      return res.status(409).json({ success: false, message: `Đơn đang ở trạng thái ${order.status}` });
    }
    const outcome = await lifecycle.confirmPayment({
      orderCode: order.orderCode,
      amount: order.amount,
      reference: `MOCK-${order.orderCode}`,
      gatewayStatus: 'PAID',
      source: 'mock',
    });
    await lifecycle.logEvent({ orderCode: order.orderCode, type: 'MOCK_CONFIRM', source: 'mock', result: outcome.result === 'PAID' ? 'OK' : outcome.result, amount: order.amount });
    return res.json({ success: true, result: outcome.result, data: lifecycle.publicOrder(outcome.order) });
  } catch (err) {
    return next(err);
  }
};

exports.status = async (req, res, next) => {
  try {
    let order = await ownOrder(req);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (['PENDING', 'VERIFYING'].includes(order.status) && lifecycle.dbOn()) {
      order = (await lifecycle.verifyOrder(order.orderCode, { source: 'status_check', throttle: true })) || order;
    } else if (order.status === 'PAID' && lifecycle.dbOn() && ['PENDING', 'FAILED'].includes(order.fulfillmentStatus)) {
      await lifecycle.runFulfillment(order.orderCode, { source: 'status_check' });
      order = (await ownOrder(req)) || order;
    }
    return res.json({ success: true, data: lifecycle.publicOrder(order) });
  } catch (err) {
    return next(err);
  }
};

/** @route POST /api/payments/orders/:orderCode/cancel – cancel an unpaid order. */
exports.cancel = async (req, res, next) => {
  try {
    const order = await lifecycle.cancelOrder(req.params.orderCode, {
      reason: 'USER_CANCELLED',
      source: 'user',
      userId: req.user.id,
      note: String((req.body && req.body.reason) || '').slice(0, 200) || 'Khách hàng hủy đơn',
    });
    const data = lifecycle.publicOrder(order);
    const message = data.status === 'CANCELLED'
      ? 'Đã hủy đơn hàng. Bạn chưa bị trừ tiền.'
      : data.status === 'PAID'
        ? 'Đơn này đã được thanh toán nên không thể hủy.'
        : `Đơn đang ở trạng thái ${data.status}`;
    return res.json({ success: true, message, data });
  } catch (err) {
    return next(err);
  }
};

/** @route POST /api/payments/orders/:orderCode/refund-request */
exports.requestRefund = async (req, res, next) => {
  try {
    const order = await lifecycle.requestRefund(req.params.orderCode, { userId: req.user.id, reason: req.body && req.body.reason });
    return res.json({ success: true, message: 'Đã gửi yêu cầu hoàn tiền. Admin sẽ phản hồi qua thông báo.', data: lifecycle.publicOrder(order) });
  } catch (err) {
    return next(err);
  }
};

exports.quote = (req, res, next) => {
  try { res.json({ success: true, data: quote(req.body || {}) }); }
  catch (err) { next(err); }
};

exports.receipt = async (req, res, next) => {
  try {
    const order = await ownOrder(req);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    if (order.status !== 'PAID' && order.status !== 'REFUNDED') {
      return res.status(409).json({ success: false, message: 'Biên lai chỉ có sau khi thanh toán thành công' });
    }
    const data = lifecycle.publicOrder(order);
    res.set('Cache-Control', 'private, no-store');
    return res.json({ success: true, data: {
      ...data, receiptNumber: `PM3D-${data.orderCode}`,
      customer: data.customer || { name: req.user.name, email: req.user.email }, currency: data.currency || 'VND',
      documentType: data.status === 'REFUNDED' ? 'REFUNDED_PAYMENT_RECEIPT' : 'PAYMENT_RECEIPT',
    } });
  } catch (err) { return next(err); }
};
