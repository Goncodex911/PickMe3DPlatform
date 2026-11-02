const AuditLog = require('../models/AuditLog');

/**
 * Record an administrative action in the audit log
 * @param {Object} req Express request object containing authenticated admin user
 * @param {Object} options Audit log properties
 */
exports.logAdminAction = async (req, options) => {
  try {
    if (!req.user) return null;

    const {
      action,
      targetType = 'system',
      targetId = '',
      targetLabel = '',
      details = {},
      status = 'success',
    } = options;

    // Sanitize sensitive fields from details
    const sanitizedDetails = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'jwt', 'authorization', 'credential'];
    for (const key of Object.keys(sanitizedDetails)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitizedDetails[key] = '[REDACTED]';
      }
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

    const entry = await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name || 'Admin',
      actorEmail: req.user.email || '',
      action,
      targetType,
      targetId: String(targetId),
      targetLabel: String(targetLabel),
      details: sanitizedDetails,
      ipAddress: String(ipAddress),
      status,
    });

    return entry;
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
    return null;
  }
};
