const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only allow updating specific fields
    const { name, picture, jobRole } = req.body;
    if (name !== undefined) user.name = name;
    if (picture !== undefined) user.picture = picture;
    if (jobRole !== undefined) user.jobRole = jobRole;

    const updatedUser = await user.save();
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user profile (account deletion)
// @route   DELETE /api/users/profile
exports.deleteUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.deleteOne({ _id: req.user.id });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
