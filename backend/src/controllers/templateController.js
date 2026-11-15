const mongoose = require('mongoose');
const Template = require('../models/Template');
const { createNotification } = require('../helpers/notificationHelper');
const { uploadIfBase64 } = require('../services/cloudinaryService');
const { hasPermission, isAdmin } = require('../config/permissions');
const { isValidPrice, PRICE_ERROR } = require('../config/pricing');
const { logPriceChange, getPriceHistory, getPriceDrops } = require('../services/templatePriceHistory');
const {
  templateOwnerType,
  isTemplateOwner,
  isFreeTemplate,
  hasTemplateEntitlement,
  templateHasBuyers,
} = require('../services/accessService');

// Listing states that are not live on the marketplace. A missing reviewStatus = legacy approved listing.
const HIDDEN_REVIEW_STATES = ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'TAKEN_DOWN'];

function isListed(template) {
  return Boolean(template && template.isPublic && !HIDDEN_REVIEW_STATES.includes(template.reviewStatus));
}

/** Paid template content is only sent to its owner, an entitled buyer, or (for moderation) the admin. */
async function withAccess(template, user, priceDrops = {}) {
  const plain = template.toObject ? template.toObject() : { ...template };
  // Public price-drop badge (latest change lowered the price); increases are not announced.
  plain.priceDrop = priceDrops[String(template._id)] || null;
  const owner = isTemplateOwner(user, template);
  const free = isFreeTemplate(template);
  // purchased = this viewer bought it (owners and free templates are not "purchases")
  const purchased = Boolean(user) && !owner && !free && (await hasTemplateEntitlement(user, template));
  const canUse = (user && isAdmin(user)) || owner || free || purchased;
  plain.ownerType = templateOwnerType(template);
  plain.isOwner = owner;
  plain.purchased = purchased;
  plain.canUse = Boolean(canUse);
  if (!canUse) {
    // Not bought: a preview-only copy (enough to draw the thumbnail), never the usable design.
    plain.docData = previewOnlyDoc(plain.docData);
    plain.previewOnly = true;
    plain.locked = true;
  }
  return plain;
}

// Data a buyer pays for but a thumbnail does not need: animation source, interactions, notes, prompt edits.
const PREVIEW_ITEM_DROP = ['note', 'noteHistory', 'actions', 'animationHtml', 'animationJs', 'animationCss', 'html', 'js', 'code', 'prompt'];
const PREVIEW_DOC_DROP = ['promptEdit', 'promptOptions', 'brief'];

function previewOnlyDoc(docData) {
  if (!docData || typeof docData !== 'object') return null;
  const doc = { ...docData };
  for (const key of PREVIEW_DOC_DROP) delete doc[key];
  doc.groups = Array.isArray(docData.groups)
    ? docData.groups.map((g) => ({
        ...g,
        items: Array.isArray(g.items)
          ? g.items.map((it) => {
              const clean = { ...it };
              for (const key of PREVIEW_ITEM_DROP) delete clean[key];
              return clean;
            })
          : [],
      }))
    : [];
  doc.frames = Array.isArray(docData.frames) ? docData.frames.map(({ note, ...f }) => f) : [];
  return doc;
}

function forbid(res, code, message) {
  return res.status(403).json({ success: false, code, message });
}

