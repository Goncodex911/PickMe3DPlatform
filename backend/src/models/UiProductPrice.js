const mongoose = require('mongoose');

/**
 * Price of a UI Marketplace product. Products themselves come from the fixed catalogue
 * (frontend/public/ux-full-catalog.json): Admin can only price an existing catalogue id, never add a product.
 * No row = free (price 0).
 */
const uiProductPriceSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('UiProductPrice', uiProductPriceSchema);
