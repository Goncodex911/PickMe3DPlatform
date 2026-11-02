const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/google', authController.googleLogin);
router.post('/guest', authController.guestLogin);
router.post('/admin', authController.adminLogin);

module.exports = router;
