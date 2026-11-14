/**
 * Admin pricing of the UI Marketplace (BR-06). The catalogue is fixed: there is deliberately no create/delete
 * endpoint. Admin only reads the catalogue and changes the price of an existing product.
 */
const uiProducts = require('../services/uiProductService');
const { MIN_PAID_PRICE_VND, MAX_PRICE_VND } = require('../config/pricing');

// UI products are always paid: no 0 / free option here.
const PRICE_ERROR = `Giá phải là số nguyên VND từ ${MIN_PAID_PRICE_VND.toLocaleString('vi-VN')} đến ${MAX_PRICE_VND.toLocaleString('vi-VN')}`;
const { logAdminAction } = require('../helpers/auditLogger');

// @desc    UI Marketplace catalogue with current prices
// @route   GET /api/admin/ui-products
// @access  Private/Admin
exports.listUiProducts = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const pricing = String(req.query.pricing || 'all'); // all | paid | free
    let data = await uiProducts.listCatalogWithPrices();
    if (search) data = data.filter((p) => p.id.includes(search) || p.title.toLowerCase().includes(search));
    if (pricing === 'custom') data = data.filter((p) => p.isCustom);
    if (pricing === 'default') data = data.filter((p) => !p.isCustom);
    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    return next(error);
  }
};

// @desc    Set the price of an existing UI product (0 = free)
// @route   PUT /api/admin/ui-products/:productId/price
// @access  Private/Admin
exports.updateUiProductPrice = async (req, res, next) => {
  try {
    const result = await uiProducts.setPrice(req.params.productId, req.body && req.body.price, req.user._id);
    if (result.error === 'NOT_IN_CATALOG') {
      return res.status(404).json({
        success: false,
        code: 'NOT_IN_CATALOG',
        message: 'Sản phẩm không có trong UI Marketplace. Admin chỉ chỉnh giá, không thêm sản phẩm mới.',
      });
    }
    if (result.error === 'INVALID_PRICE') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PRICE',
        message: PRICE_ERROR,
      });
    }

    await logAdminAction(req, {
      action: 'UI_PRODUCT_PRICE_UPDATE',
      targetType: 'ui_product',
      targetId: result.product.id,
      targetLabel: result.product.title,
      details: { previousPrice: result.previous, newPrice: result.product.price },
    });

    return res.status(200).json({ success: true, message: 'Đã cập nhật giá sản phẩm', data: result.product });
  } catch (error) {
    return next(error);
  }
};
