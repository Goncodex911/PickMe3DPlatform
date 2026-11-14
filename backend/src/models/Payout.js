const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creatorName: {
      type: String,
      required: true,
    },
    creatorEmail: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Vui lòng nhập số tiền rút'],
      min: [10000, 'Số tiền rút tối thiểu là 10.000 VNĐ'],
    },
    creatorBalance: {
      type: Number,
      default: 0,
    },
    bankInfo: {
      bankName: {
        type: String,
        required: [true, 'Vui lòng nhập tên ngân hàng'],
      },
      accountNumber: {
        type: String,
        required: [true, 'Vui lòng nhập số tài khoản'],
      },
      accountHolder: {
        type: String,
        required: [true, 'Vui lòng nhập tên chủ tài khoản'],
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
    paymentProof: {
      type: String,
      default: '',
      trim: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);

