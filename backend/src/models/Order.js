const mongoose = require('mongoose');

/**
 * Payment lifecycle (status):
 *   PENDING   – created, waiting for the customer to pay before expiresAt.
 *   VERIFYING – result unknown (gateway unreachable, PROCESSING/UNDERPAID, amount mismatch). Never re-charge the
 *               customer while an order is VERIFYING; the reconciler keeps checking until it is resolved.
 *   PAID      – money confirmed. Delivery is tracked separately in fulfillmentStatus.
 *   CANCELLED – closed before payment (by the customer, superseded by a newer order, or by Admin).
 *   EXPIRED   – not paid before expiresAt.
 *   FAILED    – could not start (payment link creation failed). No money moved.
 *   REFUNDED  – paid, then refunded (refund.status COMPLETED). Subscriptions only.
 *   VOIDED    – a duplicate payment for a digital product the buyer already owns through another PAID order. It
 *               earns no revenue and no Creator share; the money is returned (excessReturn).
 */
const ORDER_STATUSES = ['PENDING', 'VERIFYING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED', 'VOIDED'];
const FULFILLMENT_STATUSES = ['NONE', 'PENDING', 'PROCESSING', 'DONE', 'FAILED'];
const REFUND_STATUSES = ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'];
// Money collected by mistake and sent back (not a refund: the customer keeps what they validly bought).
const EXCESS_RETURN_TYPES = ['DUPLICATE_ORDER', 'OVERPAID', 'PARTIAL_PAYMENT'];
const EXCESS_RETURN_STATUSES = ['NONE', 'PENDING', 'COMPLETED', 'CANCELLED'];

// Financial snapshot fixed when the order is created (item 1: the price cannot drift during payment).
const SNAPSHOT_FIELDS = ['amount', 'subtotal', 'discount', 'promoCode', 'grossAmount', 'creatorEarnings', 'adminRevenue', 'userId', 'orderType', 'planId', 'months', 'templateId', 'productId'];

const historySchema = new mongoose.Schema(
  {
    from: { type: String, default: '' },
    to: { type: String, required: true },
    at: { type: Date, default: Date.now },
    source: { type: String, default: 'system' }, // user | webhook | status_check | job | admin | system | reconcile
    note: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    status: { type: String, enum: REFUND_STATUSES, default: 'NONE' },
    reason: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    requestedAt: { type: Date, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, default: '' },
    reference: { type: String, default: '' }, // bank transfer reference of the refund
    proof: { type: String, default: '' },
    revokeAccess: { type: Boolean, default: true },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const excessReturnSchema = new mongoose.Schema(
  {
    status: { type: String, enum: EXCESS_RETURN_STATUSES, default: 'NONE' },
    type: { type: String, enum: [...EXCESS_RETURN_TYPES, ''], default: '' },
    amount: { type: Number, default: 0 },
    receivedTotal: { type: Number, default: 0 }, // what the customer actually paid when the return was opened
    keepOrderCode: { type: Number, default: null }, // DUPLICATE_ORDER: the valid order that keeps the access
    reason: { type: String, default: '' },
    createdAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reference: { type: String, default: '' }, // bank transfer reference of the money sent back
    proof: { type: String, default: '' },
    note: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const extraTransactionSchema = new mongoose.Schema(
  {
    reference: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
    source: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    orderType: {
      type: String,
      enum: ['SUBSCRIPTION', 'TEMPLATE_PURCHASE', 'UI_PURCHASE'],
      default: 'SUBSCRIPTION',
      index: true,
    },
    // What is bought, e.g. SUB:pro, TPL:<templateId>, UI:<productId>. Used to stop parallel open orders.
    productKey: { type: String, default: '', index: true },
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
    // Applicable for UI_PURCHASE (UI Marketplace catalogue id, always sold by Admin)
    productId: { type: String, default: '', index: true },
    productTitle: { type: String, default: '' },
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

    // Financial snapshot (immutable after creation)
    currency: { type: String, default: 'VND' },
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
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true,
    },
    expiresAt: { type: Date, default: null, index: true },

    // Gateway data
    paymentMode: { type: String, enum: ['payos', 'mock', 'unconfigured', ''], default: '' },
    checkoutUrl: { type: String, default: '' },
    paymentLinkId: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: null },
    gatewayReference: { type: String, default: '' }, // bank transaction reference from payOS
    gatewayStatus: { type: String, default: '' },
    lastVerifiedAt: { type: Date, default: null },
    verifyAttempts: { type: Number, default: 0 },
    verifyingSince: { type: Date, default: null },

    // Delivery of what was bought, independent from the payment result
    fulfillmentStatus: { type: String, enum: FULFILLMENT_STATUSES, default: 'NONE', index: true },
    fulfillmentAttempts: { type: Number, default: 0 },
    fulfillmentError: { type: String, default: '' },
    fulfillmentUpdatedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },

    // Something an Admin must look at (late payment, amount mismatch, fulfillment gave up, verify timeout…)
    needsReview: { type: Boolean, default: false, index: true },
    reviewReason: { type: String, default: '' },

    refund: { type: refundSchema, default: () => ({}) },
    excessReturn: { type: excessReturnSchema, default: () => ({}) },
    // Further bank transactions received for an order that was already paid (customer paid twice).
    extraTransactions: { type: [extraTransactionSchema], default: [] },
    statusHistory: { type: [historySchema], default: [] },

    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, productKey: 1, status: 1 });
orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ status: 1, fulfillmentStatus: 1 });
orderSchema.index({ 'refund.status': 1 });
orderSchema.index({ 'excessReturn.status': 1 });

// Pre-save hook: enforce financial split rules (Mục 2.1 & 3.2) once, when the order is created.
orderSchema.pre('save', function (next) {
  if (!this.isNew) {
    // The financial snapshot never changes after creation (refunds are recorded in `refund`, not by editing amounts).
    const changed = SNAPSHOT_FIELDS.filter((field) => this.isModified(field));
    if (changed.length) {
      return next(new Error(`Order ${this.orderCode}: financial snapshot is immutable (${changed.join(', ')})`));
    }
    return next();
  }

  const finalAmount = Number(this.amount || 0);
  if (this.grossAmount === undefined || this.grossAmount === null) {
    this.grossAmount = finalAmount;
  }
  if (this.subtotal === undefined || this.subtotal === null) {
    this.subtotal = finalAmount + Number(this.discount || 0);
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
  } else if (this.orderType === 'UI_PURCHASE') {
    // UI Marketplace is always sold by Admin
    this.sellerType = 'ADMIN';
    this.transactionSource = 'ADMIN_MARKETPLACE';
    this.creatorEarnings = 0;
    this.adminRevenue = finalAmount;
  } else {
    // SUBSCRIPTION: 100% Admin revenue
    this.sellerType = 'ADMIN';
    this.transactionSource = 'SUBSCRIPTION';
    this.creatorEarnings = 0;
    this.adminRevenue = finalAmount;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
Order.ORDER_STATUSES = ORDER_STATUSES;
Order.FULFILLMENT_STATUSES = FULFILLMENT_STATUSES;
Order.REFUND_STATUSES = REFUND_STATUSES;
Order.EXCESS_RETURN_TYPES = EXCESS_RETURN_TYPES;

module.exports = Order;
