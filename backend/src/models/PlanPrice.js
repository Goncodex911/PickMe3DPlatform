const mongoose = require('mongoose');

/**
 * Admin-set monthly price of a subscription plan. The plan itself (features, quotas) stays in
 * config/plans.js; only the price is configurable. No row = the default price from config/plans.js.
 */
const planPriceSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'VND',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlanPrice', planPriceSchema);
