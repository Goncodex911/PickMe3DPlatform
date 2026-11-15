/**
 * Migrates stored data to the Role & Permission Matrix model.
 *
 *   node scripts/migrate-roles.js                 dry run: prints the plan, writes nothing
 *   node scripts/migrate-roles.js --apply         writes the changes
 *   node scripts/migrate-roles.js --all-creators  every existing 'user' becomes an approved Creator
 *                                                 (default: only users who already sold / own templates)
 *
 * Users
 *   - role: legacy 'creator' | 'designer' | 'buyer' -> 'user'; only 'user' and 'admin' remain.
 *   - 'user' without accountType -> CREATOR + APPROVED when creator-like (owns a non-system template, has a payout,
 *     or has a positive wallet / creator balance, or had role creator/designer), otherwise REGULAR + NONE.
 *   - admin: accountType / creatorStatus removed. Missing status -> 'active'.
 * Templates
 *   - authored by the admin -> isSystem true (system catalogue, Admin-owned).
 *   - sellerType = isSystem ? ADMIN : CREATOR.
 *   - missing reviewStatus -> APPROVED when public, DRAFT when private (no listing disappears).
 * Entitlements
 *   - every PAID TEMPLATE_PURCHASE order -> Entitlement (source PURCHASE).
 *   - legacy MarketplacePurchase rows that point at a real Template -> Entitlement (source GRANT), listed in the report.
 *
 * Idempotent: running it twice changes nothing the second time. Prints ids only, no personal data.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const ALL_CREATORS = process.argv.includes('--all-creators');

function idStr(v) {
  return v ? String(v) : '';
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const templates = db.collection('templates');
  const payouts = db.collection('payouts');
  const orders = db.collection('orders');
  const purchases = db.collection('marketplacepurchases');
  const entitlements = db.collection('entitlements');

  console.log(`Database: ${db.databaseName} | mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${ALL_CREATORS ? ' | --all-creators' : ''}\n`);

  // ---------- creator-like signals ----------
  const adminIds = new Set((await users.find({ role: 'admin' }, { projection: { _id: 1 } }).toArray()).map((u) => idStr(u._id)));
  const templateAuthors = new Set(
    (await templates.distinct('author', { isSystem: { $ne: true }, author: { $ne: null } })).map(idStr)
  );
  const payoutUsers = new Set((await payouts.distinct('creatorId')).map(idStr));
  const sellers = new Set((await orders.distinct('sellerId', { status: 'PAID', sellerId: { $ne: null } })).map(idStr));

  // ---------- users ----------
  const userOps = [];
  const userPlan = { toCreator: [], toRegular: [], roleRenamed: [], adminCleaned: [], statusFilled: [] };
  for (const u of await users.find({}).toArray()) {
    const id = idStr(u._id);
    const set = {};
    const unset = {};

    if (u.role === 'admin') {
      if (u.accountType !== undefined) unset.accountType = '';
      if (u.creatorStatus !== undefined) unset.creatorStatus = '';
      if (Object.keys(unset).length) userPlan.adminCleaned.push(id);
    } else {
      const legacyRole = u.role;
      if (legacyRole !== 'user') {
        set.role = 'user';
        userPlan.roleRenamed.push(`${id} (${legacyRole} -> user)`);
      }
      if (!u.accountType) {
        const creatorLike =
          ALL_CREATORS ||
          legacyRole === 'creator' ||
          legacyRole === 'designer' ||
          templateAuthors.has(id) ||
          payoutUsers.has(id) ||
          sellers.has(id) ||
          Number(u.walletBalance || 0) > 0 ||
          Number(u.creatorBalance || 0) > 0 ||
          Number(u.balance || 0) > 0;
        if (creatorLike && legacyRole !== 'buyer') {
          set.accountType = 'CREATOR';
          set.creatorStatus = 'APPROVED';
          userPlan.toCreator.push(id);
        } else {
          set.accountType = 'REGULAR';
          set.creatorStatus = 'NONE';
          userPlan.toRegular.push(id);
        }
      }
    }
    if (!u.status) {
      set.status = 'active';
      userPlan.statusFilled.push(id);
    }

    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) userOps.push({ updateOne: { filter: { _id: u._id }, update } });
  }

  // ---------- templates ----------
  const templateOps = [];
  const templatePlan = { toSystem: [], sellerTypeFixed: [], reviewFilled: [] };
  for (const t of await templates.find({}).toArray()) {
    const id = idStr(t._id);
    const set = {};
    let isSystem = Boolean(t.isSystem);
    if (!isSystem && t.author && adminIds.has(idStr(t.author))) {
      isSystem = true;
      set.isSystem = true;
      templatePlan.toSystem.push(id);
    }
    const sellerType = isSystem ? 'ADMIN' : 'CREATOR';
    if (t.sellerType !== sellerType) {
      set.sellerType = sellerType;
      templatePlan.sellerTypeFixed.push(`${id} (${t.sellerType || 'none'} -> ${sellerType})`);
    }
    if (!t.reviewStatus) {
      set.reviewStatus = t.isPublic ? 'APPROVED' : 'DRAFT';
      templatePlan.reviewFilled.push(`${id} -> ${set.reviewStatus}`);
    }
    if (Object.keys(set).length) templateOps.push({ updateOne: { filter: { _id: t._id }, update: { $set: set } } });
  }

  // ---------- entitlements ----------
  const entOps = [];
  const entPlan = { fromOrders: [], fromLegacyPurchases: [] };
  const templateIds = new Set((await templates.distinct('_id')).map(idStr));
  const now = new Date();

  for (const o of await orders.find({ orderType: 'TEMPLATE_PURCHASE', status: 'PAID', templateId: { $ne: null } }).toArray()) {
    if (!mongoose.isValidObjectId(String(o.userId))) continue;
    const key = { userId: new mongoose.Types.ObjectId(String(o.userId)), productType: 'TEMPLATE', productId: idStr(o.templateId) };
    entOps.push({
      updateOne: {
        filter: key,
        update: { $setOnInsert: { ...key, source: 'PURCHASE', orderCode: o.orderCode, expiresAt: null, revokedAt: null, createdAt: now, updatedAt: now } },
        upsert: true,
      },
    });
    entPlan.fromOrders.push(`order ${o.orderCode} -> user ${key.userId} / template ${key.productId}`);
  }

  for (const p of await purchases.find({}).toArray()) {
    const tid = String(p.templateId || '').trim();
    if (!templateIds.has(tid) || !p.user) continue;
    const key = { userId: p.user, productType: 'TEMPLATE', productId: tid };
    entOps.push({
      updateOne: {
        filter: key,
        update: { $setOnInsert: { ...key, source: 'GRANT', orderCode: null, expiresAt: null, revokedAt: null, createdAt: now, updatedAt: now } },
        upsert: true,
      },
    });
    entPlan.fromLegacyPurchases.push(`user ${idStr(p.user)} / template ${tid}`);
  }

  // ---------- report ----------
  const show = (label, list) => {
    console.log(`${label}: ${list.length}`);
    list.forEach((x) => console.log(`   - ${x}`));
  };
  console.log('USERS');
  show('  -> CREATOR + APPROVED', userPlan.toCreator);
  show('  -> REGULAR + NONE', userPlan.toRegular);
  show('  role renamed', userPlan.roleRenamed);
  show('  admin accountType removed', userPlan.adminCleaned);
  show('  status set to active', userPlan.statusFilled);
  console.log('\nTEMPLATES');
  show('  marked as system (author is admin)', templatePlan.toSystem);
  show('  sellerType corrected', templatePlan.sellerTypeFixed);
  show('  reviewStatus filled', templatePlan.reviewFilled);
  console.log('\nENTITLEMENTS (upsert, existing rows untouched)');
  show('  from PAID template orders', entPlan.fromOrders);
  show('  from legacy MarketplacePurchase rows (GRANT)', entPlan.fromLegacyPurchases);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
  } else {
    if (userOps.length) await users.bulkWrite(userOps, { ordered: false });
    if (templateOps.length) await templates.bulkWrite(templateOps, { ordered: false });
    if (entOps.length) {
      await entitlements.createIndex({ userId: 1, productType: 1, productId: 1 }, { unique: true });
      await entitlements.bulkWrite(entOps, { ordered: false });
    }
    console.log(`\nApplied: ${userOps.length} user, ${templateOps.length} template, ${entOps.length} entitlement operations.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Migration failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
