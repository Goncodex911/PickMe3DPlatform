const express = require('express');
const router = express.Router();
const payment = require('../controllers/paymentController');
const { attachUser } = require('../middlewares/planMiddleware');

router.get('/plans', payment.plans);
router.post('/webhook', payment.webhook);
router.get('/me', attachUser, payment.me);
router.get('/orders', attachUser, payment.myOrders);
router.get('/orders/:orderCode', attachUser, payment.orderDetail);
router.get('/orders/:orderCode/receipt', attachUser, payment.receipt);
router.post('/orders/:orderCode/cancel', attachUser, payment.cancel);
router.post('/orders/:orderCode/refund-request', attachUser, payment.requestRefund);
router.post('/quote', attachUser, payment.quote);
router.post('/checkout', attachUser, payment.checkout);
router.post('/checkout-template', attachUser, payment.checkoutTemplate);
router.post('/checkout-ui', attachUser, payment.checkoutUiProduct);
router.post('/mock/confirm/:orderCode', attachUser, payment.mockConfirm);
router.get('/status/:orderCode', attachUser, payment.status);

module.exports = router;
