const express = require('express');
const router = express.Router();
const payment = require('../controllers/paymentController');
const { attachUser } = require('../middlewares/planMiddleware');

router.get('/plans', payment.plans);
router.post('/webhook', payment.webhook);
router.get('/me', attachUser, payment.me);
router.get('/orders', attachUser, payment.myOrders);
router.post('/quote', attachUser, payment.quote);
router.get('/orders/:orderCode/receipt', attachUser, payment.receipt);
router.post('/checkout', attachUser, payment.checkout);
router.get('/status/:orderCode', attachUser, payment.status);

module.exports = router;
