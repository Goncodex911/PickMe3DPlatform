const express = require('express');
const router = express.Router();
const {
  getCreatorWalletSummary,
  requestPayout,
  updateSavedBankInfo,
} = require('../controllers/payoutController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/wallet', getCreatorWalletSummary);
router.post('/', requestPayout);
router.put('/bank-info', updateSavedBankInfo);

module.exports = router;

