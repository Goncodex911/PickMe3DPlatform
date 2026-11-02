const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const User = require('../models/User');
const Template = require('../models/Template');

async function creatorExists(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'Creator không hợp lệ' });
    return false;
  }
  if (!await User.exists({ _id: req.params.id, status: { $ne: 'banned' } })) {
    res.status(404).json({ success: false, message: 'Không tìm thấy Creator' });
    return false;
  }
  return true;
}

exports.followStatus = async (req, res, next) => {
  try {
    if (!await creatorExists(req, res)) return;
    const [following, followersCount] = await Promise.all([
      Follow.exists({ follower: req.user.id, creator: req.params.id }),
      Follow.countDocuments({ creator: req.params.id }),
    ]);
    res.json({ success: true, data: { following: Boolean(following), followersCount } });
  } catch (err) { next(err); }
};

exports.setFollow = async (req, res, next) => {
  try {
    if (!await creatorExists(req, res)) return;
    if (String(req.user.id) === req.params.id) {
      return res.status(400).json({ success: false, message: 'Không thể tự theo dõi bản thân' });
    }
    const filter = { follower: req.user.id, creator: req.params.id };
    if (req.method === 'DELETE') await Follow.deleteOne(filter);
    else {
      try { await Follow.updateOne(filter, { $setOnInsert: filter }, { upsert: true }); }
      catch (err) { if (err.code !== 11000) throw err; }
    }
    return exports.followStatus(req, res, next);
  } catch (err) { next(err); }
};

// Join in MongoDB so the number of followed creators does not grow request memory.
exports.activityFeed = async (req, res, next) => {
  try {
    const page = Math.min(1000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = 20;
    const data = await Template.aggregate([
      { $match: { isPublic: true } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $lookup: { from: 'follows', let: { author: '$author' }, pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$creator', '$$author'] },
          { $eq: ['$follower', new mongoose.Types.ObjectId(req.user.id)] },
        ] } } }, { $limit: 1 },
      ], as: 'follow' } },
      { $match: { 'follow.0': { $exists: true } } },
      { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'creator' } },
      { $unwind: '$creator' },
      { $match: { 'creator.status': { $ne: 'banned' } } },
      { $skip: (page - 1) * limit }, { $limit: limit + 1 },
      { $project: { title: 1, thumbnailUrl: 1, createdAt: 1,
        'creator.name': 1, 'creator.username': 1, 'creator.picture': 1 } },
    ]);
    res.json({ success: true, data: data.slice(0, limit), page, hasMore: data.length > limit });
  } catch (err) { next(err); }
};
