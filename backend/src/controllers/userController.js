const mongoose = require('mongoose');
const User = require('../models/User');
const Template = require('../models/Template');
const { uploadIfBase64 } = require('../services/cloudinaryService');
const { createNotification } = require('../helpers/notificationHelper');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function buildPublicProfilePayload(user) {
  const [stats, templates] = await Promise.all([
    Template.aggregate([
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
    ]),
    Template.find({ author: user._id, isPublic: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'name picture jobRole username')
      .select(
        'title description category tags thumbnailUrl galleryImages author authorName authorAvatar docData likesCount viewsCount forksCount avgRating ratingsCount reviews createdAt'
      ),
  ]);

  const aggregated = stats[0] || {
    totalDesigns: 0,
    totalLikes: 0,
    totalForks: 0,
    totalViews: 0,
  };

  const reviews = Array.isArray(user.reviews) ? user.reviews : [];
  const ratingsCount = user.ratingsCount || reviews.length || 0;
  const avgRating = user.avgRating || 0;

  return {
    user: {
      _id: user._id,
      name: user.name,
      picture: user.picture || user.googlePicture || '',
      googlePicture: user.googlePicture || '',
      bio: user.bio || '',
      jobRole: user.jobRole || '',
      username: user.username || '',
      createdAt: user.createdAt,
      avgRating,
      ratingsCount,
      reviews,
    },
    stats: {
      totalDesigns: aggregated.totalDesigns,
      totalLikes: aggregated.totalLikes,
      totalForks: aggregated.totalForks,
      totalViews: aggregated.totalViews,
      avgRating,
      ratingsCount,
    },
    templates,
  };
}

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
    if (picture !== undefined) {
      if (picture && picture.startsWith('data:')) {
        user.picture = await uploadIfBase64(picture, 'pickme3d/avatars');
      } else {
        user.picture = picture;
      }
    }
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = await User.findById(req.params.id).select(
      'name picture googlePicture bio jobRole username createdAt avgRating ratingsCount reviews'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = await buildPublicProfilePayload(user);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public profile by username (with fallback to ObjectId or exact name)
 * @route   GET /api/users/username/:username
 * @access  Public
 */
exports.getPublicProfileByUsername = async (req, res, next) => {
  try {
    const rawParam = String(req.params.username || '').trim();
    const selectFields =
      'name picture googlePicture bio jobRole username createdAt avgRating ratingsCount reviews';

    let user = await User.findOne({ username: rawParam.toLowerCase() }).select(selectFields);

    if (!user && mongoose.Types.ObjectId.isValid(rawParam)) {
      user = await User.findById(rawParam).select(selectFields);
    }

    if (!user && rawParam) {
      user = await User.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(rawParam)}$`, 'i') },
      }).select(selectFields);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = await buildPublicProfilePayload(user);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add or update review/rating for a Creator profile
 * @route   POST /api/users/:id/review
 * @access  Private
 */
exports.addCreatorReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Creator' });
    }

    const creator = await User.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Creator' });
    }

    const userId = req.user._id;
    if (creator._id.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự đánh giá hồ sơ của chính mình' });
    }

    const userName = req.user.name || 'Người dùng';
    const userAvatar = req.user.picture || req.user.googlePicture || '';

    if (!creator.reviews) creator.reviews = [];

    const existingIndex = creator.reviews.findIndex(
      (r) => r.user && r.user.toString() === userId.toString()
    );

    if (existingIndex >= 0) {
      creator.reviews[existingIndex].rating = numRating;
      creator.reviews[existingIndex].comment = (comment || '').trim();
      creator.reviews[existingIndex].userName = userName;
      creator.reviews[existingIndex].userAvatar = userAvatar;
      creator.reviews[existingIndex].createdAt = new Date();
    } else {
      creator.reviews.unshift({
        user: userId,
        userName,
        userAvatar,
        rating: numRating,
        comment: (comment || '').trim(),
        createdAt: new Date(),
      });

      const profileUrl = creator.username
        ? `/creator/?username=${encodeURIComponent(creator.username)}`
        : `/creator/?id=${creator._id}`;

      await createNotification({
        recipientId: creator._id,
        actorId: userId,
        type: 'review',
        link: profileUrl,
        message: `${userName} đã đánh giá ${numRating}★ cho hồ sơ Creator của bạn`,
      });
    }

    creator.ratingsCount = creator.reviews.length;
    const totalScore = creator.reviews.reduce((sum, r) => sum + r.rating, 0);
    creator.avgRating = Number((totalScore / creator.reviews.length).toFixed(1));

    await creator.save();

    res.status(200).json({
      success: true,
      message: 'Đã lưu đánh giá Creator thành công',
      data: {
        avgRating: creator.avgRating,
        ratingsCount: creator.ratingsCount,
        reviews: creator.reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review from a Creator profile (Admin or review author)
 * @route   DELETE /api/users/:id/review/:reviewId
 * @access  Private
 */
exports.deleteCreatorReview = async (req, res, next) => {
  try {
    const { id: creatorId, reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Creator' });
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Creator' });
    }

    if (!creator.reviews || creator.reviews.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá nào' });
    }

    const reviewIndex = creator.reviews.findIndex((r, idx) => {
      if (r._id && r._id.toString() === reviewId.toString()) return true;
      if (r.user && r.user.toString() === reviewId.toString()) return true;
      if (`${creatorId}-creator-review-${idx}` === reviewId) return true;
      if (`${creatorId}-review-${idx}` === reviewId) return true;
      if (String(idx) === reviewId) return true;
      return false;
    });

    if (reviewIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần xóa' });
    }

    const review = creator.reviews[reviewIndex];
    const isOwner = req.user && review.user && req.user._id.toString() === review.user.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này' });
    }

    creator.reviews.splice(reviewIndex, 1);

    creator.ratingsCount = creator.reviews.length;
    if (creator.ratingsCount > 0) {
      const totalScore = creator.reviews.reduce((sum, r) => sum + r.rating, 0);
      creator.avgRating = Number((totalScore / creator.ratingsCount).toFixed(1));
    } else {
      creator.avgRating = 0;
    }

    await creator.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa đánh giá thành công',
      data: {
        avgRating: creator.avgRating,
        ratingsCount: creator.ratingsCount,
        reviews: creator.reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
