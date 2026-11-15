const express = require('express');
const router = express.Router();
const presentation = require('../controllers/presentationController');
const { attachUser, optionalUser, requirePlan, requireFeature, checkQuota } = require('../middlewares/planMiddleware');

router.get('/public/:id', optionalUser, presentation.publicOne);
router.post('/:id/view', optionalUser, presentation.view);
router.use(attachUser);
router.get('/', presentation.list);
router.get('/community', presentation.community);
router.post('/', checkQuota('slides'), presentation.create);
// AI slide generation is a Pro feature; blank decks stay available on Free.
router.post('/generate', requireFeature('aiSlides'), checkQuota('slides'), checkQuota('ai'), presentation.generate);
router.get('/jobs/:jobId', presentation.job);
router.get('/:id', presentation.getOne);
router.put('/:id', presentation.update);
router.delete('/:id', presentation.remove);
router.post('/:id/like', presentation.like);
// Tạo bản sao deck công khai vào không gian của mình: tính năng gói Pro (admin luôn được)
router.post('/:id/use', requirePlan('pro'), checkQuota('slides'), presentation.useDeck);
router.post('/:id/comments', presentation.comment);
router.get('/:id/export.pptx', requirePlan('pro'), presentation.exportPptx);

module.exports = router;
