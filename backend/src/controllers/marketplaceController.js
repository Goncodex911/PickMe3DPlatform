const mongoose = require('mongoose');
const MarketplacePurchase = require('../models/MarketplacePurchase');
const Template = require('../models/Template');
const uiProducts = require('../services/uiProductService');

/** Public price list of the UI Marketplace: { prices: { [productId]: VND } }, products not listed are free. */
exports.getUiPrices = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ success: true, prices: await uiProducts.listPriceMap() });
  } catch (error) {
    return next(error);
  }
};

/**
 * UI Marketplace items are free catalogue entries identified by string ids. A real Template id must go through
 * POST /api/payments/checkout-template so an Entitlement is only issued for a PAID order.
 */
async function isMarketplaceTemplateId(templateId) {
  const id = String(templateId || '').trim();
  if (!mongoose.isValidObjectId(id)) return false;
  return Boolean(await Template.exists({ _id: id }));
}

/**
 * @desc    Purchase a template from UI Marketplace
 * @route   POST /api/marketplace/purchase
 * @access  Private
 */
exports.purchaseTemplate = async (req, res, next) => {
  try {
    const { templateId, templateTitle = '', category = '', price = 0, transactionId = '' } = req.body;

    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Template ID là bắt buộc',
      });
    }

    const userId = req.user._id;

    if (await isMarketplaceTemplateId(templateId)) {
      return res.status(400).json({
        success: false,
        code: 'CHECKOUT_REQUIRED',
        message: 'Template trên Marketplace phải được mua qua thanh toán',
      });
    }

    // Check if already purchased
    const existing = await MarketplacePurchase.findOne({ user: userId, templateId: templateId.trim() });
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyPurchased: true,
        message: 'Mẫu giao diện này đã được sở hữu',
        data: existing,
      });
    }

    // Every UI product is paid: ownership only comes from a PAID order (POST /api/payments/checkout-ui).
    // Ids outside the catalogue are not products at all.
    if (!uiProducts.getCatalogProduct(templateId.trim())) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm UI' });
    }
    const uiPrice = await uiProducts.getPrice(templateId.trim());
    if (uiPrice > 0) {
      return res.status(402).json({
        success: false,
        code: 'CHECKOUT_REQUIRED',
        price: uiPrice,
        message: 'Sản phẩm này có phí, vui lòng thanh toán để sở hữu',
      });
    }

    const purchase = await MarketplacePurchase.create({
      user: userId,
      templateId: templateId.trim(),
      templateTitle: templateTitle.trim(),
      category: category.trim(),
      // Never trust a client amount (S22); UI catalogue items are claimed free.
      price: 0,
      transactionId: transactionId.trim() || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      purchasedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      alreadyPurchased: false,
      message: 'Mua mẫu giao diện thành công',
      data: purchase,
    });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      const existing = await MarketplacePurchase.findOne({ user: req.user._id, templateId: req.body.templateId });
      return res.status(200).json({
        success: true,
        alreadyPurchased: true,
        message: 'Mẫu giao diện này đã được sở hữu',
        data: existing,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get all purchased marketplace templates for current user
 * @route   GET /api/marketplace/my-purchases
 * @access  Private
 */
exports.getMyPurchases = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const purchases = await MarketplacePurchase.find({ user: userId }).sort({ purchasedAt: -1 }).lean();
    const purchasedTemplateIds = purchases.map((p) => p.templateId);

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
      templateIds: purchasedTemplateIds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if a specific template is purchased
 * @route   GET /api/marketplace/check/:templateId
 * @access  Private
 */
exports.checkPurchaseStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Template ID là bắt buộc' });
    }

    const purchase = await MarketplacePurchase.findOne({ user: userId, templateId: templateId.trim() }).lean();

    return res.status(200).json({
      success: true,
      isPurchased: Boolean(purchase),
      data: purchase || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sync local offline purchases into MongoDB
 * @route   POST /api/marketplace/sync
 * @access  Private
 */
exports.syncLocalPurchases = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (items.length === 0) {
      const allPurchases = await MarketplacePurchase.find({ user: userId }).sort({ purchasedAt: -1 }).lean();
      return res.status(200).json({
        success: true,
        count: allPurchases.length,
        data: allPurchases,
        templateIds: allPurchases.map((p) => p.templateId),
      });
    }

    const candidates = items.filter((item) => item && (item.id || item.templateId));
    const allowed = [];
    const priced = await uiProducts.listPriceMap();
    const owned = new Set((await MarketplacePurchase.find({ user: userId }).select('templateId').lean()).map((p) => p.templateId));
    for (const item of candidates) {
      const id = String(item.id || item.templateId).trim();
      // Local claims of priced products are ignored unless already owned on the server.
      if (priced[id] > 0 && !owned.has(id)) continue;
      if (!(await isMarketplaceTemplateId(id))) allowed.push(item);
    }

    const operations = allowed
      .map((item) => {
        const templateId = String(item.id || item.templateId).trim();
        return {
          updateOne: {
            filter: { user: userId, templateId },
            update: {
              $setOnInsert: {
                user: userId,
                templateId,
                templateTitle: String(item.titleEn || item.title || item.templateTitle || '').trim(),
                category: String(item.category || '').trim(),
                price: 0,
                transactionId: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                purchasedAt: item.purchasedAt ? new Date(item.purchasedAt) : new Date(),
              },
            },
            upsert: true,
          },
        };
      });

    if (operations.length > 0) {
      await MarketplacePurchase.bulkWrite(operations, { ordered: false });
    }

    const updated = await MarketplacePurchase.find({ user: userId }).sort({ purchasedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: 'Đồng bộ danh sách template thành công',
      count: updated.length,
      data: updated,
      templateIds: updated.map((p) => p.templateId),
    });
  } catch (error) {
    next(error);
  }
};

