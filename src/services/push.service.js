const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();

class PushService {
  /**
   * Send push notification to a single user.
   */
  static async sendToUser(userId, { title, body, data = {} }) {
    try {
      const user = await User.findById(userId).select('deviceTokens');
      if (!user || !user.deviceTokens || user.deviceTokens.length === 0) return;

      const messages = user.deviceTokens
        .filter((token) => Expo.isExpoPushToken(token))
        .map((token) => ({
          to: token,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
        }));

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          console.error('Push notification chunk error:', err.message);
        }
      }
    } catch (err) {
      console.error('Push notification error:', err.message);
    }
  }

  /**
   * Send push notification to multiple users.
   */
  static async sendToMultiple(userIds, { title, body, data = {} }) {
    try {
      const users = await User.find({ _id: { $in: userIds } }).select('deviceTokens');

      const messages = [];
      for (const user of users) {
        if (!user.deviceTokens) continue;
        for (const token of user.deviceTokens) {
          if (Expo.isExpoPushToken(token)) {
            messages.push({
              to: token,
              title,
              body,
              data,
              sound: 'default',
              priority: 'high',
            });
          }
        }
      }

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          console.error('Push notification chunk error:', err.message);
        }
      }
    } catch (err) {
      console.error('Batch push notification error:', err.message);
    }
  }

  /**
   * Send a critical SOS alert push notification.
   */
  static async sendSOSAlert(userIds, sosData) {
    await PushService.sendToMultiple(userIds, {
      title: '🚨 EMERGENCY SOS ALERT',
      body: `${sosData.userName} needs help! Tap to track their location.`,
      data: {
        type: 'sos_alert',
        sosAlertId: sosData.alertId,
        trackingToken: sosData.trackingToken,
      },
    });
  }

  /**
   * Send SOS resolved notification.
   */
  static async sendSOSResolved(userIds, sosData) {
    await PushService.sendToMultiple(userIds, {
      title: '✅ SOS Alert Resolved',
      body: `${sosData.userName} is now safe.`,
      data: {
        type: 'sos_resolved',
        sosAlertId: sosData.alertId,
      },
    });
  }
}

module.exports = PushService;
