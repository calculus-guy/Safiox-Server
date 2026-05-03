const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();

/**
 * After sending, check tickets and remove any tokens that are no longer valid.
 * Expo returns a ticket per message. If status is 'error' and the error is
 * DeviceNotRegistered, we pull that token from the user's deviceTokens array.
 */
async function pruneInvalidTokens(messages, tickets) {
  const tokensToRemove = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === 'error') {
      const { details } = ticket;
      if (details && details.error === 'DeviceNotRegistered') {
        tokensToRemove.push(messages[i].to);
      }
    }
  }

  if (tokensToRemove.length > 0) {
    await User.updateMany(
      { deviceTokens: { $in: tokensToRemove } },
      { $pull: { deviceTokens: { $in: tokensToRemove } } }
    );
    console.log(`🧹 Removed ${tokensToRemove.length} invalid device token(s)`);
  }
}

class PushService {
  /**
   * Send push notification to a single user.
   */
  static async sendToUser(userId, { title, body, data = {} }) {
    try {
      const user = await User.findById(userId).select('deviceTokens settings');
      if (!user || !user.deviceTokens || user.deviceTokens.length === 0) return;

      // Respect user's push notification preference
      if (user.settings && user.settings.pushNotifications === false) return;

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

      const allTickets = [];
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          allTickets.push(...tickets);
        } catch (err) {
          console.error('Push chunk error:', err.message);
        }
      }

      await pruneInvalidTokens(messages, allTickets);
    } catch (err) {
      console.error('Push notification error:', err.message);
    }
  }

  /**
   * Send push notification to multiple users.
   */
  static async sendToMultiple(userIds, { title, body, data = {} }) {
    try {
      const users = await User.find({ _id: { $in: userIds } }).select('deviceTokens settings');

      const messages = [];
      for (const user of users) {
        // Respect user's push notification preference
        if (user.settings && user.settings.pushNotifications === false) continue;
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

      const allTickets = [];
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          allTickets.push(...tickets);
        } catch (err) {
          console.error('Push chunk error:', err.message);
        }
      }

      await pruneInvalidTokens(messages, allTickets);
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
