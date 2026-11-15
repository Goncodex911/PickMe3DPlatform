/**
 * Creator lifecycle and marketplace moderation (Role & Permission Matrix, sections 1 and 3.3).
 *   NONE -> PENDING (user applies) -> APPROVED (admin) -> SUSPENDED (admin, can be re-approved)
 * Changing creatorStatus never changes `role` and never touches Entitlements (BR-11).
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Template = require('../models/Template');
const { resolveAccess, accessSummary, ROLES } = require('../config/permissions');
const { logAdminAction } = require('../helpers/auditLogger');
const { notifyUser, notifyAdmins } = require('../helpers/notificationHelper');
const { templateOwnerType } = require('../services/accessService');
const {
  CREATOR_POLICY,
  SPECIALTIES,
  EXPERIENCE_LEVELS,
  REJECTION_REASONS,
  APPLICATION_FIELDS,
  RESUBMIT_WAIT_DAYS,
  validateApplication,
  validateRejection,
} = require('../config/creatorPolicy');

/** Rejection as shown to the applicant (codes + their labels). */
function publicRejection(user) {
  const r = user.creatorRejection;
  if (!r || !r.at) return null;
  return {
    reasons: (r.reasons || []).map((code) => ({ code, label: REJECTION_REASONS[code] || code })),
    requiredFields: (r.requiredFields || []).map((field) => ({ field, label: APPLICATION_FIELDS[field] || field })),
    message: r.message || '',
    resubmitAfter: r.resubmitAfter || null,
    at: r.at,
  };
}

const HISTORY_LIMIT = 50;

/** Appends a timeline event for the applicant (newest last, capped). */
function pushHistory(user, event, note = '') {
  const history = Array.isArray(user.creatorApplicationHistory) ? user.creatorApplicationHistory : [];
  history.push({ event, at: new Date(), note: String(note || '').trim(), code: user.creatorApplication?.code || '' });
  user.creatorApplicationHistory = history.slice(-HISTORY_LIMIT);
}

function lastEvent(user) {
  const history = user.creatorApplicationHistory || [];
  return history.length ? history[history.length - 1].event : null;
}

/** Adds N working days (Mon–Fri) to a date: the review deadline promised in the policy. */
function addWorkingDays(from, days) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return d;
}

