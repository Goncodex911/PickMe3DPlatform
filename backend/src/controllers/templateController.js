const mongoose = require('mongoose');
const Template = require('../models/Template');

/**
 * @desc Get all public templates with filtering, search, and sorting
 * @route GET /api/templates
 * @access Public
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const { category, search, sort = 'trending', page = 1, limit = 12 } = req.query;

    const query = { isPublic: true };

    if (category && category !== 'All' && category !== 'Tất cả') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    let sortOption = {};
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'likes') {
      sortOption = { likesCount: -1 };
    } else if (sort === 'rating') {
      sortOption = { avgRating: -1, ratingsCount: -1 };
    } else {
      // Default: trending
      sortOption = { viewsCount: -1, likesCount: -1, forksCount: -1, createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Template.countDocuments(query);
    const templates = await Template.find(query)
      .populate('author', 'name picture jobRole')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: templates,
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      total: 0,
      page: 1,
      totalPages: 0,
      data: [],
    });
  }
};

/**
 * @desc Get template details by ID
 * @route GET /api/templates/:id
 * @access Public
 */
exports.getTemplateById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const template = await Template.findById(req.params.id).populate('author', 'name picture jobRole');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Increment views
    template.viewsCount = (template.viewsCount || 0) + 1;
    await template.save();

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create/Publish a new template
 * @route POST /api/templates
 * @access Private
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { title, description, category, tags, thumbnailUrl, galleryImages, docData, isPublic } = req.body;

    const newTemplate = await Template.create({
      title,
      description: description || '',
      category: category || 'Outfit',
      tags: tags || [],
      thumbnailUrl: thumbnailUrl || '',
      galleryImages: galleryImages || [],
      author: req.user ? req.user._id : null,
      authorName: req.user ? req.user.name : 'Creator',
      authorAvatar: req.user ? req.user.picture : '',
      docData,
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Template created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get templates created by current user
 * @route GET /api/templates/my-templates
 * @access Private
 */
exports.getUserTemplates = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const templates = await Template.find({ author: userId }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update a template (privacy, tags, title, docData, etc.)
 * @route PUT /api/templates/:id
 * @access Private
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Verify ownership
    if (template.author && template.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this template' });
    }

    const { title, description, category, tags, thumbnailUrl, galleryImages, docData, isPublic } = req.body;
    if (title !== undefined) template.title = title;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;
    if (tags !== undefined) template.tags = tags;
    if (thumbnailUrl !== undefined) template.thumbnailUrl = thumbnailUrl;
    if (galleryImages !== undefined) template.galleryImages = galleryImages;
    if (docData !== undefined) template.docData = docData;
    if (isPublic !== undefined) template.isPublic = isPublic;

    const updated = await template.save();
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Template updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a template
 * @route DELETE /api/templates/:id
 * @access Private
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (template.author && template.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this template' });
    }

    await Template.deleteOne({ _id: req.params.id });
    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Track cover/fork of a template
 * @route POST /api/templates/:id/cover
 * @access Public
 */
exports.coverTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    template.forksCount = (template.forksCount || 0) + 1;
    await template.save();

    res.status(200).json({
      success: true,
      data: template,
      message: 'Cover count updated',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Like or unlike a template
 * @route POST /api/templates/:id/like
 * @access Private
 */
exports.toggleLikeTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const userId = req.user._id;
    const isLiked = template.likedBy && template.likedBy.some((id) => id.toString() === userId.toString());

    if (!template.likedBy) template.likedBy = [];

    if (isLiked) {
      template.likedBy = template.likedBy.filter((id) => id.toString() !== userId.toString());
      template.likesCount = Math.max(0, (template.likesCount || 0) - 1);
    } else {
      template.likedBy.push(userId);
      template.likesCount = (template.likesCount || 0) + 1;
    }

    await template.save();

    res.status(200).json({
      success: true,
      liked: !isLiked,
      likesCount: template.likesCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Add or update review/rating for a template
 * @route POST /api/templates/:id/review
 * @access Private
 */
exports.addTemplateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const userId = req.user._id;
    const userName = req.user.name || 'Người dùng';
    const userAvatar = req.user.picture || '';

    if (!template.reviews) template.reviews = [];

    // Check if user already reviewed
    const existingIndex = template.reviews.findIndex(
      (r) => r.user && r.user.toString() === userId.toString()
    );

    if (existingIndex >= 0) {
      template.reviews[existingIndex].rating = numRating;
      template.reviews[existingIndex].comment = comment || '';
      template.reviews[existingIndex].userName = userName;
      template.reviews[existingIndex].userAvatar = userAvatar;
      template.reviews[existingIndex].createdAt = new Date();
    } else {
      template.reviews.unshift({
        user: userId,
        userName,
        userAvatar,
        rating: numRating,
        comment: comment || '',
        createdAt: new Date(),
      });
    }

    // Recalculate rating stats
    template.ratingsCount = template.reviews.length;
    const totalScore = template.reviews.reduce((sum, r) => sum + r.rating, 0);
    template.avgRating = Number((totalScore / template.reviews.length).toFixed(1));

    await template.save();

    res.status(200).json({
      success: true,
      message: 'Đã lưu đánh giá mẫu thiết kế',
      data: {
        avgRating: template.avgRating,
        ratingsCount: template.ratingsCount,
        reviews: template.reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
