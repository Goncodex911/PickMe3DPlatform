const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  getUserTemplates,
  updateTemplate,
  deleteTemplate,
  coverTemplate,
  toggleLikeTemplate,
  addTemplateReview,
  deleteTemplateReview,
  updateTemplatePrice,
  getTemplatePriceHistory,
} = require('../controllers/templateController');
const {
  getComments,
  createComment,
} = require('../controllers/commentController');
const versionRoutes = require('./versionRoutes');
const { protect, optionalProtect, requirePermission } = require('../middlewares/authMiddleware');

// Every USER may create templates for personal use; publish/sell rights are checked in the controller
// (Creator only). Admin has no template:listing:create (BR-05) and manages the catalogue via /api/admin.
router.route('/').get(optionalProtect, getTemplates).post(protect, requirePermission('template:listing:create'), createTemplate);
router.route('/public').get(optionalProtect, getTemplates);
router.route('/my-templates').get(protect, getUserTemplates);
router
  .route('/:id')
  .get(optionalProtect, getTemplateById)
  .put(protect, requirePermission('template:listing:edit:own'), updateTemplate)
  .delete(protect, requirePermission('template:listing:delete:own'), deleteTemplate);
router.route('/:id/like').post(protect, toggleLikeTemplate);
// Pricing: owner only (Creator for own templates, Admin for the system catalogue); history = versions of the price.
router.route('/:id/price').put(protect, updateTemplatePrice);
router.route('/:id/price-history').get(protect, getTemplatePriceHistory);
router.route('/:id/cover').post(coverTemplate);
router.route('/:id/review').post(protect, addTemplateReview);
router.route('/:id/review/:reviewId').delete(protect, deleteTemplateReview);

// Comments nested under template
router.route('/:templateId/comments').get(getComments).post(protect, createComment);

// Versions nested under template
router.use('/:templateId/versions', versionRoutes);

module.exports = router;
