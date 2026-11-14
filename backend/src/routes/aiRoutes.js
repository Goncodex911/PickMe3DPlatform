const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { attachUser } = require('../middlewares/planMiddleware');

// Dùng API key của server (GEMINI_API_KEY...) nên bắt buộc đăng nhập để tránh bị gọi ẩn danh.
router.post('/complete', attachUser, aiController.complete);
router.post('/test', aiController.testConnection);

module.exports = router;