/**
 * @desc    Get all public templates with filtering, search, and sorting
 * @route   GET /api/templates
 * @access  Public
 *
 * Query params:
 *   category   - Filter by category
 *   search     - Text search in title/description/tags
 *   tags       - Comma-separated list of tags (multi-tag filter)
 *   sort       - 'trending' | 'newest' | 'likes' | 'rating'
 *   dateRange  - 'week' | 'month' | 'all'
 *   forkable   - 'true' to show only forkable (public) templates
 *   page       - Pagination page number
 *   limit      - Items per page
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const {
      category,
      search,
      tags,
      sort = 'trending',
      dateRange,
      forkable,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isPublic: true, reviewStatus: { $nin: HIDDEN_REVIEW_STATES } };

    // Category filter
    if (category && category !== 'All' && category !== 'Tất cả') {
      query.category = category;
    }

    // Text search
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } },
      ];
    }

    // Multi-tag filter (e.g. tags=casual,modern,minimalist)
    if (tags && tags.trim() !== '') {
      const tagList = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      if (tagList.length > 0) {
        // Match templates that have ALL specified tags (case-insensitive)
        const tagConditions = tagList.map((tag) => ({
          tags: { $regex: new RegExp(`^${tag}$`, 'i') },
        }));

        if (query.$or) {
          // Combine with existing $or from search using $and
          query.$and = [{ $or: query.$or }, { $and: tagConditions }];
          delete query.$or;
        } else {
          query.$and = tagConditions;
        }
      }
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let dateFrom;

      if (dateRange === 'week') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (dateFrom) {
        query.createdAt = { $gte: dateFrom };
      }
    }

    // Forkable filter (only public templates with forksCount >= 0)
    if (forkable === 'true') {
      query.isPublic = true;
      // All public templates are forkable, but we emphasize ones that have been forked
      // This is semantically the same as isPublic: true (already set)
    }

    // Sorting
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
      .populate('author', 'name picture jobRole username')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const priceDrops = await getPriceDrops(templates);
    const data = await Promise.all(templates.map((t) => withAccess(t, req.user, priceDrops)));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data,
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
 * @desc    Get template details by ID
 * @route   GET /api/templates/:id
 * @access  Public
 */
