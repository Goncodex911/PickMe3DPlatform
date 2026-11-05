const express = require('express');
const router = express.Router();
const {
  purchaseTemplate,
  getMyPurchases,
  checkPurchaseStatus,
  syncLocalPurchases,
} = require('../controllers/marketplaceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/purchase', purchaseTemplate);
router.get('/my-purchases', getMyPurchases);
router.get('/check/:templateId', checkPurchaseStatus);
router.post('/sync', syncLocalPurchases);

module.exports = router;

