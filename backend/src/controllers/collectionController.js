const mongoose = require('mongoose');
const Collection = require('../models/Collection');

/**
 * @desc    Get all collections of current user
 * @route   GET /api/collections
 * @access  Private
 */
exports.getMyCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ user: req.user._id })
      .populate('templates', 'title thumbnailUrl likesCount')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single collection by ID
 * @route   GET /api/collections/:id
 * @access  Public (if isPublic) / Private (if owner)
 */
exports.getCollectionById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    const collection = await Collection.findById(req.params.id)
      .populate('user', 'name picture username')
      .populate({
        path: 'templates',
        select: 'title description category tags thumbnailUrl authorName likesCount viewsCount forksCount avgRating createdAt',
      });

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // If not public and not the owner, deny access
    if (!collection.isPublic) {
      if (!req.user || collection.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'This collection is private' });
      }
    }

    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public collections of a specific user
 * @route   GET /api/collections/user/:userId
 * @access  Public
 */
exports.getUserPublicCollections = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const collections = await Collection.find({ user: userId, isPublic: true })
      .populate('templates', 'title thumbnailUrl likesCount')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new collection
 * @route   POST /api/collections
 * @access  Private
 */
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description, isPublic, coverImage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Collection name is required' });
    }

    const collection = await Collection.create({
      name: name.trim(),
      description: description || '',
      user: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true,
      coverImage: coverImage || '',
      templates: [],
    });

    res.status(201).json({
      success: true,
      data: collection,
      message: 'Collection created successfully',
    });
  } catch (error) {
    // Handle duplicate name per user
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a collection with this name',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update a collection (name, description, privacy)
 * @route   PUT /api/collections/:id
 * @access  Private
 */
exports.updateCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description, isPublic, coverImage } = req.body;
    if (name !== undefined) collection.name = name.trim();
    if (description !== undefined) collection.description = description;
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (coverImage !== undefined) collection.coverImage = coverImage;

    const updated = await collection.save();
    res.status(200).json({ success: true, data: updated, message: 'Collection updated' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a collection with this name',
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete a collection
 * @route   DELETE /api/collections/:id
 * @access  Private
 */
exports.deleteCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Collection.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, message: 'Collection deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a template to a collection
 * @route   POST /api/collections/:id/templates
 * @access  Private
 */
exports.addTemplateToCollection = async (req, res, next) => {
  try {
    const { templateId } = req.body;

    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ success: false, message: 'Valid template ID is required' });
    }

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent duplicates
    const alreadyExists = collection.templates.some(
      (id) => id.toString() === templateId
    );

    if (alreadyExists) {
      return res.status(400).json({ success: false, message: 'Template already in this collection' });
    }

    collection.templates.push(templateId);
    await collection.save();

    res.status(200).json({
      success: true,
      data: collection,
      message: 'Template added to collection',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a template from a collection
 * @route   DELETE /api/collections/:id/templates/:templateId
 * @access  Private
 */
exports.removeTemplateFromCollection = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    collection.templates = collection.templates.filter(
      (id) => id.toString() !== templateId
    );

    await collection.save();

    res.status(200).json({
      success: true,
      data: collection,
      message: 'Template removed from collection',
    });
  } catch (error) {
    next(error);
  }
};
