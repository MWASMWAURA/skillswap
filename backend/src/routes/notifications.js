const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../utils/auth');

// All routes require authentication
router.use(authenticateToken);

// Push subscription management
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);
router.get('/subscription', notificationController.getSubscription);

// Notification management
router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Notification preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

// Send notification (admin or system use)
router.post('/send', notificationController.sendNotification);
router.post('/send-bulk', notificationController.sendBulkNotification);

// Test notification
router.post('/test', notificationController.sendTestNotification);

module.exports = router;
