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
  getPublicCreatorRoutes,
} = require('../controllers/userController');
const { protect, authorize, requirePermission } = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { applyForCreator, getMyCreatorApplication, getCreatorPolicy } = require('../controllers/creatorController');

const optionalAuth = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id);
    } catch {
      req.user = null;
    }
  }
  next();
};

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
router.get('/:id/like', optionalAuth, social.creatorLikeStatus);
router.route('/:id/like').put(protect, social.setCreatorLike).delete(protect, social.setCreatorLike);

// Public profile routes (no auth required)
router.route('/public-creators').get(getPublicCreatorRoutes);
router.route('/username/:username').get(getPublicProfileByUsername);
router.route('/:id/public').get(getPublicProfile);

module.exports = router;
