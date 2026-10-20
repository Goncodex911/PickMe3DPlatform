const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reporterName: {
      type: String,
      default: '',
    },
    targetType: {
      type: String,
      enum: ['template', 'user', 'comment', 'system'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    targetTitle: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'inappropriate_content',
        'copyright_infringement',
        'harassment',
        'bug_report',
        'security_vulnerability',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Please describe the incident or issue'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedByName: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
