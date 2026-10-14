const User = require('../models/User');
const Template = require('../models/Template');

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
    const { name, picture, jobRole, bio, username } = req.body;
    if (name !== undefined) user.name = name;
    if (picture !== undefined) user.picture = picture;
    if (jobRole !== undefined) user.jobRole = jobRole;
    if (bio !== undefined) user.bio = bio;
    if (username !== undefined) {
      // Check username uniqueness
      if (username && username !== user.username) {
        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing && existing._id.toString() !== user._id.toString()) {
          return res.status(400).json({ success: false, message: 'Username is already taken' });
        }
      }
      user.username = username;
    }

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

/**
 * @desc    Get public profile of a user by ID
 * @route   GET /api/users/:id/public
 * @access  Public
 */
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name picture bio jobRole username createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Aggregate stats from the user's public templates
    const stats = await Template.aggregate([
      { $match: { author: user._id, isPublic: true } },
      {
        $group: {
          _id: null,
          totalDesigns: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalForks: { $sum: '$forksCount' },
          totalViews: { $sum: '$viewsCount' },
        },
      },
    ]);

    const aggregated = stats[0] || { totalDesigns: 0, totalLikes: 0, totalForks: 0, totalViews: 0 };

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          picture: user.picture,
          bio: user.bio,
          jobRole: user.jobRole,
          username: user.username,
          createdAt: user.createdAt,
        },
        stats: {
          totalDesigns: aggregated.totalDesigns,
          totalLikes: aggregated.totalLikes,
          totalForks: aggregated.totalForks,
          totalViews: aggregated.totalViews,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public profile by username
 * @route   GET /api/users/username/:username
 * @access  Public
 */
exports.getPublicProfileByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('name picture bio jobRole username createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const stats = await Template.aggregate([
      { $match: { author: user._id, isPublic: true } },
      {
        $group: {
          _id: null,
          totalDesigns: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalForks: { $sum: '$forksCount' },
          totalViews: { $sum: '$viewsCount' },
        },
      },
    ]);

    const aggregated = stats[0] || { totalDesigns: 0, totalLikes: 0, totalForks: 0, totalViews: 0 };

    // Fetch public templates by this user
    const templates = await Template.find({ author: user._id, isPublic: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title description category tags thumbnailUrl likesCount viewsCount forksCount avgRating createdAt');

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          picture: user.picture,
          bio: user.bio,
          jobRole: user.jobRole,
          username: user.username,
          createdAt: user.createdAt,
        },
        stats: {
          totalDesigns: aggregated.totalDesigns,
          totalLikes: aggregated.totalLikes,
          totalForks: aggregated.totalForks,
          totalViews: aggregated.totalViews,
        },
        templates,
      },
    });
  } catch (error) {
    next(error);
  }
};
