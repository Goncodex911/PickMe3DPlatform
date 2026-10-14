const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getNotifications);
router.route('/unread-count').get(protect, getUnreadCount);
router.route('/read-all').patch(protect, markAllAsRead);
router.route('/:id/read').patch(protect, markAsRead);

module.exports = router;
