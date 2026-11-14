const express = require('express');
const router = express.Router();
const multer = require('multer');
const blueprintController = require('../controllers/blueprintController');

// Multer memory storage (limit 25MB for 3D binary files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// 1. Upload .GLB Model to Cloudinary / CDN
router.post('/upload-glb', upload.single('file'), blueprintController.upload3DModel);

// 2. Queue Heavy 3D Background Reconstruction Job
router.post('/queue-job', blueprintController.queue3DReconstruction);

// 3. Check Job Status
router.get('/jobs/:jobId', blueprintController.getJobStatus);

// 4. Server-Sent Events (SSE) Real-Time Progress Stream
router.get('/jobs/:jobId/events', blueprintController.streamJobEvents);

// 5. CDN Cached Delivery for .GLB Files
router.get('/cdn/:filename', blueprintController.serveCdnGlb);

// 6. 1-Click AI Photorealistic 4K Render (STORY-THUAN-BP16)
router.post('/ai-render-4k', blueprintController.generateAIRender4K);

// 7. CDN Cached Delivery for 4K Rendered Images
router.get('/cdn/renders/:filename', blueprintController.serveCdnRender);

module.exports = router;

