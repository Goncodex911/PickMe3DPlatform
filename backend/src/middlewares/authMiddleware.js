const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if user is banned
    if (req.user.status === 'banned') {
      return res.status(403).json({
        success: false,
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
 * Grant access to specific roles
 * @param  {...string} roles Allowed roles (e.g. 'admin')
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Quyền truy cập '${req.user.role}' không được phép truy cập tài nguyên này`,
      });
    }

    next();
  };
};
