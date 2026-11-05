const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    orderType: {
      type: String,
      enum: ['SUBSCRIPTION', 'TEMPLATE_PURCHASE'],
      default: 'SUBSCRIPTION',
      index: true,
    },
    // Applicable for SUBSCRIPTION
    planId: {
      type: String,
      enum: ['pro', 'studio'],
      required: function () {
        return this.orderType === 'SUBSCRIPTION';
      },
    },
    months: { type: Number, default: 1 },

    // Applicable for TEMPLATE_PURCHASE
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sellerType: {
      type: String,
      enum: ['ADMIN', 'CREATOR'],
      default: 'ADMIN',
      index: true,
    },
    transactionSource: {
      type: String,
      enum: ['TEMPLATE_SECTION', 'ADMIN_MARKETPLACE', 'SUBSCRIPTION'],
      default: 'SUBSCRIPTION',
      index: true,
    },

    // Financial breakdown
    subtotal: { type: Number },
    discount: { type: Number, default: 0 },
    promoCode: { type: String, default: '' },
    customer: { name: String, email: String },
    amount: { type: Number, required: true },
    grossAmount: { type: Number },
    creatorEarnings: { type: Number, default: 0 },
    adminRevenue: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    paidAt: { type: Date, default: null },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Pre-save hook: Enforce financial split rules (Mục 2.1 & 3.2)
orderSchema.pre('save', function (next) {
  const finalAmount = Number(this.amount || 0);
  if (this.grossAmount === undefined || this.grossAmount === null) {
    this.grossAmount = finalAmount;
  }

  if (this.orderType === 'TEMPLATE_PURCHASE') {
    if (this.sellerType === 'ADMIN' || this.transactionSource === 'ADMIN_MARKETPLACE') {
      // Rule 2.1.A & 2.1.C: Admin receives 100%, no Creator commission
      this.creatorEarnings = 0;
      this.adminRevenue = finalAmount;
    } else if (this.sellerType === 'CREATOR' && this.transactionSource === 'TEMPLATE_SECTION') {
      // Rule 2.1.B: Creator 70%, Admin 30%
      this.creatorEarnings = Math.round(finalAmount * 0.7);
      this.adminRevenue = finalAmount - this.creatorEarnings;
    } else {
      // Default safe fallback
      this.creatorEarnings = 0;
      this.adminRevenue = finalAmount;
    }
  } else {
    // SUBSCRIPTION: 100% Admin revenue
    this.sellerType = 'ADMIN';
    this.transactionSource = 'SUBSCRIPTION';
    this.creatorEarnings = 0;
    this.adminRevenue = finalAmount;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
