const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please enter a template title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Outfit',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      default: 'PickMe3D Creator',
    },
    authorAvatar: {
      type: String,
      default: '',
    },
    docData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    forksCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    ratingsCount: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        userAvatar: {
          type: String,
          default: '',
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          default: '',
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Text index for search
templateSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Template', templateSchema);
