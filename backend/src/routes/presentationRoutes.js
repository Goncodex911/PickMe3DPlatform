const express = require('express');
const router = express.Router();
const presentation = require('../controllers/presentationController');
const { attachUser, optionalUser, requirePlan, checkQuota } = require('../middlewares/planMiddleware');

router.get('/public/:id', optionalUser, presentation.publicOne);
router.post('/:id/view', optionalUser, presentation.view);
router.use(attachUser);
router.get('/', presentation.list);
router.get('/community', presentation.community);
router.get('/ai-providers', presentation.aiProviders);
router.post('/', checkQuota('slides'), presentation.create);
router.post('/generate', checkQuota('slides'), checkQuota('ai'), presentation.generate);
router.get('/:id', presentation.getOne);
router.put('/:id', presentation.update);
router.delete('/:id', presentation.remove);
router.post('/:id/like', presentation.like);
router.post('/:id/comments', presentation.comment);
router.get('/:id/export.pptx', requirePlan('pro'), presentation.exportPptx);

module.exports = router;
