/**
 * Template price history, stored in the existing AuditLog collection (action TEMPLATE_PRICE_CHANGE,
 * details { previousPrice, newPrice, note }). No new collection or field: every price change is one log row,
 * and the versions shown to the owner are those rows in order.
 */
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const ACTION = 'TEMPLATE_PRICE_CHANGE';

/** Records a price change made by `actor` (the request user). Never throws. */
async function logPriceChange(req, template, previousPrice, newPrice, note = '') {
  try {
    if (!req || !req.user || Number(previousPrice) === Number(newPrice)) return null;
    return await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name || 'User',
      actorEmail: req.user.email || '',
      action: ACTION,
      targetType: 'template',
      targetId: String(template._id),
      targetLabel: template.title || '',
      details: {
        previousPrice: Number(previousPrice) || 0,
        newPrice: Number(newPrice) || 0,
        note: String(note || '').trim().slice(0, 200),
      },
      ipAddress: String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      status: 'success',
    });
  } catch (error) {
    console.error('Price history log failed:', error.message);
    return null;
  }
}

/**
 * Versions of a template's price, oldest first: v1 is the first known price.
 * A template priced before history existed gets an inferred v1 from its creation date.
 */
async function getPriceHistory(template) {
  if (mongoose.connection.readyState !== 1) return [];
  const rows = await AuditLog.find({ action: ACTION, targetType: 'template', targetId: String(template._id) })
    .sort({ createdAt: 1 })
    .select('actorName details createdAt')
    .lean();

  const versions = [];
  const firstPrevious = rows.length ? Number(rows[0].details?.previousPrice) || 0 : Number(template.price) || 0;
  if (firstPrevious > 0) {
    versions.push({ price: firstPrevious, previousPrice: null, at: template.createdAt || null, by: template.authorName || '', note: 'Giá ban đầu', inferred: true });
  }
  for (const r of rows) {
    versions.push({
      price: Number(r.details?.newPrice) || 0,
      previousPrice: Number(r.details?.previousPrice) || 0,
      at: r.createdAt,
      by: r.actorName || '',
      note: r.details?.note || '',
      inferred: false,
    });
  }
  return versions.map((v, i) => ({ version: i + 1, ...v, current: i === versions.length - 1 }));
}

/**
 * Public "price drop" badge data for a set of templates: { [templateId]: { previousPrice, note, percent, at } }.
 * Only the latest change counts, and only when it lowered the price to the template's current price.
 * A price increase is never announced.
 */
async function getPriceDrops(templates) {
  if (mongoose.connection.readyState !== 1 || !templates.length) return {};
  const byId = new Map(templates.map((t) => [String(t._id), Number(t.price || 0)]));
  const rows = await AuditLog.aggregate([
    { $match: { action: ACTION, targetType: 'template', targetId: { $in: [...byId.keys()] } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$targetId', details: { $first: '$details' }, at: { $first: '$createdAt' } } },
  ]);
  const drops = {};
  for (const r of rows) {
    const previous = Number(r.details?.previousPrice) || 0;
    const next = Number(r.details?.newPrice) || 0;
    const current = byId.get(r._id);
    if (previous > 0 && next < previous && next === current) {
      drops[r._id] = {
        previousPrice: previous,
        note: String(r.details?.note || '').trim(),
        percent: Math.round(((previous - next) / previous) * 100),
        at: r.at,
      };
    }
  }
  return drops;
}

module.exports = { ACTION, logPriceChange, getPriceHistory, getPriceDrops };
