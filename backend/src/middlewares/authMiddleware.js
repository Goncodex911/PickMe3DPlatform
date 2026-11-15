const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mockUsers = require('../data/mockUsers');

const { resolveAccess, hasPermission, denialCode } = require('../config/permissions');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
    const decoded = jwt.verify(token, secret);
    const mockUser = mockUsers.isEnabled() ? mockUsers.findById(decoded.id) : null;
    req.user = mockUser
      ? (await mockUsers.syncToDb(mockUser)) || mockUsers.requestUser(mockUser)
      : await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if user is banned
    if (req.user.status === 'banned') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_BANNED',
        isBanned: true,
        message: 'Tài khoản của bạn đã bị khóa: ' + (req.user.bannedReason || 'Vi phạm điều khoản cộng đồng'),
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

/**
 * Attach req.user when a valid token is sent; otherwise continue anonymously (public pages).
 * Banned or unknown users are treated as anonymous here; write routes must use `protect`.
 */
exports.optionalProtect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const secret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
    const decoded = jwt.verify(header.slice(7), secret);
    const mockUser = mockUsers.isEnabled() ? mockUsers.findById(decoded.id) : null;
    const user = mockUser
      ? (await mockUsers.syncToDb(mockUser)) || mockUsers.requestUser(mockUser)
      : await User.findById(decoded.id);
    if (user && user.status !== 'banned') req.user = user;
  } catch {
    // invalid token: anonymous
  }
  return next();
};

/**
 * Grant access to specific roles
 * @param  {...string} roles Allowed roles (e.g. 'admin')
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(resolveAccess(req.user).role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Forbidden: Bạn không có quyền truy cập tài nguyên này',
      });
    }

    next();
  };
};

/**
 * Require every listed permission (see config/permissions.js). Ownership / Entitlement checks stay in the
 * controller or services/accessService.js, after the record is loaded.
 * @param  {...string} permissions e.g. 'template:listing:publish:own'
 */
exports.requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const missing = permissions.find((permission) => !hasPermission(req.user, permission));
    if (missing) {
      const code = denialCode(req.user, missing);
      const messages = {
        CREATOR_REQUIRED: 'Chức năng này chỉ dành cho tài khoản Creator',
        CREATOR_NOT_APPROVED: 'Tài khoản Creator của bạn chưa được duyệt hoặc đang bị tạm khóa',
        FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
      };
      return res.status(403).json({ success: false, code, permission: missing, message: messages[code] });
    }

    next();
  };
};
