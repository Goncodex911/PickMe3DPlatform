const Notification = require('../models/Notification');

/**
 * Creates a notification for the template owner when someone interacts
 * with their design. Skips creation if actor === recipient (self-action).
 *
 * @param {Object} params
 * @param {string} params.recipientId  - User who receives the notification
 * @param {string} params.actorId      - User who performed the action
 * @param {string} params.type         - One of: 'like', 'fork', 'review', 'comment', 'reply'
 * @param {string} params.templateId   - The template being interacted with
 * @param {string} params.message      - Human-readable notification text
 */
exports.createNotification = async ({ recipientId, actorId, type, templateId, message }) => {
  // Do not notify yourself
  if (!recipientId || !actorId || recipientId.toString() === actorId.toString()) {
    return null;
  }

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      actor: actorId,
      type,
      template: templateId || null,
      message: message || '',
    });
    return notification;
  } catch (error) {
    // Notification failures should never break the main flow
    console.warn('Failed to create notification:', error.message);
    return null;
  }
};
