const mongoose = require('mongoose');

const marketplacePurchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    templateId: {
      type: String,
      required: [true, 'Template ID is required'],
      trim: true,
      index: true,
    },
    templateTitle: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee a user cannot duplicate purchases for the same template
marketplacePurchaseSchema.index({ user: 1, templateId: 1 }, { unique: true });

module.exports = mongoose.model('MarketplacePurchase', marketplacePurchaseSchema);

