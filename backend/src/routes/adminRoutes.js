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
} = require('../controllers/adminController');
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
router.post('/users/import', importUsers);

// Templates and 3D Assets Management
router.route('/templates').get(getAdminTemplates).post(createSystemTemplate);
router.route('/templates/:id').put(updateAdminTemplate).delete(deleteAdminTemplate);

// Slide Presentations Moderation
router.get('/presentations', getAdminPresentations);
router.put('/presentations/:id/visibility', togglePresentationVisibility);
router.delete('/presentations/:id', deleteAdminPresentation);

// Billing & Orders Management
router.get('/orders/export', exportOrdersCsv);
router.get('/orders', getAdminOrders);

// Incident Reports
router.get('/reports/export', exportReportsCsv);
router.get('/reports', getAdminReports);
router.put('/reports/:id', updateReportStatus);

// Audit Logs
router.get('/audit-logs/export', exportAuditLogsCsv);
router.get('/audit-logs', getAuditLogs);

// Analytics and Trends
router.get('/analytics', getReportingAnalytics);

module.exports = router;
