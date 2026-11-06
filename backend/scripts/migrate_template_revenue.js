/**
 * Migration Script: Migrate Template Ownership & Order Revenue Classifications
 * Enforces Rules 2.1 & 3.2:
 * 1. Categorize all templates by actual owner/seller (ADMIN vs CREATOR).
 * 2. Set default commercial properties (price: 0, isPaid: false, marketplaceSource: 'TEMPLATE_SECTION').
 * 3. Backfill all existing subscription orders with orderType: 'SUBSCRIPTION', sellerType: 'ADMIN',
 *    transactionSource: 'SUBSCRIPTION', creatorEarnings: 0, adminRevenue: amount.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('../src/models/Template');
const Order = require('../src/models/Order');
const User = require('../src/models/User');

const SOLE_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'phantrongquy23032005@gmail.com').toLowerCase().trim();

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not defined in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // Find Admin user ID
  const adminUser = await User.findOne({ email: SOLE_ADMIN_EMAIL });
  const adminUserId = adminUser ? adminUser._id.toString() : null;
  console.log(`Sole Admin Email: ${SOLE_ADMIN_EMAIL}, Admin ID: ${adminUserId || 'Not found'}`);

  // 1. Migrate Templates
  const templates = await Template.find();
  console.log(`Found ${templates.length} templates to verify/migrate.`);

  let updatedTemplatesCount = 0;
  for (const t of templates) {
    let changed = false;

    // Check author to determine sellerType
    let isOwnerAdmin = false;
    if (t.isSystem) {
      isOwnerAdmin = true;
    } else if (t.author) {
      if (adminUserId && t.author.toString() === adminUserId) {
        isOwnerAdmin = true;
      } else {
        const authorUser = await User.findById(t.author);
        if (authorUser && (authorUser.role === 'admin' || authorUser.email?.toLowerCase().trim() === SOLE_ADMIN_EMAIL)) {
          isOwnerAdmin = true;
        }
      }
    } else {
      // Default system/orphan templates to ADMIN
      isOwnerAdmin = true;
    }

    const expectedSellerType = isOwnerAdmin ? 'ADMIN' : 'CREATOR';
    if (t.sellerType !== expectedSellerType) {
      t.sellerType = expectedSellerType;
      changed = true;
    }

    if (!t.marketplaceSource) {
      t.marketplaceSource = 'TEMPLATE_SECTION';
      changed = true;
    }

    if (t.price === undefined || t.price === null) {
      t.price = 0;
      t.isPaid = false;
      changed = true;
    } else {
      const isPaid = Number(t.price) > 0;
      if (t.isPaid !== isPaid) {
        t.isPaid = isPaid;
        changed = true;
      }
    }

    if (!t.currency) {
      t.currency = 'VND';
      changed = true;
    }

    if (changed) {
      await t.save();
      updatedTemplatesCount++;
    }
  }
  console.log(`Templates migration completed. Updated ${updatedTemplatesCount} templates.`);

  // 2. Migrate Orders
  const orders = await Order.find();
  console.log(`Found ${orders.length} orders to verify/migrate.`);

  let updatedOrdersCount = 0;
  for (const o of orders) {
    let changed = false;

    if (!o.orderType) {
      o.orderType = 'SUBSCRIPTION';
      changed = true;
    }

    if (!o.transactionSource) {
      o.transactionSource = o.orderType === 'TEMPLATE_PURCHASE' ? 'TEMPLATE_SECTION' : 'SUBSCRIPTION';
      changed = true;
    }

    if (!o.sellerType) {
      o.sellerType = 'ADMIN';
      changed = true;
    }

    const finalAmount = Number(o.amount || 0);
    if (o.grossAmount === undefined || o.grossAmount === null) {
      o.grossAmount = finalAmount;
      changed = true;
    }

    if (o.orderType === 'SUBSCRIPTION') {
      if (o.creatorEarnings !== 0) {
        o.creatorEarnings = 0;
        changed = true;
      }
      if (o.adminRevenue !== finalAmount) {
        o.adminRevenue = finalAmount;
        changed = true;
      }
    } else if (o.orderType === 'TEMPLATE_PURCHASE') {
      if (o.sellerType === 'ADMIN' || o.transactionSource === 'ADMIN_MARKETPLACE') {
        if (o.creatorEarnings !== 0) {
          o.creatorEarnings = 0;
          changed = true;
        }
        if (o.adminRevenue !== finalAmount) {
          o.adminRevenue = finalAmount;
          changed = true;
        }
      } else if (o.sellerType === 'CREATOR' && o.transactionSource === 'TEMPLATE_SECTION') {
        const expectedCreator = Math.round(finalAmount * 0.7);
        const expectedAdmin = finalAmount - expectedCreator;
        if (o.creatorEarnings !== expectedCreator) {
          o.creatorEarnings = expectedCreator;
          changed = true;
        }
        if (o.adminRevenue !== expectedAdmin) {
          o.adminRevenue = expectedAdmin;
          changed = true;
        }
      }
    }

    if (changed) {
      await o.save();
      updatedOrdersCount++;
    }
  }
  console.log(`Orders migration completed. Updated ${updatedOrdersCount} orders.`);

  await mongoose.disconnect();
  console.log('Migration finished successfully.');
}

if (require.main === module) {
  runMigration().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = runMigration;

