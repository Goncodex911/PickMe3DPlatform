const mongoose = require('mongoose');

/**
 * Append-only trace of everything that touched a payment: every webhook received (valid or not), every status
 * check against payOS, expiry, cancellation, fulfillment attempt, refund step, reconciliation and Admin action.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    orderCode: { type: Number, default: null, index: true },
    type: {
      type: String,
      enum: ['LINK_CREATE', 'WEBHOOK', 'STATUS_CHECK', 'MOCK_CONFIRM', 'EXPIRE', 'CANCEL', 'FULFILLMENT', 'REFUND', 'RECONCILE', 'ADMIN_ACTION'],
      required: true,
      index: true,
    },
    source: { type: String, default: 'system' }, // payos | mock | user | admin | job | system
    result: { type: String, default: 'OK' }, // OK | DUPLICATE | IGNORED | REJECTED | ERROR | MISMATCH | REVIEW
    message: { type: String, default: '' },
    signatureValid: { type: Boolean, default: null },
    amount: { type: Number, default: null },
    gatewayStatus: { type: String, default: '' },
    reference: { type: String, default: '' },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
