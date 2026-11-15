/**
 * Single source of truth for authorization (see "Role & Permission Matrix — SaaS Marketplace").
 *
 * Two system roles only: 'user' and 'admin'.
 * Creator is NOT a role: it is `accountType = 'CREATOR'` on a 'user', active only when `creatorStatus = 'APPROVED'`.
 * Product access (Ownership / Entitlement) is checked separately in services/accessService.js — never derived from role.
 *
 * Permission format: <module>:<resource>:<action>[:<scope>]
 *   scope: own (record belongs to caller), any (every record), system (Admin-owned catalogue), licensed (needs Entitlement)
 */

const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });
const ACCOUNT_TYPES = Object.freeze({ REGULAR: 'REGULAR', CREATOR: 'CREATOR' });
const CREATOR_STATUSES = Object.freeze({ NONE: 'NONE', PENDING: 'PENDING', APPROVED: 'APPROVED', SUSPENDED: 'SUSPENDED' });

// Every USER (Regular and Creator).
const USER_BASE = Object.freeze([
  'platform:project:view:own',
  'platform:project:create:own',
  'platform:project:edit:own',
  'platform:project:delete:own',
  'ui:product:view',
  'ui:product:purchase',
  'ui:product:access:licensed',
  'template:listing:view',
  'template:listing:purchase',
  'template:instance:access:licensed',
  'template:instance:edit:own',
  // Regular users may create templates for their own use, but never publish or sell them.
  'template:listing:create',
  'template:listing:edit:own',
  'template:listing:delete:own',
  'slide:editor:access:licensed',
  'slide:project:create:own',
  'slide:project:edit:own',
  'slide:project:delete:own',
  'slide:subscription:purchase',
  'three_d:editor:access:licensed',
  'three_d:project:create:own',
  'three_d:project:edit:own',
  'three_d:project:delete:own',
  'three_d:subscription:purchase',
  'payment:order:view:own',
  'payment:order:create:own',
  'payment:order:delete:own',
  'template:creator_application:create:own',
]);

// Added on top of USER_BASE for accountType=CREATOR + creatorStatus=APPROVED.
const CREATOR_EXTRA = Object.freeze([
  'template:listing:publish:own',
  'template:listing:sell:own',
  'payment:sale:view:own',
  'payment:wallet:view:own',
  'payment:payout:create:own',
]);

// Admin: platform owner. No template:listing:create, no purchase of own products (UI, Slide/3D subscription).
const ADMIN = Object.freeze([
  'platform:project:view:own',
  'platform:project:create:own',
  'platform:project:edit:own',
  'platform:project:delete:own',
  'platform:content:manage:any',
  'platform:feature:configure',
  'platform:user:manage:any',
  'ui:product:view',
  'ui:product:access:licensed',
  'ui:product:create:any',
  'ui:product:edit:any',
  'ui:product:delete:any',
  'ui:product:publish:any',
  'ui:product:sell:any',
  'template:listing:view',
  'template:listing:purchase',
  'template:instance:access:licensed',
  'template:instance:edit:own',
  'template:listing:edit:system',
  'template:listing:publish:system',
  'template:listing:sell:system',
  'template:listing:takedown:any',
  'template:review:approve:any',
  'template:creator_application:approve:any',
  'slide:editor:access:any',
  'slide:project:create:own',
  'slide:project:edit:own',
  'slide:project:delete:own',
  'slide:plan:configure',
  'slide:product:sell:any',
  'three_d:editor:access:any',
  'three_d:project:create:own',
  'three_d:project:edit:own',
  'three_d:project:delete:own',
  'three_d:plan:configure',
  'three_d:product:sell:any',
  'payment:order:view:any',
  'payment:order:manage:any',
  'payment:order:approve:any',
  'payment:payout:approve:any',
  'payment:plan:configure',
  'payment:promo:configure',
  'payment:policy:configure',
]);

const ADMIN_SET = new Set(ADMIN);
const USER_SET = new Set(USER_BASE);
const CREATOR_SET = new Set([...USER_BASE, ...CREATOR_EXTRA]);

// Values written before the USER/ADMIN split. Kept readable until scripts/migrate-roles.js has run.
const LEGACY_CREATOR_ROLES = new Set(['creator', 'designer']);
const LEGACY_REGULAR_ROLES = new Set(['buyer']);

/**
 * Normalises any stored user shape to { role, accountType, creatorStatus }.
 * A 'user' without accountType is a pre-migration account: it keeps the creator rights it had before
 * (the old code treated every 'user' as a creator) until the migration assigns its real type.
 */
function resolveAccess(user) {
  const rawRole = String((user && user.role) || '').toLowerCase();
  if (rawRole === ROLES.ADMIN) {
    return { role: ROLES.ADMIN, accountType: null, creatorStatus: CREATOR_STATUSES.NONE };
  }

  let accountType = user && user.accountType;
  let creatorStatus = user && user.creatorStatus;

  if (!accountType) {
    if (LEGACY_REGULAR_ROLES.has(rawRole)) {
      accountType = ACCOUNT_TYPES.REGULAR;
      creatorStatus = CREATOR_STATUSES.NONE;
    } else {
      // 'user', 'creator', 'designer' without accountType = legacy creator.
      accountType = ACCOUNT_TYPES.CREATOR;
      creatorStatus = CREATOR_STATUSES.APPROVED;
    }
  }
  if (!creatorStatus) creatorStatus = CREATOR_STATUSES.NONE;

  return { role: ROLES.USER, accountType, creatorStatus };
}

function permissionSetFor(user) {
  const access = resolveAccess(user);
  if (access.role === ROLES.ADMIN) return ADMIN_SET;
  if (access.accountType === ACCOUNT_TYPES.CREATOR && access.creatorStatus === CREATOR_STATUSES.APPROVED) {
    return CREATOR_SET;
  }
  return USER_SET;
}

function permissionsFor(user) {
  return [...permissionSetFor(user)];
}

function hasPermission(user, permission) {
  return Boolean(user) && permissionSetFor(user).has(permission);
}

/** Error code explaining why a USER lacks a permission (used by requirePermission). */
function denialCode(user, permission) {
  const access = resolveAccess(user);
  if (access.role === ROLES.USER && CREATOR_EXTRA.includes(permission)) {
    if (access.accountType !== ACCOUNT_TYPES.CREATOR) return 'CREATOR_REQUIRED';
    return 'CREATOR_NOT_APPROVED';
  }
  return 'FORBIDDEN';
}

/** Fields the frontend needs to render permission-aware UI. */
function accessSummary(user) {
  const access = resolveAccess(user);
  return { ...access, permissions: permissionsFor(user) };
}

function isAdmin(user) {
  return resolveAccess(user).role === ROLES.ADMIN;
}

module.exports = {
  ROLES,
  ACCOUNT_TYPES,
  CREATOR_STATUSES,
  USER_BASE,
  CREATOR_EXTRA,
  ADMIN,
  resolveAccess,
  permissionsFor,
  hasPermission,
  denialCode,
  accessSummary,
  isAdmin,
};
