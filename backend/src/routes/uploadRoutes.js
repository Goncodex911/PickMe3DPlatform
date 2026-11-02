const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max limit for images, audio, and videos
  },
});

// Single file upload route (multipart/form-data)
router.post('/', upload.single('file'), uploadController.uploadSingle);

// Base64 or URL upload route (JSON body)
router.post('/base64', uploadController.uploadBase64);

// Multiple files upload route
router.post('/multiple', upload.array('files', 10), uploadController.uploadMultiple);

// Delete media asset from Cloudinary
router.delete('/:publicId', protect, uploadController.deleteAsset);

module.exports = router;
