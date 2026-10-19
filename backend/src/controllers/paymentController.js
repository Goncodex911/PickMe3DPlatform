const { listPlans, getPlan } = require('../config/plans');
const billing = require('../services/billingStore');
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

exports.myOrders = async (req, res) => {
  const data = await billing.listOrders(req.user.id);
  res.json({ success: true, data });
};

exports.checkout = async (req, res, next) => {
  try {
    const planId = req.body?.planId;
    const plan = getPlan(planId);
    const months = Math.min(12, Math.max(1, Number(req.body?.months) || 1));
    if (!plan || plan.price <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    const amount = plan.price * months;
    const orderCode = Date.now();
    await billing.createOrder({
      orderCode,
      userId: req.user.id,
      planId,
      months,
      amount,
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
