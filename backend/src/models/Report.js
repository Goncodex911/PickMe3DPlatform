const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    ticketType: {
      type: String,
      enum: ['REPORT', 'APPEAL'],
      default: 'REPORT',
      index: true,
    },
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
    senderEmail: {
      type: String,
      default: '',
      trim: true,
    },
    targetType: {
      type: String,
      enum: ['template', 'presentation', 'user', 'creator', 'comment', 'review', 'system'],
      default: 'system',
      index: true,
    },
    targetId: {
      type: String,
      default: '',
      index: true,
    },
    targetTitle: {
      type: String,
      default: '',
      trim: true,
    },
    appealCategory: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please describe the incident or issue'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    attachments: {
      type: [String],
      default: [],
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
