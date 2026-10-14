const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Template = require('../models/Template');
const { createNotification } = require('../helpers/notificationHelper');

/**
 * @desc    Get comments for a template (top-level + replies)
 * @route   GET /api/templates/:templateId/comments
 * @access  Public
 */
exports.getComments = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    // Fetch top-level comments (no parentComment)
    const [comments, total] = await Promise.all([
      Comment.find({ template: templateId, parentComment: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Comment.countDocuments({ template: templateId, parentComment: null }),
    ]);

    // Fetch reply counts for each top-level comment
    const commentIds = comments.map((c) => c._id);
    const replyCounts = await Comment.aggregate([
      { $match: { parentComment: { $in: commentIds } } },
      { $group: { _id: '$parentComment', count: { $sum: 1 } } },
    ]);

    const replyMap = {};
    for (const item of replyCounts) {
      replyMap[item._id.toString()] = item.count;
    }

    const enriched = comments.map((c) => ({
      ...c.toObject(),
      replyCount: replyMap[c._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      data: enriched,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get replies for a specific comment
 * @route   GET /api/comments/:commentId/replies
 * @access  Public
 */
exports.getReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    const replies = await Comment.find({ parentComment: commentId })
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: replies });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a comment on a template
 * @route   POST /api/templates/:templateId/comments
 * @access  Private
 */
exports.createComment = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { content, parentComment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Validate parentComment if provided
    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        return res.status(400).json({ success: false, message: 'Invalid parent comment ID' });
      }
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }
    }

    const comment = await Comment.create({
      template: templateId,
      user: req.user._id,
      userName: req.user.name || 'Người dùng',
      userAvatar: req.user.picture || '',
      content: content.trim(),
      parentComment: parentComment || null,
    });

    // Create notification for the template owner
    if (template.author) {
      const notifType = parentComment ? 'reply' : 'comment';
      const notifMessage = parentComment
        ? `${req.user.name} đã trả lời bình luận trên "${template.title}"`
        : `${req.user.name} đã bình luận trên "${template.title}"`;

      await createNotification({
        recipientId: parentComment
          ? (await Comment.findById(parentComment))?.user
          : template.author,
        actorId: req.user._id,
        type: notifType,
        templateId,
        message: notifMessage,
      });
    }

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Like or unlike a comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
exports.toggleLikeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id;
    const isLiked = comment.likedBy.some((id) => id.toString() === userId.toString());

    if (isLiked) {
      comment.likedBy = comment.likedBy.filter((id) => id.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
    } else {
      comment.likedBy.push(userId);
      comment.likesCount += 1;
    }

    await comment.save();

    res.status(200).json({
      success: true,
      liked: !isLiked,
      likesCount: comment.likesCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a comment (only by author)
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Delete all replies to this comment as well
    await Comment.deleteMany({ parentComment: commentId });
    await Comment.deleteOne({ _id: commentId });

    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
