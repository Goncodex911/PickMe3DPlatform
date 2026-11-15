const mongoose = require('mongoose');

/**
 * Right of a user to USE a product. Independent of role (BR-11) and never implies ownership (BR-13).
 * Created only when an order becomes PAID (or by an explicit admin GRANT); a refund sets revokedAt.
 */
const entitlementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productType: {
      type: String,
      enum: ['TEMPLATE', 'UI_PRODUCT', 'SUBSCRIPTION'],
      required: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['PURCHASE', 'SUBSCRIPTION', 'GRANT'],
      default: 'PURCHASE',
    },
    orderCode: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

entitlementSchema.index({ userId: 1, productType: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Entitlement', entitlementSchema);
