const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@skillswap.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Store or update subscription
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: endpoint
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId,
        updatedAt: new Date()
      },
      create: {
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId
      }
    });

    res.json({ 
      success: true, 
      message: 'Subscription saved successfully',
      subscriptionId: subscription.id 
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};

// Unsubscribe from push notifications
exports.unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId }
      });
    } else {
      // Remove all subscriptions for user
      await prisma.pushSubscription.deleteMany({
        where: { userId }
      });
    }

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};

// Get user's subscription status
exports.getSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        createdAt: true
      }
    });

    res.json({
      isSubscribed: subscriptions.length > 0,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + '...',
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

// Get notifications for user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId };
    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Get unread notifications
exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({ error: 'Failed to get unread notifications' });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: { userId, read: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id: parseInt(id), userId },
      data: { read: true, readAt: new Date() }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await prisma.notification.deleteMany({
      where: { id: parseInt(id), userId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get notification preferences
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Return default preferences
      preferences = {
        pushEnabled: true,
        emailEnabled: true,
        messageNotifications: true,
        exchangeNotifications: true,
        sessionReminders: true,
        marketingNotifications: false,
        reminderMinutes: 15,
        quietHoursStart: null,
        quietHoursEnd: null
      };
    }

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      pushEnabled,
      emailEnabled,
      messageNotifications,
      exchangeNotifications,
      sessionReminders,
      marketingNotifications,
      reminderMinutes,
      quietHoursStart,
      quietHoursEnd
    } = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        pushEnabled,
        emailEnabled,
        messageNotifications,
        exchangeNotifications,
        sessionReminders,
        marketingNotifications,
        reminderMinutes,
        quietHoursStart,
        quietHoursEnd,
        updatedAt: new Date()
      },
      create: {
        userId,
        pushEnabled: pushEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        messageNotifications: messageNotifications ?? true,
        exchangeNotifications: exchangeNotifications ?? true,
        sessionReminders: sessionReminders ?? true,
        marketingNotifications: marketingNotifications ?? false,
        reminderMinutes: reminderMinutes ?? 15,
        quietHoursStart,
        quietHoursEnd
      }
    });

    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

// Send notification to a user
exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, body, type, data, requireInteraction } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const result = await sendPushNotification(userId, {
      title,
      body,
      type: type || 'general',
      data: data || {},
      requireInteraction: requireInteraction || false
    });

    res.json(result);
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Send bulk notifications
exports.sendBulkNotification = async (req, res) => {
  try {
    const { userIds, title, body, type, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ error: 'userIds array, title, and body are required' });
    }

    const results = await Promise.allSettled(
      userIds.map(userId => sendPushNotification(userId, {
        title,
        body,
        type: type || 'general',
        data: data || {}
      }))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      total: userIds.length,
      successful,
      failed
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
};

// Send test notification
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await sendPushNotification(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from SkillSwap!',
      type: 'test',
      data: { test: true },
      requireInteraction: false
    });

    res.json(result);
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

// Helper function to send push notification
async function sendPushNotification(userId, notification) {
  try {
    // Check user preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (preferences && !preferences.pushEnabled) {
      return { success: false, reason: 'Push notifications disabled' };
    }

    // Check quiet hours
    if (preferences?.quietHoursStart && preferences?.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(preferences.quietHoursStart.split(':')[0]);
      const endHour = parseInt(preferences.quietHoursEnd.split(':')[0]);

      if (startHour <= currentHour && currentHour < endHour) {
        return { success: false, reason: 'Quiet hours active' };
      }
    }

    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      return { success: false, reason: 'No push subscriptions found' };
    }

    // Store notification in database
    const storedNotification = await prisma.notification.create({
      data: {
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: JSON.stringify(notification.data),
        read: false
      }
    });

    // Send to all subscriptions
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        ...notification.data,
        notificationId: storedNotification.id,
        type: notification.type
      },
      tag: notification.type,
      requireInteraction: notification.requireInteraction || false,
      vibrate: [200, 100, 200]
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }, payload);
          return { success: true };
        } catch (error) {
          // Remove invalid subscriptions
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return {
      success: successful > 0,
      sent: successful,
      failed: results.length - successful,
      notificationId: storedNotification.id
    };
  } catch (error) {
    console.error('Send push notification error:', error);
    throw error;
  }
}

// Export helper for use in other modules
exports.sendPushNotification = sendPushNotification;

// Notification types for different events
exports.notifyNewMessage = async (userId, fromUser, message, exchangeId) => {
  return sendPushNotification(userId, {
    title: 'New Message',
    body: `${fromUser}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
    type: 'message',
    data: { exchangeId, fromUser },
    requireInteraction: false
  });
};

exports.notifyExchangeRequest = async (userId, fromUser, skillTitle, exchangeId) => {
  return sendPushNotification(userId, {
    title: 'New Exchange Request',
    body: `${fromUser} wants to learn ${skillTitle}`,
    type: 'exchange_request',
    data: { exchangeId, fromUser, skillTitle },
    requireInteraction: true
  });
};

exports.notifyExchangeAccepted = async (userId, partnerName, skillTitle, exchangeId) => {
  return sendPushNotification(userId, {
    title: 'Exchange Accepted!',
    body: `${partnerName} accepted your request for ${skillTitle}`,
    type: 'exchange_accepted',
    data: { exchangeId, partnerName, skillTitle },
    requireInteraction: false
  });
};

exports.notifySessionReminder = async (userId, skillTitle, timeUntil, exchangeId) => {
  return sendPushNotification(userId, {
    title: 'Upcoming Session',
    body: `Your ${skillTitle} session starts ${timeUntil}`,
    type: 'session_reminder',
    data: { exchangeId, skillTitle, timeUntil },
    requireInteraction: true
  });
};

exports.notifyIncomingCall = async (userId, callerName, exchangeId) => {
  return sendPushNotification(userId, {
    title: 'Incoming Call',
    body: `${callerName} is calling you`,
    type: 'call',
    data: { exchangeId, callerName },
    requireInteraction: true
  });
};
