const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
schema.index({ follower: 1, creator: 1 }, { unique: true });
schema.index({ creator: 1 });
module.exports = mongoose.model('Follow', schema);
