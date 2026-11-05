const MarketplacePurchase = require('../models/MarketplacePurchase');

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

    const purchase = await MarketplacePurchase.create({
      user: userId,
      templateId: templateId.trim(),
      templateTitle: templateTitle.trim(),
      category: category.trim(),
      price: Number(price) || 0,
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

    const operations = items
      .filter((item) => item && (item.id || item.templateId))
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
                price: Number(item.price) || 0,
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

