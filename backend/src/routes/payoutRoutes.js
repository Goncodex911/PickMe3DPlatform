const express = require('express');
const router = express.Router();
const {
  getCreatorWalletSummary,
  requestPayout,
  updateSavedBankInfo,
} = require('../controllers/payoutController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');

// Creator wallet: only approved Creators earn and withdraw. Admin approves payouts via /api/admin/payouts.
router.use(protect);
router.use(requirePermission('payment:wallet:view:own'));

router.get('/wallet', getCreatorWalletSummary);
router.post('/', requirePermission('payment:payout:create:own'), requestPayout);
router.put('/bank-info', updateSavedBankInfo);

module.exports = router;

