const express = require('express');
const router = express.Router();
const multer = require('multer');
const blueprintController = require('../controllers/blueprintController');
const { attachUser, requireFeature } = require('../middlewares/planMiddleware');

// Creating 3D work is a Pro feature (config/plans.js: blueprint3d). Reading finished jobs/files stays public
// because the viewer loads them by URL.
const pro3d = [attachUser, requireFeature('blueprint3d')];

// Multer memory storage (limit 25MB for 3D binary files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Các route ghi dữ liệu / tốn tài nguyên bắt buộc đăng nhập (kể cả tài khoản khách).

// 1. Upload .GLB Model to Cloudinary / CDN
router.post('/upload-glb', ...pro3d, upload.single('file'), blueprintController.upload3DModel);

// 2. Nén Draco file .GLB (gltf-transform + draco3dgltf), trả lại file GLB đã nén
router.post(
  '/compress-glb',
  ...pro3d,
  express.raw({ type: ['model/gltf-binary', 'application/octet-stream'], limit: '25mb' }),
  blueprintController.compressGlb
);

// 3. Trạng thái tác vụ nền (chỉ chủ sở hữu tác vụ xem được)
router.get('/jobs/:jobId', attachUser, blueprintController.getJobStatus);

// 4. Server-Sent Events (SSE) Real-Time Progress Stream
router.get('/jobs/:jobId/events', blueprintController.streamJobEvents);

// 5. CDN Cached Delivery for .GLB Files
router.get('/cdn/:filename', blueprintController.serveCdnGlb);

// 6. AI Render phối cảnh bằng Gemini image model (STORY-THUAN-BP16) -> 202 + jobId
router.post('/ai-render-4k', ...pro3d, blueprintController.generateAIRender4K);

// 7. CDN Cached Delivery for Rendered Images
router.get('/cdn/renders/:filename', blueprintController.serveCdnRender);

module.exports = router;
