const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAdminUsers,
  createAdminUser,
  updateUserStatus,
  updateUserRole,
  updateUserPlan,
  importUsers,
  getAdminTemplates,
  createSystemTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  getAdminReports,
  updateReportStatus,
  exportReportsCsv,
  getAuditLogs,
  exportAuditLogsCsv,
  getReportingAnalytics,
  getAdminOrders,
  exportOrdersCsv,
  getAdminPresentations,
  togglePresentationVisibility,
  deleteAdminPresentation,
  getAdminPayouts,
  updatePayoutStatus,
  getSystemHealth,
  deleteAdminReview,
} = require('../controllers/adminController');
const { updateCreatorStatus, startCreatorReview, reviewTemplate } = require('../controllers/creatorController');
const { listUiProducts, updateUiProductPrice } = require('../controllers/uiProductAdminController');
const paymentAdmin = require('../controllers/paymentAdminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All admin routes require authentication and 'admin' role
router.use(protect);
router.use(authorize('admin'));

// Dashboard Overview
router.get('/stats', getDashboardStats);

// User Management
router.route('/users').get(getAdminUsers).post(createAdminUser);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/creator-status', updateCreatorStatus);
router.put('/users/:id/creator-review', startCreatorReview);
router.post('/users/import', importUsers);

// Templates and 3D Assets Management
// POST /templates answers 403: Admin sells the existing system catalogue but never creates templates (BR-05).
router.route('/templates').get(getAdminTemplates).post(createSystemTemplate);
router.route('/templates/:id').put(updateAdminTemplate).delete(deleteAdminTemplate);
router.put('/templates/:id/review', reviewTemplate);

// UI Marketplace pricing: Admin edits prices of the fixed catalogue; there is no endpoint to add products (BR-06).
router.get('/ui-products', listUiProducts);
router.put('/ui-products/:productId/price', updateUiProductPrice);

// Slide Presentations Moderation
router.get('/presentations', getAdminPresentations);
router.put('/presentations/:id/visibility', togglePresentationVisibility);
router.delete('/presentations/:id', deleteAdminPresentation);

// Billing & Orders Management
router.get('/orders/export', exportOrdersCsv);
router.get('/orders', getAdminOrders);

// Payment operations: trace, verification, fulfillment retry, manual confirm/cancel, refunds, reconciliation
router.get('/payments/events', paymentAdmin.listEvents);
router.post('/payments/reconcile', paymentAdmin.reconcile);
router.get('/payments/:orderCode', paymentAdmin.getPaymentDetail);
router.post('/payments/:orderCode/verify', paymentAdmin.verifyPayment);
router.post('/payments/:orderCode/retry-fulfillment', paymentAdmin.retryFulfillment);
router.post('/payments/:orderCode/mark-paid', paymentAdmin.markPaid);
router.post('/payments/:orderCode/cancel', paymentAdmin.cancelPayment);
router.post('/payments/:orderCode/resolve-review', paymentAdmin.resolveReview);
router.post('/payments/:orderCode/excess-return', paymentAdmin.processExcessReturn);
router.get('/refunds', paymentAdmin.listRefunds);
router.put('/refunds/:orderCode', paymentAdmin.processRefund);

// Incident Reports
router.get('/reports/export', exportReportsCsv);
router.get('/reports', getAdminReports);
router.put('/reports/:id', updateReportStatus);
router.delete('/reviews/:reviewId', deleteAdminReview);

// Audit Logs
router.get('/audit-logs/export', exportAuditLogsCsv);
router.get('/audit-logs', getAuditLogs);

// Analytics and Trends
router.get('/analytics', getReportingAnalytics);


// Creator Payouts Management
router.get('/payouts', getAdminPayouts);
router.put('/payouts/:id', updatePayoutStatus);

// System Health Monitoring
router.get('/system-health', getSystemHealth);

module.exports = router;
