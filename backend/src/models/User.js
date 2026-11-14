const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    googleId: {
      type: String, 
      unique: true,
      sparse: true,
    },
    picture: {
      type: String,
    },
    googlePicture: {
      type: String,
      default: '',
    },
    // Only two system roles. Creator is an account type of 'user', not a role (see config/permissions.js).
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // No default on purpose: a 'user' without accountType is a pre-migration account and keeps its legacy
    // creator rights until scripts/migrate-roles.js assigns REGULAR or CREATOR. New accounts set it explicitly.
    accountType: {
      type: String,
      enum: ['REGULAR', 'CREATOR'],
    },
    creatorStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'SUSPENDED'],
    },
    creatorAppliedAt: {
      type: Date,
      default: null,
    },
    creatorReviewedAt: {
      type: Date,
      default: null,
    },
    creatorReviewNote: {
      type: String,
      default: '',
      trim: true,
    },
    // Last Creator application, kept for Admin review and audit. Bank details go to savedBankInfo.
    // Last structured rejection sent to the applicant (cleared on the next submission).
    creatorRejection: {
      reasons: { type: [String], default: [] },
      requiredFields: { type: [String], default: [] },
      message: { type: String, default: '', trim: true },
      resubmitAfter: { type: Date, default: null },
      at: { type: Date, default: null },
    },
    // Timeline shown to the applicant on /creator/apply. Newest last, capped in creatorController.
    creatorApplicationHistory: [
      {
        _id: false,
        event: {
          type: String,
          enum: ['SUBMITTED', 'RESUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REINSTATED'],
          required: true,
        },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '', trim: true },
        code: { type: String, default: '' },
      },
    ],
    creatorApplication: {
      code: { type: String, default: '' },
      displayName: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      specialties: { type: [String], default: [] },
      experience: { type: String, default: '', trim: true },
      portfolioUrl: { type: String, default: '', trim: true },
      sampleLinks: { type: [String], default: [] },
      introduction: { type: String, default: '', trim: true },
      bankBranch: { type: String, default: '', trim: true },
      policyVersion: { type: String, default: '' },
      policyAcceptedAt: { type: Date, default: null },
      submittedAt: { type: Date, default: null },
    },
    jobRole: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
      index: true,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    bannedReason: {
      type: String,
      default: '',
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'studio'],
      default: 'free',
    },
    planExpiresAt: {
      type: Date,
      default: null,
    },
    aiUsed: {
      type: Number,
      default: 0,
    },
    aiPeriod: {
      type: String,
      default: '',
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    // Short lock while a payout request is being checked and created, so two requests can't both pass the balance check.
    payoutLockUntil: {
      type: Date,
      default: null,
    },
    savedBankInfo: {
      bankName: {
        type: String,
        default: '',
        trim: true,
      },
      accountNumber: {
        type: String,
        default: '',
        trim: true,
      },
      accountHolder: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
