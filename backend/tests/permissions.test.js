const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { resolveAccess, hasPermission, denialCode, permissionsFor } = require('../src/config/permissions');
const { requirePermission, authorize } = require('../src/middlewares/authMiddleware');
const { templateOwnerType, isTemplateOwner, isFreeTemplate } = require('../src/services/accessService');

const admin = { _id: 'a1', role: 'admin' };
const regular = { _id: 'r1', role: 'user', accountType: 'REGULAR', creatorStatus: 'NONE' };
const pending = { _id: 'p1', role: 'user', accountType: 'REGULAR', creatorStatus: 'PENDING' };
const creator = { _id: 'c1', role: 'user', accountType: 'CREATOR', creatorStatus: 'APPROVED' };
const suspended = { _id: 's1', role: 'user', accountType: 'CREATOR', creatorStatus: 'SUSPENDED' };
const legacyUser = { _id: 'l1', role: 'user' }; // pre-migration: keeps old creator rights
const legacyBuyer = { _id: 'b1', role: 'buyer' };

function run(middleware, user) {
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let passed = false;
  middleware({ user }, res, () => { passed = true; });
  return { passed, res };
}

describe('Role & Permission Matrix: roles', () => {
  test('only USER and ADMIN exist; Creator is an account type of user (BR-01, BR-02)', () => {
    assert.equal(resolveAccess(creator).role, 'user');
    assert.equal(resolveAccess(admin).role, 'admin');
    assert.equal(resolveAccess(admin).accountType, null);
    assert.equal(resolveAccess({ role: 'creator' }).role, 'user');
    assert.equal(resolveAccess(legacyBuyer).accountType, 'REGULAR');
    assert.equal(resolveAccess(legacyUser).accountType, 'CREATOR');
  });
});

describe('Role & Permission Matrix: templates', () => {
  test('Regular may create a template but not publish or sell it (BR-04, doc update)', () => {
    assert.ok(hasPermission(regular, 'template:listing:create'));
    assert.ok(!hasPermission(regular, 'template:listing:publish:own'));
    assert.ok(!hasPermission(regular, 'template:listing:sell:own'));
    assert.equal(denialCode(regular, 'template:listing:publish:own'), 'CREATOR_REQUIRED');
  });

  test('approved Creator publishes and sells; pending or suspended Creator does not (BR-03, BR-16)', () => {
    assert.ok(hasPermission(creator, 'template:listing:publish:own'));
    assert.ok(hasPermission(creator, 'payment:payout:create:own'));
    assert.ok(!hasPermission(pending, 'template:listing:publish:own'));
    assert.ok(!hasPermission(suspended, 'template:listing:sell:own'));
    assert.equal(denialCode(suspended, 'template:listing:sell:own'), 'CREATOR_NOT_APPROVED');
    // suspended Creator keeps buying rights
    assert.ok(hasPermission(suspended, 'template:listing:purchase'));
  });

  test('Admin cannot create templates but moderates and sells the system catalogue (BR-05)', () => {
    assert.ok(!hasPermission(admin, 'template:listing:create'));
    assert.ok(hasPermission(admin, 'template:listing:sell:system'));
    assert.ok(hasPermission(admin, 'template:listing:takedown:any'));
    assert.ok(hasPermission(admin, 'template:listing:purchase'));
    assert.ok(!hasPermission(admin, 'template:listing:publish:own'));
  });

  test('Admin has no wallet and buys no subscription of its own products (BR-08, BR-09)', () => {
    assert.ok(!hasPermission(admin, 'payment:wallet:view:own'));
    assert.ok(!hasPermission(admin, 'slide:subscription:purchase'));
    assert.ok(!hasPermission(admin, 'ui:product:purchase'));
    assert.ok(hasPermission(admin, 'slide:editor:access:any'));
  });

  test('ownership: system templates belong to Admin, others to their author (BR-07, BR-13)', () => {
    const system = { _id: 't1', isSystem: true, author: 'a1' };
    const own = { _id: 't2', isSystem: false, sellerType: 'CREATOR', author: 'c1', price: 50000 };
    assert.equal(templateOwnerType(system), 'ADMIN');
    assert.equal(templateOwnerType(own), 'CREATOR');
    assert.ok(isTemplateOwner(admin, system));
    assert.ok(!isTemplateOwner(creator, system));
    assert.ok(isTemplateOwner(creator, own));
    assert.ok(!isTemplateOwner(admin, own)); // S19: Admin does not own Creator templates
    assert.ok(!isTemplateOwner(regular, own));
    assert.ok(!isFreeTemplate(own));
  });
});

describe('Role & Permission Matrix: middleware', () => {
  test('requirePermission returns 403 with a machine-readable code', () => {
    const mw = requirePermission('template:listing:publish:own');
    const denied = run(mw, regular);
    assert.equal(denied.passed, false);
    assert.equal(denied.res.statusCode, 403);
    assert.equal(denied.res.body.code, 'CREATOR_REQUIRED');
    assert.equal(run(mw, creator).passed, true);
    assert.equal(run(requirePermission('template:listing:create'), admin).res.body.code, 'FORBIDDEN');
  });

  test('authorize compares normalized roles, so legacy creator values are never admin', () => {
    assert.equal(run(authorize('admin'), { role: 'creator' }).passed, false);
    assert.equal(run(authorize('admin'), admin).passed, true);
    assert.equal(run(authorize('user'), legacyBuyer).passed, true);
  });

  test('permission lists stay disjoint where the matrix says Deny', () => {
    assert.ok(!permissionsFor(regular).some((p) => p.startsWith('payment:wallet')));
    assert.ok(!permissionsFor(creator).some((p) => p.endsWith(':any')));
  });
});
