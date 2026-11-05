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
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    currency: {
      type: String,
      default: 'VND',
      uppercase: true,
      trim: true,
    },
    sellerType: {
      type: String,
      enum: ['ADMIN', 'CREATOR'],
      default: 'CREATOR',
      index: true,
    },
    marketplaceSource: {
      type: String,
      enum: ['TEMPLATE_SECTION', 'ADMIN_MARKETPLACE'],
      default: 'TEMPLATE_SECTION',
      index: true,
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

templateSchema.pre('save', function (next) {
  if (this.price !== undefined) {
    this.isPaid = Number(this.price) > 0;
  }
  if (this.isSystem && !this.sellerType) {
    this.sellerType = 'ADMIN';
  }
  next();
});

templateSchema.index({ isPublic: 1, createdAt: -1, _id: -1 });
templateSchema.index({ sellerType: 1, marketplaceSource: 1, isPaid: 1 });

// Text index for search
templateSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Template', templateSchema);
