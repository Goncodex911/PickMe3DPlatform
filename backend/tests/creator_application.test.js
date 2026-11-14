const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateApplication, CREATOR_POLICY } = require('../src/config/creatorPolicy');

const valid = () => ({
  acceptPolicy: true,
  acceptCopyright: true,
  policyVersion: CREATOR_POLICY.version,
  displayName: 'Minh Thư Studio',
  phone: '0912 345 678',
  specialties: ['UI/UX', '3D', 'Hack'],
  experience: '1-3',
  portfolioUrl: 'https://behance.net/minhthu',
  sampleLinks: ['https://dribbble.com/shot/1', ''],
  introduction: 'Tôi thiết kế giao diện ứng dụng di động và bộ slide thuyết trình cho doanh nghiệp vừa và nhỏ.',
  bankName: 'Vietcombank',
  accountNumber: '0123 456 789',
  accountHolder: 'Nguyễn Thị Minh Thư',
  bankBranch: 'Hà Nội',
});

test('valid application is normalised (phone, account, holder, specialties)', () => {
  const { errors, application, bank } = validateApplication(valid());
  assert.deepEqual(errors, {});
  assert.equal(application.phone, '0912345678');
  assert.deepEqual(application.specialties, ['UI/UX', '3D']);
  assert.deepEqual(application.sampleLinks, ['https://dribbble.com/shot/1']);
  assert.equal(bank.accountNumber, '0123456789');
  assert.equal(bank.accountHolder, 'NGUYEN THI MINH THU');
});

test('policy must be accepted at the current version', () => {
  const { errors } = validateApplication({ ...valid(), acceptPolicy: false, policyVersion: 'old' });
  assert.ok(errors.acceptPolicy);
  assert.ok(errors.policyVersion);
});

test('rejects bad phone, short intro, non-numeric account and bad URLs', () => {
  const { errors } = validateApplication({
    ...valid(),
    phone: '123',
    introduction: 'ngắn',
    accountNumber: '12ab',
    portfolioUrl: 'behance.net/x',
    sampleLinks: ['javascript:alert(1)'],
    specialties: [],
  });
  for (const key of ['phone', 'introduction', 'accountNumber', 'portfolioUrl', 'sampleLinks', 'specialties']) {
    assert.ok(errors[key], `expected error on ${key}`);
  }
});

const { validateRejection } = require('../src/config/creatorPolicy');

test('rejection needs a known reason and a message of at least 20 characters', () => {
  const bad = validateRejection({ reasons: ['NOPE'], message: 'ngắn' });
  assert.ok(bad.errors.reasons);
  assert.ok(bad.errors.message);

  const ok = validateRejection({
    reasons: ['INVALID_PORTFOLIO', 'INVALID_PORTFOLIO', 'X'],
    requiredFields: ['portfolioUrl', 'role'],
    message: 'Link portfolio trả về 404, vui lòng cập nhật link mới.',
    resubmitAfterDays: 9,
  });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.rejection.reasons, ['INVALID_PORTFOLIO']);
  assert.deepEqual(ok.rejection.requiredFields, ['portfolioUrl']);
  assert.equal(ok.rejection.resubmitAfterDays, 0); // only 0 / 7 / 30 allowed
});
