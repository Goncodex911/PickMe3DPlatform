const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/login', authController.emailLogin);
router.post('/google', authController.googleLogin);
router.post('/guest', authController.guestLogin);
router.post('/admin', authController.adminLogin);
router.get('/me', protect, authController.me);

module.exports = router;
