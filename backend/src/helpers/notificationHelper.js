const Notification = require('../models/Notification');
const User = require('../models/User');

const SOLE_ADMIN_EMAIL = 'phantrongquy23032005@gmail.com';

/**
 * Creates a notification for the template owner when someone interacts
 * with their design. Skips creation if actor === recipient (self-action).
 */
exports.createNotification = async ({ recipientId, actorId, type, templateId, message, link = '', metadata = {} }) => {
  // Do not notify yourself
  if (!recipientId || (actorId && recipientId.toString() === actorId.toString())) {
    return null;
  }

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      actor: actorId || null,
      type,
      template: templateId || null,
      message: message || '',
      link,
      metadata,
    });
    return notification;
  } catch (error) {
    console.warn('Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Creates a direct notification to a specific user (e.g. from Admin or System).
 */
exports.notifyUser = async ({ recipientId, actorId = null, type, message, link = '', metadata = {}, templateId = null }) => {
  if (!recipientId) return null;
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      actor: actorId || null,
      type,
      message: message || '',
      link,
      metadata,
      template: templateId || null,
    });
    return notification;
  } catch (error) {
    console.warn('Failed to notify user:', error.message);
    return null;
  }
};

/**
 * Creates notifications for all Admin accounts in the system.
 */
exports.notifyAdmins = async ({ actorId = null, type, message, link = '/admin', metadata = {} }) => {
  try {
    let admins = await User.find({ role: 'admin' }).select('_id email');
    if (!admins || admins.length === 0) {
      const soleAdmin = await User.findOne({ email: SOLE_ADMIN_EMAIL }).select('_id email');
      if (soleAdmin) admins = [soleAdmin];
    }

    if (!admins || admins.length === 0) return [];

    const notifications = admins
      .filter((admin) => !actorId || admin._id.toString() !== actorId.toString())
      .map((admin) => ({
        recipient: admin._id,
        actor: actorId || null,
        type,
        message: message || '',
        link: link || '/admin',
        metadata: metadata || {},
      }));

    if (notifications.length > 0) {
      return await Notification.insertMany(notifications);
    }
    return [];
  } catch (error) {
    console.warn('Failed to notify admins:', error.message);
    return [];
  }
};
