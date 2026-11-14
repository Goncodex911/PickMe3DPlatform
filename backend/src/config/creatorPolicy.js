/**
 * Creator programme policy. The application form shows these values and must send back POLICY_VERSION;
 * bump the version whenever the policy text changes so every applicant accepts the current terms.
 */
const CREATOR_POLICY = Object.freeze({
  version: '2026-11',
  creatorSharePercent: 70, // matches paymentController split for Creator templates in TEMPLATE_SECTION
  platformSharePercent: 30,
  minPayoutVnd: 10000, // matches payoutController.requestPayout
  reviewDays: 3,
});

const SPECIALTIES = Object.freeze(['UI/UX', 'Web', 'Mobile', 'Slide', '3D', 'Illustration', 'Branding', 'Other']);
const EXPERIENCE_LEVELS = Object.freeze(['<1', '1-3', '3-5', '5+']);

// Structured rejection: what the Admin can tell an applicant (labels are shown to the applicant as-is).
const REJECTION_REASONS = Object.freeze({
  INCOMPLETE_INFO: 'Thông tin chưa đầy đủ hoặc chưa rõ ràng',
  INVALID_PORTFOLIO: 'Portfolio / sản phẩm mẫu không truy cập được hoặc không phải của bạn',
  INSUFFICIENT_QUALITY: 'Chất lượng sản phẩm mẫu chưa đạt yêu cầu bán trên Marketplace',
  BANK_MISMATCH: 'Thông tin ngân hàng không hợp lệ hoặc không trùng tên tài khoản',
  POLICY_VIOLATION: 'Nội dung vi phạm Chính sách Creator',
  DUPLICATE_ACCOUNT: 'Trùng với một tài khoản Creator khác',
  OTHER: 'Lý do khác',
});

// Application fields the Admin can ask the applicant to fix.
const APPLICATION_FIELDS = Object.freeze({
  displayName: 'Tên hiển thị',
  phone: 'Số điện thoại',
  specialties: 'Lĩnh vực chuyên môn',
  experience: 'Kinh nghiệm',
  portfolioUrl: 'Link portfolio',
  sampleLinks: 'Sản phẩm mẫu',
  introduction: 'Giới thiệu',
  bankName: 'Ngân hàng',
  accountNumber: 'Số tài khoản',
  accountHolder: 'Tên chủ tài khoản',
});

const RESUBMIT_WAIT_DAYS = Object.freeze([0, 7, 30]);

/** Validates the Admin's rejection form. */
function validateRejection(body = {}) {
  const errors = {};
  const reasons = Array.isArray(body.reasons) ? [...new Set(body.reasons.filter((r) => REJECTION_REASONS[r]))] : [];
  if (!reasons.length) errors.reasons = 'Chọn ít nhất 1 lý do';
  const requiredFields = Array.isArray(body.requiredFields)
    ? [...new Set(body.requiredFields.filter((f) => APPLICATION_FIELDS[f]))]
    : [];
  const message = String(body.message ?? '').trim().slice(0, 1500);
  if (message.length < 20) errors.message = 'Lời nhắn cho người đăng ký tối thiểu 20 ký tự';
  const resubmitAfterDays = RESUBMIT_WAIT_DAYS.includes(Number(body.resubmitAfterDays)) ? Number(body.resubmitAfterDays) : 0;
  if (Object.keys(errors).length) return { errors };
  return { errors, rejection: { reasons, requiredFields, message, resubmitAfterDays } };
}

const PHONE_RE = /^(0|\+84)\d{9,10}$/;
const ACCOUNT_RE = /^\d{6,19}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Validates and normalises a Creator application body.
 * @returns {{ errors: Record<string,string>, application?: object, bank?: object }}
 */
function validateApplication(body = {}) {
  const errors = {};
  const str = (v, max) => String(v ?? '').trim().slice(0, max);

  if (body.acceptPolicy !== true) errors.acceptPolicy = 'Bạn cần đồng ý với Chính sách Creator';
  if (body.acceptCopyright !== true) errors.acceptCopyright = 'Bạn cần cam kết về bản quyền nội dung';
  if (body.policyVersion !== CREATOR_POLICY.version) {
    errors.policyVersion = 'Chính sách đã được cập nhật, vui lòng tải lại trang và đọc lại';
  }

  const displayName = str(body.displayName, 60);
  if (displayName.length < 2) errors.displayName = 'Tên hiển thị tối thiểu 2 ký tự';

  const phone = str(body.phone, 15).replace(/[\s.-]/g, '');
  if (!PHONE_RE.test(phone)) errors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';

  const specialties = Array.isArray(body.specialties)
    ? [...new Set(body.specialties.filter((s) => SPECIALTIES.includes(s)))]
    : [];
  if (!specialties.length) errors.specialties = 'Chọn ít nhất 1 lĩnh vực';

  const experience = EXPERIENCE_LEVELS.includes(body.experience) ? body.experience : '';
  if (!experience) errors.experience = 'Chọn số năm kinh nghiệm';

  const portfolioUrl = str(body.portfolioUrl, 300);
  if (!URL_RE.test(portfolioUrl)) errors.portfolioUrl = 'Link portfolio phải bắt đầu bằng http:// hoặc https://';

  const sampleLinks = (Array.isArray(body.sampleLinks) ? body.sampleLinks : [])
    .map((l) => str(l, 300))
    .filter(Boolean)
    .slice(0, 3);
  if (sampleLinks.some((l) => !URL_RE.test(l))) errors.sampleLinks = 'Link sản phẩm mẫu không hợp lệ';

  const introduction = str(body.introduction, 1000);
  if (introduction.length < 50) errors.introduction = 'Giới thiệu tối thiểu 50 ký tự';

  const bankName = str(body.bankName, 80);
  if (!bankName) errors.bankName = 'Chọn ngân hàng';
  const accountNumber = str(body.accountNumber, 30).replace(/\s/g, '');
  if (!ACCOUNT_RE.test(accountNumber)) errors.accountNumber = 'Số tài khoản gồm 6–19 chữ số';
  const accountHolder = stripAccents(str(body.accountHolder, 80)).toUpperCase().replace(/\s+/g, ' ');
  if (!/^[A-Z ]{3,}$/.test(accountHolder)) errors.accountHolder = 'Tên chủ tài khoản viết in hoa, không dấu, đúng như trên thẻ';
  const bankBranch = str(body.bankBranch, 120);

  if (Object.keys(errors).length) return { errors };

  return {
    errors,
    application: {
      displayName,
      phone,
      specialties,
      experience,
      portfolioUrl,
      sampleLinks,
      introduction,
      bankBranch,
      policyVersion: CREATOR_POLICY.version,
    },
    bank: { bankName, accountNumber, accountHolder },
  };
}

module.exports = {
  CREATOR_POLICY,
  SPECIALTIES,
  EXPERIENCE_LEVELS,
  REJECTION_REASONS,
  APPLICATION_FIELDS,
  RESUBMIT_WAIT_DAYS,
  validateApplication,
  validateRejection,
  stripAccents,
};
