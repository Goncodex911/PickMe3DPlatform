const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    planId: { type: String, enum: ['pro', 'studio'], required: true },
    months: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING' },
    paidAt: { type: Date, default: null },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
