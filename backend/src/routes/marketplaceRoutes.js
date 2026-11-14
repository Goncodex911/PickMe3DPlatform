const express = require('express');
const router = express.Router();
const {
  purchaseTemplate,
  getMyPurchases,
  checkPurchaseStatus,
  syncLocalPurchases,
  getUiPrices,
} = require('../controllers/marketplaceController');
const { protect } = require('../middlewares/authMiddleware');

// Public: UI Marketplace price list (catalogue ids priced by Admin; others are free).
router.get('/ui-prices', getUiPrices);

router.use(protect);

router.post('/purchase', purchaseTemplate);
router.get('/my-purchases', getMyPurchases);
router.get('/check/:templateId', checkPurchaseStatus);
router.post('/sync', syncLocalPurchases);

module.exports = router;

