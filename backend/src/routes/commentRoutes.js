const express = require('express');
const router = express.Router();
const {
  getReplies,
  toggleLikeComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middlewares/authMiddleware');

// Routes scoped under /api/comments
router.route('/:commentId/replies').get(getReplies);
router.route('/:commentId/like').post(protect, toggleLikeComment);
router.route('/:commentId').delete(protect, deleteComment);

module.exports = router;
