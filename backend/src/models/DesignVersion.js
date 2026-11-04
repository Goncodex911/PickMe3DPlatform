const mongoose = require('mongoose');

const designVersionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      default: 'PickMe3D Designer',
    },
    versionName: {
      type: String,
      required: true,
      trim: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    docData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    stats: {
      frameCount: { type: Number, default: 0 },
      nodeCount: { type: Number, default: 0 },
      wireCount: { type: Number, default: 0 },
    },
    isSnapshot: {
      type: Boolean,
      default: false, // true = manual checkpoint, false = auto-saved
    },
    isRollback: {
      type: Boolean,
      default: false, // true = auto-checkpoint created right before performing a rollback
    },
    rollbackFromVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DesignVersion',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast retrieval of versions for a template ordered by versionNumber descending
designVersionSchema.index({ templateId: 1, versionNumber: -1 });

module.exports = mongoose.model('DesignVersion', designVersionSchema);

