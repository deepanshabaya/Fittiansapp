const { validationResult } = require('express-validator');
const notificationRepo = require('../repositories/notificationRepository');

// GET /api/notifications  — latest first, optionally filter unread
const listNotifications = async (req, res, next) => {
  try {
    const recipientUserId = req.user?.id;
    if (!recipientUserId) return res.status(401).json({ message: 'Unauthorized' });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const onlyUnread = req.query.unread === 'true';

    const [notifications, unreadCount] = await Promise.all([
      notificationRepo.listForRecipient({ recipientUserId, limit, onlyUnread }),
      notificationRepo.countUnread(recipientUserId),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const recipientUserId = req.user?.id;
    if (!recipientUserId) return res.status(401).json({ message: 'Unauthorized' });
    const unreadCount = await notificationRepo.countUnread(recipientUserId);
    return res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
};

// POST /api/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const recipientUserId = req.user?.id;
    const notificationId = parseInt(req.params.id, 10);

    const updated = await notificationRepo.markRead({ recipientUserId, notificationId });
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found or already read' });
    }
    return res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/notifications/read-all
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const recipientUserId = req.user?.id;
    const updatedCount = await notificationRepo.markAllRead(recipientUserId);
    return res.json({ updatedCount });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
