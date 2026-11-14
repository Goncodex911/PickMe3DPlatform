const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const {
  getVersions,
  getVersionById,
  createVersion,
  rollbackVersion,
  deleteVersion,
} = require('../controllers/versionController');
const Template = require('../models/Template');
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../config/permissions');
const { isTemplateOwner } = require('../services/accessService');

/**
 * Version history holds full design snapshots, so it is owner-only (BR-13: buyers use a copy, never the source).
 * Admin may read for moderation but never rewrites a Creator's template.
 */
function requireTemplateOwner({ allowAdminRead = false } = {}) {
  return async (req, res, next) => {
    try {
      const { templateId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid template ID format' });
      }
      const template = await Template.findById(templateId).select('_id author isSystem sellerType');
      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      if (isTemplateOwner(req.user, template) || (allowAdminRead && isAdmin(req.user))) {
        return next();
      }
      return res.status(403).json({ success: false, code: 'NOT_OWNER', message: 'Bạn không phải chủ sở hữu Template này' });
    } catch (error) {
      return next(error);
    }
  };
}

router.use(protect);

router.route('/')
  .get(requireTemplateOwner({ allowAdminRead: true }), getVersions)
  .post(requireTemplateOwner(), createVersion);

router.route('/:versionId')
  .get(requireTemplateOwner({ allowAdminRead: true }), getVersionById)
  .delete(requireTemplateOwner(), deleteVersion);

router.post('/:versionId/rollback', requireTemplateOwner(), rollbackVersion);

module.exports = router;
