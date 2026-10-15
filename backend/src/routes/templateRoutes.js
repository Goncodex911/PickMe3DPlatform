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
} = require('../controllers/templateController');
const {
  getComments,
  createComment,
} = require('../controllers/commentController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(getTemplates).post(protect, createTemplate);
router.route('/public').get(getTemplates);
router.route('/my-templates').get(protect, getUserTemplates);
router.route('/:id').get(getTemplateById).put(protect, updateTemplate).delete(protect, deleteTemplate);
router.route('/:id/like').post(protect, toggleLikeTemplate);
router.route('/:id/cover').post(coverTemplate);
router.route('/:id/review').post(protect, addTemplateReview);

// Comments nested under template
router.route('/:templateId/comments').get(getComments).post(protect, createComment);

module.exports = router;
