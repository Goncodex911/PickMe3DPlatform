const express = require('express');
const router = express.Router();
const { createReport, getMyReports } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createReport);
router.route('/my-reports').get(protect, getMyReports);

module.exports = router;
