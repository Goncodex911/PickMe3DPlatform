const jwt = require('jsonwebtoken');
const billing = require('../services/billingStore');
const { getPlan } = require('../config/plans');

const RANK = { free: 0, pro: 1, studio: 2 };

function jwtSecret() {
  return process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
}

async function attachUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret());
    req.auth = decoded;
    req.user = await billing.getAccount(decoded);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
}

// Có token thì gắn người dùng, không có thì vẫn cho qua (trang xem công khai)
async function optionalUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, jwtSecret());
    req.auth = decoded;
    req.user = await billing.getAccount(decoded);
  } catch {
    req.user = null;
  }
  return next();
}

function requirePlan(minPlan) {
  return (req, res, next) => {
    const plan = req.user?.plan || 'free';
    if ((RANK[plan] || 0) >= (RANK[minPlan] || 0)) return next();
    return res.status(403).json({
      success: false,
      code: 'UPGRADE_REQUIRED',
      message: 'Upgrade your plan to use this feature',
      plan,
    });
  };
}

function checkQuota(kind) {
  return async (req, res, next) => {
    const plan = getPlan(req.user?.plan || 'free') || getPlan('free');
    const limit = plan.quotas[kind];
    if (limit == null) return next();
    let used = 0;
    if (kind === 'slides') used = await billing.countDecks(req.user.id);
    if (kind === 'ai') used = req.user.aiUsed || 0;
    if (used >= limit) {
      return res.status(403).json({
        success: false,
        code: 'QUOTA',
        message: 'You have reached your plan limit',
        limit,
        used,
      });
    }
    return next();
  };
}

module.exports = { attachUser, optionalUser, requirePlan, checkQuota };
