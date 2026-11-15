/**
 * Admin pricing of the monthly subscription plans. Admin never buys a plan (owns Slide/3D) but sets its price.
 * Features and quotas stay fixed in config/plans.js; only the price changes. Orders already created keep their amount.
 */
const planPrices = require('../services/planPriceService');
const { logAdminAction } = require('../helpers/auditLogger');

// @desc    Subscription plans with current and default prices
// @route   GET /api/admin/plans
// @access  Private/Admin
exports.listPlanPrices = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, data: await planPrices.listForAdmin() });
  } catch (error) {
    return next(error);
  }
};

// @desc    Change the monthly price of a paid plan
// @route   PUT /api/admin/plans/:planId/price   body: { price }
// @access  Private/Admin
exports.updatePlanPrice = async (req, res, next) => {
  try {
    const result = await planPrices.setPlanPrice(req.params.planId, req.body && req.body.price, req.user && req.user._id);
    if (result.error === 'NOT_CONFIGURABLE') {
      return res.status(404).json({
        success: false,
        code: 'NOT_CONFIGURABLE',
        message: 'Chỉ chỉnh được giá các gói trả phí. Gói Free luôn miễn phí.',
      });
    }
    if (result.error === 'INVALID_PRICE') {
      return res.status(400).json({ success: false, code: 'INVALID_PRICE', message: planPrices.PLAN_PRICE_ERROR });
    }

    await logAdminAction(req, {
      action: 'PLAN_PRICE_UPDATE',
      targetType: 'system',
      targetId: result.plan.id,
      targetLabel: `Gói ${result.plan.name}`,
      details: { previousPrice: result.previous, newPrice: result.plan.price, persisted: result.persisted },
    });

    return res.status(200).json({
      success: true,
      message: result.persisted
        ? 'Đã cập nhật giá gói. Đơn hàng mới sẽ dùng giá này.'
        : 'Đã cập nhật giá gói tạm thời (chưa kết nối DB nên giá sẽ mất khi khởi động lại server).',
      data: { id: result.plan.id, name: result.plan.name, price: result.plan.price, persisted: result.persisted },
    });
  } catch (error) {
    return next(error);
  }
};