function newApplicationCode() {
  return `CA-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Stage of the current application for the tracker:
 * NOT_SUBMITTED | SUBMITTED | IN_REVIEW | APPROVED | REJECTED | SUSPENDED
 */
function applicationStage(user) {
  const access = resolveAccess(user);
  if (access.creatorStatus === 'SUSPENDED') return 'SUSPENDED';
  if (access.accountType === 'CREATOR' && access.creatorStatus === 'APPROVED') return 'APPROVED';
  const last = lastEvent(user);
  if (access.creatorStatus === 'PENDING') return last === 'IN_REVIEW' ? 'IN_REVIEW' : 'SUBMITTED';
  if (last === 'REJECTED') return 'REJECTED';
  return 'NOT_SUBMITTED';
}
exports.applicationStage = applicationStage;

// @desc    Creator policy values shown in the application form
// @route   GET /api/users/creator-policy
// @access  Public
exports.getCreatorPolicy = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      ...CREATOR_POLICY,
      specialties: SPECIALTIES,
      experienceLevels: EXPERIENCE_LEVELS,
      rejectionReasons: REJECTION_REASONS,
      applicationFields: APPLICATION_FIELDS,
      resubmitWaitDays: RESUBMIT_WAIT_DAYS,
    },
  });
};

// @desc    Current user's Creator status, application tracker and last application (pre-fills the form)
// @route   GET /api/users/creator-application
// @access  Private (USER)
exports.getMyCreatorApplication = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'name creatorApplication creatorApplicationHistory creatorRejection savedBankInfo creatorStatus accountType role creatorReviewNote creatorAppliedAt creatorReviewedAt'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const stage = applicationStage(user);
    const submittedAt = user.creatorApplication?.submittedAt || user.creatorAppliedAt || null;
    return res.status(200).json({
      success: true,
      data: {
        ...resolveAccess(user),
        stage,
        code: user.creatorApplication?.code || '',
        reviewNote: user.creatorReviewNote || '',
        appliedAt: submittedAt,
        reviewedAt: user.creatorReviewedAt || null,
        reviewDeadline: submittedAt && (stage === 'SUBMITTED' || stage === 'IN_REVIEW')
          ? addWorkingDays(submittedAt, CREATOR_POLICY.reviewDays)
          : null,
        history: user.creatorApplicationHistory || [],
        rejection: stage === 'REJECTED' ? publicRejection(user) : null,
        application: user.creatorApplication || null,
        bank: user.savedBankInfo || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Admin starts reviewing a pending application (applicant sees "Đang xét duyệt")
// @route   PUT /api/admin/users/:id/creator-review
// @access  Private/Admin
exports.startCreatorReview = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (resolveAccess(user).creatorStatus !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'Đơn không ở trạng thái chờ duyệt' });
    }
    // Idempotent: opening the same application again does not add events or notifications.
    if (lastEvent(user) === 'IN_REVIEW') {
      return res.status(200).json({ success: true, stage: 'IN_REVIEW', unchanged: true });
    }

    pushHistory(user, 'IN_REVIEW');
    await user.save();

    await logAdminAction(req, {
      action: 'USER_CREATOR_REVIEW_START',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      details: { code: user.creatorApplication?.code || '' },
    });
    await notifyUser({
      recipientId: user._id,
      actorId: req.user._id,
      type: 'system',
      message: 'Đơn đăng ký Creator của bạn đang được xét duyệt',
      link: '/creator/apply',
    });

    return res.status(200).json({ success: true, stage: 'IN_REVIEW', history: user.creatorApplicationHistory });
  } catch (error) {
    return next(error);
  }
};

// @desc    Apply to become a Creator (multi-step form: policy, profile, bank details)
// @route   POST /api/users/creator-application
// @access  Private (USER)
exports.applyForCreator = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const access = resolveAccess(user);
    if (access.role !== ROLES.USER) {
      return res.status(400).json({ success: false, code: 'FORBIDDEN', message: 'Chỉ tài khoản USER mới đăng ký Creator' });
    }
    if (access.accountType === 'CREATOR' && access.creatorStatus === 'APPROVED') {
      return res.status(409).json({ success: false, code: 'ALREADY_CREATOR', message: 'Bạn đã là Creator' });
    }
    if (access.creatorStatus === 'PENDING') {
      return res.status(409).json({ success: false, code: 'ALREADY_PENDING', message: 'Đơn đăng ký Creator đang chờ duyệt' });
    }
    if (access.creatorStatus === 'SUSPENDED') {
      return res.status(403).json({ success: false, code: 'CREATOR_SUSPENDED', message: 'Quyền Creator đang bị tạm khóa, vui lòng liên hệ Admin' });
    }

    const waitUntil = user.creatorRejection?.resubmitAfter;
    if (waitUntil && new Date(waitUntil).getTime() > Date.now()) {
      return res.status(403).json({
        success: false,
        code: 'RESUBMIT_TOO_EARLY',
        resubmitAfter: waitUntil,
        message: `Bạn có thể gửi lại đơn từ ngày ${new Date(waitUntil).toLocaleDateString('vi-VN')}`,
      });
    }

    const { errors, application, bank } = validateApplication(req.body || {});
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Thông tin đăng ký chưa hợp lệ', errors });
    }

    const now = new Date();
    const isResubmission = (user.creatorApplicationHistory || []).some((h) => h.event === 'REJECTED');
    user.accountType = access.accountType || 'REGULAR';
    user.creatorStatus = 'PENDING';
    user.creatorAppliedAt = now;
    user.creatorReviewNote = '';
    user.creatorReviewedAt = null;
    user.creatorRejection = { reasons: [], requiredFields: [], message: '', resubmitAfter: null, at: null };
    user.creatorApplication = { ...application, code: newApplicationCode(), policyAcceptedAt: now, submittedAt: now };
    // Used later for payouts; the Creator can still change it from the wallet page.
    user.savedBankInfo = bank;
    pushHistory(user, isResubmission ? 'RESUBMITTED' : 'SUBMITTED');
    await user.save();

    await notifyAdmins({
      actorId: user._id,
      type: 'system',
      message: `${application.displayName} (${user.name}) đăng ký trở thành Creator`,
      link: '/admin/users',
      metadata: { userId: String(user._id), kind: 'creator_application' },
    });

    return res.status(200).json({
      success: true,
      message: 'Đã gửi đơn đăng ký Creator, vui lòng chờ Admin duyệt',
      data: { ...accessSummary(user), code: user.creatorApplication.code, stage: 'SUBMITTED' },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Approve / reject / suspend a Creator
// @route   PUT /api/admin/users/:id/creator-status
// @access  Private/Admin
// body: { status: 'APPROVED' | 'SUSPENDED' | 'NONE', note?: string, rejection?: {...} }
//   NONE on a PENDING application = rejection and requires
//   rejection: { reasons: string[], requiredFields: string[], message: string, resubmitAfterDays: 0 | 7 | 30 }
exports.updateCreatorStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    let note = String((req.body && req.body.note) || '');
    if (!['APPROVED', 'SUSPENDED', 'NONE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái Creator không hợp lệ (APPROVED, SUSPENDED, NONE)' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    const before = resolveAccess(user);
    if (before.role !== ROLES.USER) {
      return res.status(400).json({ success: false, message: 'Admin không có trạng thái Creator' });
    }

    // A Creator who is already approved can only be suspended; NONE on a Creator would silently strip rights.
    if (status === before.creatorStatus && before.accountType === (status === 'NONE' ? 'REGULAR' : 'CREATOR')) {
      return res.status(409).json({ success: false, message: 'Trạng thái Creator không thay đổi' });
    }

    // Rejecting an application must tell the applicant why and what to fix.
    let rejection = null;
    if (status === 'NONE' && before.creatorStatus === 'PENDING') {
      const checked = validateRejection(req.body.rejection || {});
      if (Object.keys(checked.errors).length) {
        return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Form từ chối chưa hợp lệ', errors: checked.errors });
      }
      rejection = checked.rejection;
      const now = new Date();
      user.creatorRejection = {
        reasons: rejection.reasons,
        requiredFields: rejection.requiredFields,
        message: rejection.message,
        resubmitAfter: rejection.resubmitAfterDays ? new Date(now.getTime() + rejection.resubmitAfterDays * 864e5) : null,
        at: now,
      };
      note = rejection.message;
    }

    user.creatorStatus = status;
    user.accountType = status === 'APPROVED' || status === 'SUSPENDED' ? 'CREATOR' : 'REGULAR';

    // jobRole is the public profession line. Fill it from the application when it is empty or still holds an
    // old role word (e.g. "Buyer"); a profession the user typed themselves is kept.
    const ROLE_WORDS = ['', 'buyer', 'creator', 'designer', 'user', 'người mua', 'người dùng'];
    const specialties = user.creatorApplication?.specialties || [];
    if (status === 'APPROVED' && specialties.length && ROLE_WORDS.includes(String(user.jobRole || '').trim().toLowerCase())) {
      user.jobRole = `Creator ${specialties.join(', ')}`;
    }
    user.creatorReviewedAt = new Date();
    user.creatorReviewNote = String(note).trim();

    // Timeline event for the applicant's tracker.
    // NONE = application rejected (or Creator rights withdrawn).
    let event = 'REJECTED';
    if (status === 'APPROVED') event = before.creatorStatus === 'SUSPENDED' ? 'REINSTATED' : 'APPROVED';
    else if (status === 'SUSPENDED') event = 'SUSPENDED';
    pushHistory(user, event, user.creatorReviewNote);
    await user.save();

    // BR-16: a suspended Creator stops selling; listings are hidden but purchases and revenue stay.
    let unlisted = 0;
    if (status === 'SUSPENDED') {
      const result = await Template.updateMany(
        { author: user._id, isSystem: { $ne: true }, isPublic: true },
        { $set: { isPublic: false, reviewStatus: 'TAKEN_DOWN', reviewNote: 'Creator bị tạm khóa' } }
      );
      unlisted = result.modifiedCount || 0;
    }

    await logAdminAction(req, {
      action: 'USER_CREATOR_STATUS',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      details: {
        before: { accountType: before.accountType, creatorStatus: before.creatorStatus },
        after: { accountType: user.accountType, creatorStatus: status },
        note: user.creatorReviewNote,
        rejection,
        unlisted,
      },
    });

    const messages = {
      APPROVED: 'Tài khoản của bạn đã được duyệt trở thành Creator',
      SUSPENDED: 'Quyền Creator của bạn đã bị tạm khóa',
      NONE: 'Đơn đăng ký Creator của bạn chưa được chấp thuận',
    };
    let notice = messages[status] + (user.creatorReviewNote ? `: ${user.creatorReviewNote}` : '');
    if (rejection) {
      const reasonText = rejection.reasons.map((r) => REJECTION_REASONS[r]).join('; ');
      const fixText = rejection.requiredFields.length
        ? ` Cần bổ sung: ${rejection.requiredFields.map((f) => APPLICATION_FIELDS[f]).join(', ')}.`
        : '';
      notice = `${messages.NONE}. Lý do: ${reasonText}.${fixText} Xem chi tiết và gửi lại tại trang đơn đăng ký.`;
    }
    await notifyUser({
      recipientId: user._id,
      actorId: req.user._id,
      type: 'system',
      message: notice.slice(0, 500),
      link: '/creator/apply',
      metadata: rejection ? { kind: 'creator_rejection', reasons: rejection.reasons, requiredFields: rejection.requiredFields } : {},
    });

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái Creator',
      data: { _id: user._id, ...accessSummary(user), unlisted },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Approve, reject or take down a Template listing
// @route   PUT /api/admin/templates/:id/review
// @access  Private/Admin
// body: { decision: 'APPROVED' | 'REJECTED' | 'TAKEN_DOWN', note?: string }
exports.reviewTemplate = async (req, res, next) => {
  try {
    const { decision, note = '' } = req.body || {};
    if (!['APPROVED', 'REJECTED', 'TAKEN_DOWN'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Quyết định không hợp lệ (APPROVED, REJECTED, TAKEN_DOWN)' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });

    if (decision === 'APPROVED' && !template.isPublic && templateOwnerType(template) === 'CREATOR') {
      return res.status(409).json({ success: false, message: 'Creator chưa gửi Template này lên Marketplace' });
    }

    const previous = template.reviewStatus || 'APPROVED';
    template.reviewStatus = decision;
    template.reviewNote = String(note).trim();
    template.reviewedAt = new Date();
    if (decision === 'APPROVED' && templateOwnerType(template) === 'ADMIN') template.isPublic = true;
    // Takedown removes the listing; ownership stays with the Creator and buyers keep their access.
    if (decision === 'TAKEN_DOWN') template.isPublic = false;
    await template.save();

    await logAdminAction(req, {
      action: decision === 'TAKEN_DOWN' ? 'TEMPLATE_TAKEDOWN' : 'TEMPLATE_REVIEW',
      targetType: 'template',
      targetId: template._id,
      targetLabel: template.title,
      details: { previous, decision, note: template.reviewNote },
    });

    if (template.author && templateOwnerType(template) === 'CREATOR') {
      const messages = {
        APPROVED: `Template "${template.title}" đã được duyệt và hiển thị trên Marketplace`,
        REJECTED: `Template "${template.title}" chưa được duyệt`,
        TAKEN_DOWN: `Template "${template.title}" đã bị gỡ khỏi Marketplace`,
      };
      await notifyUser({
        recipientId: template.author,
        actorId: req.user._id,
        type: 'system',
        templateId: template._id,
        message: messages[decision] + (template.reviewNote ? `: ${template.reviewNote}` : ''),
        link: '/profile',
      });
    }

    return res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái duyệt', data: template });
  } catch (error) {
    return next(error);
  }
};