exports.getTemplateById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const template = await Template.findById(req.params.id)
      .populate('author', 'name picture jobRole username');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Unlisted / private / under review: only the owner and the admin may see it (404 hides existence).
    if (!isListed(template) && !isTemplateOwner(req.user, template) && !(req.user && isAdmin(req.user))) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Increment views
    template.viewsCount = (template.viewsCount || 0) + 1;
    await template.save();

    res.status(200).json({
      success: true,
      data: await withAccess(template, req.user, await getPriceDrops([template])),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create/Publish a new template
 * @route   POST /api/templates
 * @access  Private
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { title, description, category, tags, thumbnailUrl, galleryImages, docData, isPublic, price } = req.body;

    // Regular users may create templates for themselves, but publishing and selling need Creator rights.
    const canPublish = hasPermission(req.user, 'template:listing:publish:own');
    const wantsPublic = isPublic !== undefined ? Boolean(isPublic) : canPublish;
    if (price !== undefined && price !== null && price !== '' && !isValidPrice(price)) {
      return res.status(400).json({ success: false, code: 'INVALID_PRICE', message: PRICE_ERROR });
    }
    const askedPrice = Math.max(0, Number(price) || 0);
    if (askedPrice > 0 && !hasPermission(req.user, 'template:listing:sell:own')) {
      return forbid(res, 'CREATOR_REQUIRED', 'Chỉ Creator đã được duyệt mới được bán Template');
    }
    const finalPublic = wantsPublic && canPublish;

    let finalThumbnail = thumbnailUrl || '';
    if (finalThumbnail && finalThumbnail.startsWith('data:')) {
      finalThumbnail = await uploadIfBase64(finalThumbnail, 'pickme3d/templates/thumbnails');
    }

    let finalGallery = [];
    if (Array.isArray(galleryImages)) {
      finalGallery = await Promise.all(
        galleryImages.map((img) => (img && img.startsWith('data:') ? uploadIfBase64(img, 'pickme3d/templates/gallery') : img))
      );
    }

    const newTemplate = await Template.create({
      title,
      description: description || '',
      category: category || 'Outfit',
      tags: tags || [],
      thumbnailUrl: finalThumbnail,
      galleryImages: finalGallery,
      author: req.user ? req.user._id : null,
      authorName: req.user ? req.user.name : 'Creator',
      authorAvatar: req.user ? req.user.picture : '',
      docData,
      isPublic: finalPublic,
      reviewStatus: finalPublic ? 'PENDING_REVIEW' : 'DRAFT',
      price: askedPrice,
      isSystem: false,
    });

    if (askedPrice > 0) await logPriceChange(req, newTemplate, 0, askedPrice, 'Giá ban đầu');

    const publishDenied = wantsPublic && !canPublish;
    res.status(201).json({
      success: true,
      data: newTemplate,
      publishDenied,
      message: publishDenied
        ? 'Đã lưu Template ở chế độ riêng tư. Chỉ Creator mới được công khai Template lên Marketplace.'
        : finalPublic
          ? 'Template đã được gửi duyệt trước khi hiển thị trên Marketplace.'
          : 'Template created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get templates created by current user
 * @route   GET /api/templates/my-templates
 * @access  Private
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
 * @desc    Update a template (privacy, tags, title, docData, etc.)
 * @route   PUT /api/templates/:id
 * @access  Private
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Ownership: only the Creator who owns it. System templates are managed through /api/admin/templates.
    if (templateOwnerType(template) !== 'CREATOR' || !isTemplateOwner(req.user, template)) {
      return forbid(res, 'NOT_OWNER', 'Bạn không phải chủ sở hữu Template này');
    }

    const { title, description, category, tags, thumbnailUrl, galleryImages, docData, isPublic, price } = req.body;

    if (isPublic === true && !template.isPublic && !hasPermission(req.user, 'template:listing:publish:own')) {
      return forbid(res, 'CREATOR_REQUIRED', 'Chỉ Creator đã được duyệt mới được công khai Template');
    }
    const previousPrice = Number(template.price || 0);
    if (price !== undefined && Number(price) !== Number(template.price || 0)) {
      if (!hasPermission(req.user, 'template:listing:sell:own')) {
        return forbid(res, 'CREATOR_REQUIRED', 'Chỉ Creator đã được duyệt mới được đặt giá Template');
      }
      if (!isValidPrice(price)) {
        return res.status(400).json({ success: false, code: 'INVALID_PRICE', message: PRICE_ERROR });
      }
      template.price = Number(price);
    }
    if (title !== undefined) template.title = title;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;
    if (tags !== undefined) template.tags = tags;
    if (thumbnailUrl !== undefined) {
      if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
        template.thumbnailUrl = await uploadIfBase64(thumbnailUrl, 'pickme3d/templates/thumbnails');
      } else {
        template.thumbnailUrl = thumbnailUrl;
      }
    }
    if (galleryImages !== undefined && Array.isArray(galleryImages)) {
      template.galleryImages = await Promise.all(
        galleryImages.map((img) => (img && img.startsWith('data:') ? uploadIfBase64(img, 'pickme3d/templates/gallery') : img))
      );
    }
    if (docData !== undefined) template.docData = docData;
    if (isPublic !== undefined && Boolean(isPublic) !== Boolean(template.isPublic)) {
      template.isPublic = Boolean(isPublic);
      // Every (re)publish goes through Admin review; unpublishing keeps a takedown on record.
      if (template.isPublic) template.reviewStatus = 'PENDING_REVIEW';
      else if (template.reviewStatus !== 'TAKEN_DOWN') template.reviewStatus = 'DRAFT';
    }

    const updated = await template.save();
    await logPriceChange(req, updated, previousPrice, updated.price);
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
 * @desc    Delete a template
 * @route   DELETE /api/templates/:id
 * @access  Private
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (templateOwnerType(template) !== 'CREATOR' || !isTemplateOwner(req.user, template)) {
      return forbid(res, 'NOT_OWNER', 'Bạn không phải chủ sở hữu Template này');
    }

    // BR-15: buyers keep their right to use it, so a sold template is only unlisted.
    if (await templateHasBuyers(template)) {
      template.isPublic = false;
      if (template.reviewStatus !== 'TAKEN_DOWN') template.reviewStatus = 'DRAFT';
      await template.save();
      return res.status(200).json({
        success: true,
        unlisted: true,
        message: 'Template đã có người mua nên được gỡ khỏi Marketplace thay vì xóa hẳn',
      });
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
 * @desc    Track cover/fork of a template
 * @route   POST /api/templates/:id/cover
 * @access  Public
 */
exports.coverTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    template.forksCount = (template.forksCount || 0) + 1;
    await template.save();

    // Notify template owner about the fork (if actor info available from body)
    if (template.author && req.body.actorId) {
      await createNotification({
        recipientId: template.author,
        actorId: req.body.actorId,
        type: 'fork',
        templateId: template._id,
        message: `Có người đã fork thiết kế "${template.title}" của bạn`,
      });
    }

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
 * @desc    Like or unlike a template
 * @route   POST /api/templates/:id/like
 * @access  Private
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

      // Notify template owner about the like
      if (template.author) {
        await createNotification({
          recipientId: template.author,
          actorId: userId,
          type: 'like',
          templateId: template._id,
          message: `${req.user.name} đã thích thiết kế "${template.title}" của bạn`,
        });
      }
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
 * @desc    Add or update review/rating for a template
 * @route   POST /api/templates/:id/review
 * @access  Private
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

      // Notify template owner about the new review
      if (template.author) {
        await createNotification({
          recipientId: template.author,
          actorId: userId,
          type: 'review',
          templateId: template._id,
          message: `${userName} đã đánh giá ${numRating}★ cho "${template.title}"`,
        });
      }
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

/**
 * @desc    Delete review from a template (Admin or review author)
 * @route   DELETE /api/templates/:id/review/:reviewId
 * @access  Private
 */
exports.deleteTemplateReview = async (req, res, next) => {
  try {
    const { id: templateId, reviewId } = req.params;
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (!template.reviews || template.reviews.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá nào' });
    }

    const reviewIndex = template.reviews.findIndex((r, idx) => {
      if (r._id && r._id.toString() === reviewId.toString()) return true;
      if (r.user && r.user.toString() === reviewId.toString()) return true;
      if (`${templateId}-review-${idx}` === reviewId) return true;
      if (String(idx) === reviewId) return true;
      return false;
    });

    if (reviewIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần xóa' });
    }

    const review = template.reviews[reviewIndex];
    const isOwner = req.user && review.user && req.user._id.toString() === review.user.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này' });
    }

    // Remove review
    template.reviews.splice(reviewIndex, 1);

    // Recalculate rating stats
    template.ratingsCount = template.reviews.length;
    if (template.ratingsCount > 0) {
      const totalScore = template.reviews.reduce((sum, r) => sum + r.rating, 0);
      template.avgRating = Number((totalScore / template.ratingsCount).toFixed(1));
    } else {
      template.avgRating = 0;
    }

    await template.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa đánh giá thành công',
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

/**
 * Only the owner prices a template: the Creator for their own templates, the Admin for the system catalogue.
 * Returns the template or sends the error response.
 */
async function loadOwnedTemplate(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ success: false, message: 'Template not found' });
    return null;
  }
  const template = await Template.findById(req.params.id);
  if (!template) {
    res.status(404).json({ success: false, message: 'Template not found' });
    return null;
  }
  if (!isTemplateOwner(req.user, template)) {
    forbid(res, 'NOT_OWNER', 'Chỉ người tạo và sở hữu Template mới được xem hoặc sửa giá');
    return null;
  }
  return template;
}

/**
 * @desc    Change a template's price (owner only) with an optional note kept in the price history
 * @route   PUT /api/templates/:id/price   body: { price, note? }
 * @access  Private (owner)
 */
exports.updateTemplatePrice = async (req, res, next) => {
  try {
    const template = await loadOwnedTemplate(req, res);
    if (!template) return;
    const ownerType = templateOwnerType(template);
    const permission = ownerType === 'ADMIN' ? 'template:listing:sell:system' : 'template:listing:sell:own';
    if (!hasPermission(req.user, permission)) {
      return forbid(res, ownerType === 'ADMIN' ? 'FORBIDDEN' : 'CREATOR_REQUIRED', 'Bạn không có quyền đặt giá Template này');
    }
    const { price, note = '' } = req.body || {};
    if (!isValidPrice(price)) {
      return res.status(400).json({ success: false, code: 'INVALID_PRICE', message: PRICE_ERROR });
    }
    const previousPrice = Number(template.price || 0);
    if (Number(price) === previousPrice) {
      return res.status(409).json({ success: false, code: 'PRICE_UNCHANGED', message: 'Giá mới trùng với giá hiện tại' });
    }
    template.price = Number(price);
    await template.save();
    await logPriceChange(req, template, previousPrice, template.price, note);
    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật giá Template',
      data: { _id: template._id, price: template.price, isPaid: template.isPaid, history: await getPriceHistory(template) },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Price versions of a template (owner only)
 * @route   GET /api/templates/:id/price-history
 * @access  Private (owner)
 */
exports.getTemplatePriceHistory = async (req, res, next) => {
  try {
    const template = await loadOwnedTemplate(req, res);
    if (!template) return;
    return res.status(200).json({
      success: true,
      data: {
        price: Number(template.price || 0),
        ownerType: templateOwnerType(template),
        history: await getPriceHistory(template),
      },
    });
  } catch (error) {
    return next(error);
  }
};
