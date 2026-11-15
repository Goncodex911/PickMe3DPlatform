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
const { protect, authorize, requirePermission } = require('../middlewares/authMiddleware');
const { applyForCreator, getMyCreatorApplication, getCreatorPolicy } = require('../controllers/creatorController');

// Full user records (emails, wallet, plan) are admin-only; public pages use /:id/public and /username/:username.
router.route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(protect, authorize('admin'), createUser);

// Regular user asks to become a Creator (creatorStatus NONE/REJECTED -> PENDING); Admin approves.
router.get('/creator-policy', getCreatorPolicy);
router.get('/creator-application', protect, requirePermission('template:creator_application:create:own'), getMyCreatorApplication);
router.post('/creator-application', protect, requirePermission('template:creator_application:create:own'), applyForCreator);

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
