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
const { protect } = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
router.get('/:id/like', optionalAuth, social.creatorLikeStatus);
router.route('/:id/like').put(protect, social.setCreatorLike).delete(protect, social.setCreatorLike);

// Public profile routes (no auth required)
router.route('/public-creators').get(getPublicCreatorRoutes);
router.route('/username/:username').get(getPublicProfileByUsername);
router.route('/:id/public').get(getPublicProfile);

module.exports = router;
