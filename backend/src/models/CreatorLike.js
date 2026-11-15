const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

schema.index({ user: 1, creator: 1 }, { unique: true });
schema.index({ creator: 1 });

module.exports = mongoose.model('CreatorLike', schema);
