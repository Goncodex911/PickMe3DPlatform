const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getPublicProfile,
  getPublicProfileByUsername,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUserProfile);

const social = require('../controllers/socialController');
router.get('/activity', protect, social.activityFeed);
router.route('/:id/follow').get(protect, social.followStatus).put(protect, social.setFollow).delete(protect, social.setFollow);

// Public profile routes (no auth required)
router.route('/username/:username').get(getPublicProfileByUsername);
router.route('/:id/public').get(getPublicProfile);

module.exports = router;
