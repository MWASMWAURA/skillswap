const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Twilio client for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-app notification storage (in production, use database)
const inAppNotifications = new Map();

class NotificationService {
  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'SkillSwap <noreply@skillswap.com>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };

      const result = await emailTransporter.sendMail(mailOptions);
      console.log('Email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    if (!twilioClient) {
      console.warn('Twilio not configured, skipping SMS');
      return { success: false, error: 'SMS not configured' };
    }

    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      console.log('SMS sent:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create in-app notification
  async createInAppNotification(userId, notification) {
    const notificationData = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Store notification (in production, save to database)
    if (!inAppNotifications.has(userId)) {
      inAppNotifications.set(userId, []);
    }
    inAppNotifications.get(userId).unshift(notificationData);

    // Keep only last 100 notifications per user
    const userNotifications = inAppNotifications.get(userId);
    if (userNotifications.length > 100) {
      inAppNotifications.set(userId, userNotifications.slice(0, 100));
    }

    return notificationData;
  }

  // Get user's in-app notifications
  getInAppNotifications(userId, limit = 50) {
    const notifications = inAppNotifications.get(userId) || [];
    return notifications.slice(0, limit);
  }

  // Mark notification as read
  markAsRead(userId, notificationId) {
    const notifications = inAppNotifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      return true;
    }
    return false;
  }

  // Mark all notifications as read
  markAllAsRead(userId) {
    const notifications = inAppNotifications.get(userId) || [];
    notifications.forEach(n => n.isRead = true);
    return true;
  }

  // Send notification through multiple channels
  async sendMultiChannel(user, notification) {
    const results = {
      inApp: null,
      email: null,
      sms: null,
    };

    // Always create in-app notification
    results.inApp = await this.createInAppNotification(user.id, notification);

    // Send email if user has email and notification type allows it
    if (user.email && notification.sendEmail !== false) {
      results.email = await this.sendEmail(
        user.email,
        notification.title,
        this.generateEmailTemplate(notification)
      );
    }

    // Send SMS if user has phone and notification is urgent
    if (user.phone && notification.urgent) {
      results.sms = await this.sendSMS(
        user.phone,
        `${notification.title}: ${notification.message}`
      );
    }

    return results;
  }

  // Generate email HTML template
  generateEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SkillSwap</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p><a href="${notification.actionUrl}" class="button">${notification.actionText || 'View Details'}</a></p>` : ''}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SkillSwap. All rights reserved.</p>
            <p>You received this email because you have an account on SkillSwap.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Notification templates
  templates = {
    exchangeRequest: (fromUser, skill) => ({
      type: 'exchange_request',
      title: 'New Exchange Request',
      message: `${fromUser.name} wants to learn ${skill.title} from you!`,
      actionUrl: '/exchanges',
      actionText: 'View Request',
    }),

    exchangeAccepted: (byUser, skill) => ({
      type: 'exchange_accepted',
      title: 'Exchange Request Accepted',
      message: `${byUser.name} accepted your request to learn ${skill.title}!`,
      actionUrl: '/exchanges',
      actionText: 'Start Learning',
    }),

    newMessage: (fromUser, preview) => ({
      type: 'new_message',
      title: 'New Message',
      message: `${fromUser.name}: ${preview.substring(0, 50)}...`,
      actionUrl: '/messages',
      actionText: 'Reply',
    }),

    sessionReminder: (session) => ({
      type: 'session_reminder',
      title: 'Upcoming Session',
      message: `Your skill session "${session.title}" starts in 30 minutes!`,
      actionUrl: `/sessions/${session.id}`,
      actionText: 'Join Session',
      urgent: true,
    }),

    paymentReceived: (amount, currency) => ({
      type: 'payment_received',
      title: 'Payment Received',
      message: `You received a payment of ${currency} ${amount}`,
      actionUrl: '/payments',
      actionText: 'View Details',
    }),
  };
}

module.exports = new NotificationService();
