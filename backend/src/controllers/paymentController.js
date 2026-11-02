const { listPlans, getPlan } = require('../config/plans');
const billing = require('../services/billingStore');
const { quote } = require('../services/promoService');
const payos = require('../services/payosService');

exports.plans = (req, res) => {
  res.json({
    success: true,
    mock: payos.isMockMode(),
    data: listPlans().map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      quotas: plan.quotas,
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
    const data = await billing.listOrders(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.checkout = async (req, res, next) => {
  try {
    const pricing = quote(req.body || {});
    const { planId, months, amount } = pricing;
    const plan = getPlan(planId);
    const orderCode = Date.now();
    await billing.createOrder({
      orderCode,
      userId: req.user.id,
      customer: { name: req.user.name, email: req.user.email },
      ...pricing,
      status: 'PENDING',
    });
    const front = payos.frontendUrl();
    const link = await payos.createPaymentLink({
      orderCode,
      amount,
      description: `PickMe ${plan.name}`.slice(0, 25),
      returnUrl: `${front}/payment/result/?orderCode=${orderCode}`,
      cancelUrl: `${front}/pricing/`,
    });
    return res.json({ success: true, orderCode, amount, checkoutUrl: link.checkoutUrl, mock: link.mock });
  } catch (err) {
    return next(err);
  }
};

exports.webhook = async (req, res) => {
  const verified = payos.verifyWebhook(req.body || {});
  if (!verified.ok) {
    return res.status(400).json({ success: false, message: verified.message });
  }
  const order = await billing.findOrder(verified.orderCode);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (Number(order.amount) !== Number(verified.amount)) {
    return res.status(400).json({ success: false, message: 'Amount mismatch' });
  }
  const marked = await billing.markPaid(order.orderCode, req.body);
  if (!marked) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!marked.already) {
    await billing.extendPlan(order.userId, order.planId, order.months);
  }
  return res.json({ success: true, idempotent: marked.already });
};

exports.status = async (req, res) => {
  const order = await billing.findOrder(req.params.orderCode);
  if (!order || String(order.userId) !== String(req.user.id)) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  if (order.status === 'PENDING' && !payos.isMockMode()) {
    const info = await payos.getPaymentLinkInformation(order.orderCode);
    if (info.status === 'PAID') {
      const marked = await billing.markPaid(order.orderCode, info.raw);
      if (marked && !marked.already) await billing.extendPlan(order.userId, order.planId, order.months);
      const fresh = await billing.findOrder(order.orderCode);
      return res.json({ success: true, data: fresh });
    }
  }
  return res.json({ success: true, data: order });
};

exports.quote = (req, res, next) => {
  try { res.json({ success: true, data: quote(req.body || {}) }); }
  catch (err) { next(err); }
};

exports.receipt = async (req, res, next) => {
  try {
    const order = await billing.findOrder(req.params.orderCode);
    if (!order || String(order.userId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    if (order.status !== 'PAID') {
      return res.status(409).json({ success: false, message: 'Biên lai chỉ có sau khi thanh toán thành công' });
    }
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: {
      ...order, receiptNumber: `PM3D-${order.orderCode}`,
      customer: order.customer || { name: req.user.name, email: req.user.email }, currency: 'VND',
      documentType: 'PAYMENT_RECEIPT',
    } });
  } catch (err) { next(err); }
};
