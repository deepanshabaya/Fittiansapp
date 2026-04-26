const express = require('express');
const { param } = require('express-validator');
const { authenticate } = require('../middleware/authMiddleware');
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', authenticate, listNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.post(
  '/:id/read',
  authenticate,
  [param('id').isInt()],
  markNotificationRead
);
router.post('/read-all', authenticate, markAllNotificationsRead);

module.exports = router;
