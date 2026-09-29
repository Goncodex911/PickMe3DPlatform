const express = require('express');
const router = express.Router();
const { getUsers, createUser, getUserProfile, updateUserProfile, deleteUserProfile } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUserProfile);

module.exports = router;
