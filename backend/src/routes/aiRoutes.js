const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { attachUser, optionalUser } = require('../middlewares/planMiddleware');

// Dùng API key của server (GEMINI_API_KEY...) nên bắt buộc đăng nhập để tránh bị gọi ẩn danh.
router.post('/complete', attachUser, aiController.complete);
// Kiểm tra bằng key người dùng tự nhập thì không cần đăng nhập; kiểm tra bằng key của server thì cần (controller chặn).
router.post('/test', optionalUser, aiController.testConnection);

module.exports = router;
