/**
 * Ownership and Entitlement checks (layers 3 and 4 of the authorization order).
 * Nothing here reads the caller's role except BR-09: Admin owns every ADMIN product.
 */
const mongoose = require('mongoose');
const Entitlement = require('../models/Entitlement');
const Order = require('../models/Order');
const { isAdmin } = require('../config/permissions');

function idOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
}

/** 'ADMIN' for the system catalogue, otherwise 'CREATOR'. */
function templateOwnerType(template) {
  if (!template) return 'CREATOR';
  if (template.isSystem || template.sellerType === 'ADMIN') return 'ADMIN';
  return 'CREATOR';
}

function isTemplateOwner(user, template) {
  if (!user || !template) return false;
  if (templateOwnerType(template) === 'ADMIN') return isAdmin(user);
  return Boolean(template.author) && idOf(template.author) === idOf(user);
}

function isFreeTemplate(template) {
  return !template || Number(template.price || 0) <= 0;
}

async function hasTemplateEntitlement(user, template) {
  if (!user || !template || mongoose.connection.readyState !== 1) return false;
  const userId = idOf(user);
  if (!mongoose.isValidObjectId(userId)) return false;
  const productId = idOf(template);
  const now = new Date();
  // Only server-issued Entitlements count. MarketplacePurchase rows are client-claimed (UI Marketplace) and
  // are converted by scripts/migrate-roles.js, never trusted for templates directly.
  const ent = await Entitlement.exists({
    userId,
    productType: 'TEMPLATE',
    productId,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });
  return Boolean(ent);
}

/** May the user open/use this template (Access, Edit instance)? */
async function canUseTemplate(user, template) {
  if (!template) return false;
  if (isTemplateOwner(user, template)) return true;
  if (isFreeTemplate(template)) return true;
  return hasTemplateEntitlement(user, template);
}

/** Does anybody (other than the owner) hold a paid right to this template? Used for soft delete (BR-15). */
async function templateHasBuyers(template) {
  if (!template || mongoose.connection.readyState !== 1) return false;
  const productId = idOf(template);
  const [ent, paidOrder] = await Promise.all([
    Entitlement.exists({ productType: 'TEMPLATE', productId, revokedAt: null }),
    Order.exists({ orderType: 'TEMPLATE_PURCHASE', templateId: template._id || productId, status: 'PAID' }),
  ]);
  return Boolean(ent || paidOrder);
}

/** Idempotent: grants the buyer of a PAID template order its Entitlement. */
async function grantTemplateEntitlement(order) {
  if (!order || order.orderType !== 'TEMPLATE_PURCHASE' || !order.templateId) return null;
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(String(order.userId))) return null;
  return Entitlement.findOneAndUpdate(
    { userId: order.userId, productType: 'TEMPLATE', productId: idOf(order.templateId) },
    {
      $set: { revokedAt: null },
      $setOnInsert: { source: 'PURCHASE', orderCode: order.orderCode, expiresAt: null },
    },
    { upsert: true, new: true }
  );
}

/**
 * Does the user own this UI Marketplace product? A paid Entitlement, or a MarketplacePurchase row (claims made
 * while the product was free stay valid after Admin sets a price).
 */
async function hasUiProduct(user, productId) {
  if (!user || mongoose.connection.readyState !== 1) return false;
  const userId = idOf(user);
  if (!mongoose.isValidObjectId(userId)) return false;
  const [ent, claim] = await Promise.all([
    Entitlement.exists({ userId, productType: 'UI_PRODUCT', productId: String(productId), revokedAt: null }),
    require('../models/MarketplacePurchase').exists({ user: userId, templateId: String(productId) }),
  ]);
  return Boolean(ent || claim);
}

/** Idempotent: a PAID UI order grants the Entitlement and the purchase row the UI Marketplace reads. */
async function grantUiEntitlement(order) {
  if (!order || order.orderType !== 'UI_PURCHASE' || !order.productId) return null;
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(String(order.userId))) return null;
  const MarketplacePurchase = require('../models/MarketplacePurchase');
  await MarketplacePurchase.updateOne(
    { user: order.userId, templateId: String(order.productId) },
    {
      $setOnInsert: {
        user: order.userId,
        templateId: String(order.productId),
        templateTitle: order.productTitle || '',
        category: '',
        price: Number(order.amount) || 0,
        transactionId: `order_${order.orderCode}`,
        purchasedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return Entitlement.findOneAndUpdate(
    { userId: order.userId, productType: 'UI_PRODUCT', productId: String(order.productId) },
    { $set: { revokedAt: null }, $setOnInsert: { source: 'PURCHASE', orderCode: order.orderCode, expiresAt: null } },
    { upsert: true, new: true }
  );
}

module.exports = {
  hasUiProduct,
  grantUiEntitlement,
  templateOwnerType,
  isTemplateOwner,
  isFreeTemplate,
  hasTemplateEntitlement,
  canUseTemplate,
  templateHasBuyers,
  grantTemplateEntitlement,
};
