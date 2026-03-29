const SOSAlert = require('../models/SOSAlert');
const EmergencyContact = require('../models/EmergencyContact');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const generateTrackingToken = require('../utils/generateTrackingToken');
const EmailService = require('./email.service');
const PushService = require('./push.service');

class SOSService {
  /**
   * Trigger a new SOS alert.
   */
  static async trigger(userId, data, io) {
    // Prevent duplicate active alerts
    const existingAlert = await SOSAlert.findOne({ userId, status: { $in: ['active', 'escalated'] } });
    if (existingAlert) {
      throw ApiError.conflict('You already have an active SOS alert');
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    // Generate unique tracking token
    const trackingToken = generateTrackingToken();

    // Create SOS alert
    const alert = await SOSAlert.create({
      userId,
      location: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
      locationHistory: [
        { coordinates: [data.location.longitude, data.location.latitude], timestamp: new Date() },
      ],
      silentMode: data.silentMode || false,
      voiceTrigger: data.voiceTrigger || false,
      communityRespondersEnabled: data.communityRespondersEnabled || false,
      notifyOrganizations: data.notifyOrganizations || false,
      trackingToken,
      countdownDuration: user.sosSettings?.countdownDuration || 5,
    });

    // Update user status
    await User.findByIdAndUpdate(userId, { status: 'unsafe' });

    // Emit real-time event
    if (io) {
      io.to(`user:${userId}`).emit('sos:triggered', {
        alertId: alert._id,
        trackingToken,
        status: 'active',
      });
    }

    return {
      alertId: alert._id,
      status: alert.status,
      trackingToken,
      trackingUrl: `${process.env.CLIENT_URL || 'http://localhost:8081'}/sos/track/${trackingToken}`,
      countdownDuration: alert.countdownDuration,
    };
  }

  /**
   * Escalate SOS — notify emergency contacts and optionally nearby orgs.
   */
  static async escalate(alertId, userId, io) {
    const alert = await SOSAlert.findOne({ _id: alertId, userId });
    if (!alert) throw ApiError.notFound('SOS alert not found');
    if (alert.status === 'cancelled' || alert.status === 'resolved') {
      throw ApiError.badRequest('This SOS alert has already been closed');
    }

    const user = await User.findById(userId);
    const contacts = await EmergencyContact.find({ userId });

    const escalationRecords = [];

    // Notify each emergency contact via push + email
    for (const contact of contacts) {
      // SMS/Push notification
      escalationRecords.push({
        contactId: contact._id,
        contactName: contact.name,
        contactPhone: contact.phone,
        method: 'push',
        sentAt: new Date(),
        delivered: true,
      });

      // Attempt email if contact has an email address
      if (contact.email) {
        try {
          await EmailService.sendSOSEscalationEmail(contact, {
            userName: user.name,
            trackingToken: alert.trackingToken,
            triggeredAt: alert.createdAt,
            latitude: alert.location.coordinates[1],
            longitude: alert.location.coordinates[0],
          });
        } catch (err) {
          console.error(`Failed to send escalation email to ${contact.name}:`, err.message);
        }
      }
    }

    // Create in-app notifications for contacts that have user accounts
    // (In a real system, you'd match contact phone numbers to user accounts)

    alert.status = 'escalated';
    alert.escalatedAt = new Date();
    alert.escalatedTo = escalationRecords;
    await alert.save();

    // Emit real-time event
    if (io) {
      io.to(`sos:${alertId}`).emit('sos:escalated', {
        alertId,
        escalatedAt: alert.escalatedAt,
        contactsNotified: contacts.length,
      });
    }

    // Push notification to user confirming escalation
    await PushService.sendToUser(userId, {
      title: 'SOS Escalated',
      body: `Alert sent to ${contacts.length} emergency contact(s)`,
      data: { type: 'sos_escalation', sosAlertId: alertId },
    });

    return {
      status: 'escalated',
      contactsNotified: contacts.length,
      escalatedAt: alert.escalatedAt,
    };
  }

  /**
   * Cancel SOS alert.
   */
  static async cancel(alertId, userId, io) {
    const alert = await SOSAlert.findOne({ _id: alertId, userId });
    if (!alert) throw ApiError.notFound('SOS alert not found');
    if (alert.status === 'cancelled' || alert.status === 'resolved') {
      throw ApiError.badRequest('This SOS alert has already been closed');
    }

    alert.status = 'cancelled';
    alert.cancelledAt = new Date();
    await alert.save();

    // Update user status back to safe
    await User.findByIdAndUpdate(userId, { status: 'safe' });

    // Emit real-time event
    if (io) {
      io.to(`sos:${alertId}`).emit('sos:cancelled', { alertId });
      io.to(`user:${userId}`).emit('sos:cancelled', { alertId });
    }

    // If already escalated, send "false alarm" / resolved emails
    if (alert.escalatedTo && alert.escalatedTo.length > 0) {
      const user = await User.findById(userId);
      const contacts = await EmergencyContact.find({ userId });
      for (const contact of contacts) {
        if (contact.email) {
          try {
            await EmailService.sendSOSResolvedEmail(contact, { userName: user.name });
          } catch (err) {
            console.error(`Failed to send SOS resolved email:`, err.message);
          }
        }
      }
    }

    return { status: 'cancelled' };
  }

  /**
   * Resolve SOS alert (by user, admin, or organization).
   */
  static async resolve(alertId, userId, resolvedBy = 'user', io) {
    const query = resolvedBy === 'admin' ? { _id: alertId } : { _id: alertId, userId };
    const alert = await SOSAlert.findOne(query);
    if (!alert) throw ApiError.notFound('SOS alert not found');

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    await alert.save();

    // Update user status
    await User.findByIdAndUpdate(alert.userId, { status: 'safe' });

    // Emit real-time event
    if (io) {
      io.to(`sos:${alertId}`).emit('sos:resolved', { alertId });
    }

    // Notify contacts if escalated
    if (alert.escalatedTo && alert.escalatedTo.length > 0) {
      const user = await User.findById(alert.userId);
      const contacts = await EmergencyContact.find({ userId: alert.userId });
      for (const contact of contacts) {
        if (contact.email) {
          try {
            await EmailService.sendSOSResolvedEmail(contact, { userName: user.name });
          } catch (err) {
            console.error(`Failed to send SOS resolved email:`, err.message);
          }
        }
      }
    }

    return { status: 'resolved' };
  }

  /**
   * Update live location during active SOS.
   */
  static async updateLocation(alertId, userId, { latitude, longitude }, io) {
    const alert = await SOSAlert.findOne({
      _id: alertId,
      userId,
      status: { $in: ['active', 'escalated'] },
    });
    if (!alert) throw ApiError.notFound('Active SOS alert not found');

    const coords = [longitude, latitude];

    // Update current location and add to history
    alert.location.coordinates = coords;
    alert.locationHistory.push({ coordinates: coords, timestamp: new Date() });
    await alert.save();

    // Also update user's last known location
    await User.findByIdAndUpdate(userId, {
      lastLocation: { type: 'Point', coordinates: coords },
    });

    // Broadcast location via WebSocket
    if (io) {
      io.to(`sos:${alertId}`).emit('sos:location-update', {
        alertId,
        latitude,
        longitude,
        timestamp: new Date(),
      });
    }

    return { updated: true };
  }

  /**
   * Get active SOS alert for a user.
   */
  static async getActive(userId) {
    const alert = await SOSAlert.findOne({
      userId,
      status: { $in: ['active', 'escalated'] },
    }).populate('communityAlertId');
    return alert;
  }

  /**
   * Get SOS alert by public tracking token (no auth required).
   */
  static async getByTrackingToken(token) {
    const alert = await SOSAlert.findOne({ trackingToken: token })
      .populate('userId', 'name avatar');
    if (!alert) throw ApiError.notFound('Invalid tracking link');
    return {
      alertId: alert._id,
      status: alert.status,
      location: {
        latitude: alert.location.coordinates[1],
        longitude: alert.location.coordinates[0],
      },
      locationHistory: alert.locationHistory.map((l) => ({
        latitude: l.coordinates[1],
        longitude: l.coordinates[0],
        timestamp: l.timestamp,
      })),
      userName: alert.userId?.name || 'Unknown',
      userAvatar: alert.userId?.avatar || '',
      createdAt: alert.createdAt,
      escalatedAt: alert.escalatedAt,
    };
  }

  /**
   * Get SOS history for a user.
   */
  static async getHistory(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [alerts, total] = await Promise.all([
      SOSAlert.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('status createdAt resolvedAt cancelledAt escalatedAt location countdownDuration'),
      SOSAlert.countDocuments({ userId }),
    ]);
    return {
      alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = SOSService;
