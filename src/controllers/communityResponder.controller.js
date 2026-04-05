const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const CommunityResponder = require('../models/CommunityResponder');
const CommunityAlert = require('../models/CommunityAlert');
const CommunityMessage = require('../models/CommunityMessage');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PushService = require('../services/push.service');

// ══════════════════════════════════════════════════════
// RESPONDER REGISTRATION
// ══════════════════════════════════════════════════════

/**
 * @desc    Register as a community responder
 * @route   POST /api/community-responders/register
 * @access  Private
 */
const register = asyncHandler(async (req, res) => {
  const existing = await CommunityResponder.findOne({ userId: req.user.id });
  if (existing) throw ApiError.conflict('You are already registered as a responder');

  const user = await User.findById(req.user.id).select('name lastLocation');

  const responder = await CommunityResponder.create({
    userId: req.user.id,
    name: user.name,
    specialty: req.body.specialty || 'General',
    location: user.lastLocation || { type: 'Point', coordinates: [0, 0] },
  });

  ApiResponse.created(res, { responder }, 'Registered as community responder');
});

/**
 * @desc    Get current user's responder profile
 * @route   GET /api/community-responders/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const responder = await CommunityResponder.findOne({ userId: req.user.id });
  ApiResponse.ok(res, { responder });
});

/**
 * @desc    Toggle availability
 * @route   PUT /api/community-responders/availability
 * @access  Private
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  const responder = await CommunityResponder.findOne({ userId: req.user.id });
  if (!responder) throw ApiError.notFound('Responder profile not found');

  responder.available = !responder.available;
  await responder.save();

  ApiResponse.ok(res, { available: responder.available }, `You are now ${responder.available ? 'available' : 'unavailable'}`);
});

/**
 * @desc    Update responder location
 * @route   PUT /api/community-responders/location
 * @access  Private
 */
/**
 * @desc    Update user location (global and responder)
 * @route   PUT /api/community-responders/location
 * @access  Private
 */
const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const coords = [longitude, latitude];

  // 1. Update global user location (essential for nearby alert discovery)
  await User.findByIdAndUpdate(req.user.id, {
    lastLocation: { type: 'Point', coordinates: coords },
  });

  // 2. Also update responder profile if it exists
  await CommunityResponder.findOneAndUpdate(
    { userId: req.user.id },
    { location: { type: 'Point', coordinates: coords } }
  );

  ApiResponse.ok(res, null, 'Location updated');
});

/**
 * @desc    Get nearby available responders
 * @route   GET /api/community-responders/nearby?lat=&lng=&radius=
 * @access  Private
 */
const getNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;

  const responders = await CommunityResponder.find({
    available: true,
    userId: { $ne: req.user.id },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(radius, 10),
      },
    },
  }).limit(20);

  ApiResponse.ok(res, { responders, count: responders.length });
});

// ══════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get active alerts near a location (for home banner + emergency tab)
 * @route   GET /api/community-responders/alerts/nearby?lat=&lng=&radius=
 * @access  Private
 */
const getNearbyAlerts = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  if (!lat || !lng) throw ApiError.badRequest('lat and lng are required');

  const alerts = await CommunityAlert.find({
    status: 'active',
    userId: { $ne: req.user.id },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(radius, 10),
      },
    },
  })
    .limit(10)
    .select('description location radius status createdAt visibility responders userId')
    .populate('userId', 'name avatar');

  // Mask requester identity for anonymous alerts
  const sanitized = alerts.map((a) => {
    const obj = a.toObject();
    if (obj.visibility === 'anonymous') {
      obj.userId = null;
    }
    return obj;
  });

  ApiResponse.ok(res, { alerts: sanitized, count: sanitized.length });
});

/**
 * @desc    Create a community alert (request help)
 * @route   POST /api/community-responders/alert
 * @access  Private
 */
const createAlert = asyncHandler(async (req, res) => {
  const {
    description, location, radius = 3000,
    visibility = 'show_id', alertOfficialServices = [],
    notifyEmergencyContacts = false, shareLocation = true,
  } = req.body;

  // Prevent duplicate active alerts
  const existing = await CommunityAlert.findOne({ userId: req.user.id, status: 'active' });
  if (existing) throw ApiError.conflict('You already have an active community alert');

  const coords = [location.longitude, location.latitude];

  const alert = await CommunityAlert.create({
    userId: req.user.id,
    description,
    location: { type: 'Point', coordinates: coords },
    radius,
    visibility,
    alertOfficialServices,
    notifyEmergencyContacts,
    shareLocation,
  });

  const io = req.app.get('io');
  const user = await User.findById(req.user.id).select('name');

  // ── 1. Find nearby users (not just registered responders) ──
  const nearbyUsers = await User.find({
    _id: { $ne: req.user.id },
    isDeactivated: { $ne: true },
    lastLocation: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: radius,
      },
    },
  }).select('_id deviceTokens').limit(100);

  const nearbyUserIds = nearbyUsers.map((u) => u._id);

  // ── 2. Also find registered responders in range ──
  const nearbyResponders = await CommunityResponder.find({
    available: true,
    userId: { $ne: req.user.id },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: radius,
      },
    },
  }).select('userId name _id').limit(50);

  // Merge responder userIds into notified set
  const responderUserIdSet = new Set(nearbyResponders.map((r) => r.userId.toString()));
  const allNotifyIds = [...new Set([
    ...nearbyUserIds.map((id) => id.toString()),
    ...nearbyResponders.map((r) => r.userId.toString()),
  ])];

  // Pre-populate responders array with registered responders
  alert.responders = nearbyResponders.map((r) => ({
    responderId: r._id,
    userId: r.userId,
    name: r.name,
    status: 'notified',
  }));
  await alert.save();

  // ── 3. Push notifications to all nearby users ──
  if (allNotifyIds.length > 0) {
    await PushService.sendToMultiple(allNotifyIds, {
      title: '🆘 Emergency Help Needed Nearby',
      body: description.substring(0, 100),
      data: { type: 'community_alert', alertId: alert._id.toString() },
    });

    const notifications = allNotifyIds.map((userId) => ({
      userId,
      type: 'community_alert',
      title: '🆘 Someone Nearby Needs Help',
      body: description.substring(0, 200),
      data: { alertId: alert._id },
    }));
    await Notification.insertMany(notifications);

    // Real-time socket push to each user's personal room
    allNotifyIds.forEach((userId) => {
      if (io) {
        io.to(`user:${userId}`).emit('community:new-alert', {
          alertId: alert._id,
          description: description.substring(0, 100),
          location: { latitude: location.latitude, longitude: location.longitude },
        });
      }
    });
  }

  // ── 4. Alert official services if requested ──
  if (alertOfficialServices.length > 0) {
    const nearbyOrgs = await Organization.find({
      type: { $in: alertOfficialServices },
      verificationStatus: 'verified',
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: coords },
          $maxDistance: radius * 3, // wider radius for official services
        },
      },
    }).select('userId name type').limit(20);

    if (nearbyOrgs.length > 0) {
      const orgUserIds = nearbyOrgs.map((o) => o.userId);

      await PushService.sendToMultiple(orgUserIds, {
        title: '🚨 Community Alert — Official Response Requested',
        body: description.substring(0, 100),
        data: { type: 'community_alert_official', alertId: alert._id.toString() },
      });

      const orgNotifications = nearbyOrgs.map((org) => ({
        userId: org.userId,
        type: 'community_alert',
        title: `🚨 Community Alert Near You (${org.type})`,
        body: description.substring(0, 200),
        data: { alertId: alert._id, source: 'community' },
      }));
      await Notification.insertMany(orgNotifications);

      if (io) {
        orgUserIds.forEach((userId) => {
          io.to(`user:${userId}`).emit('community:official-alert', {
            alertId: alert._id,
            description: description.substring(0, 100),
            location: { latitude: location.latitude, longitude: location.longitude },
          });
        });
      }
    }
  }

  // ── 5. System message in chat ──
  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: `${visibility === 'anonymous' ? 'Someone' : user.name} has requested community assistance. ${allNotifyIds.length} user(s) notified.`,
    type: 'system',
  });

  ApiResponse.created(res, {
    alert,
    usersNotified: allNotifyIds.length,
    respondersNotified: nearbyResponders.length,
  }, 'Community alert created');
});

/**
 * @desc    Get active community alert for current user (as requester or responder)
 * @route   GET /api/community-responders/alert/active
 * @access  Private
 */
const getActiveAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({
    $or: [
      { userId: req.user.id, status: 'active' },
      { 'responders.userId': new mongoose.Types.ObjectId(req.user.id), status: 'active' },
    ],
  })
    .populate('userId', 'name avatar')
    .populate('responders.userId', 'name avatar');

  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Get the active alert CREATED by the current user
 * @route   GET /api/community-responders/alert/my-active
 * @access  Private
 */
const getMyActiveAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({
    userId: req.user.id,
    status: 'active',
  })
    .populate('userId', 'name avatar')
    .populate('responders.userId', 'name avatar');

  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Get alert detail by ID
 * @route   GET /api/community-responders/alert/:id
 * @access  Private
 */
const getAlertById = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findById(req.params.id)
    .populate('userId', 'name avatar')
    .populate('responders.userId', 'name avatar');

  if (!alert) throw ApiError.notFound('Community alert not found');

  // Mask identity for anonymous alerts (unless it's the requester themselves)
  const obj = alert.toObject();
  if (obj.visibility === 'anonymous' && obj.userId?._id?.toString() !== req.user.id) {
    obj.userId = null;
  }

  ApiResponse.ok(res, { alert: obj });
});

/**
 * @desc    Respond to a community alert (any nearby user can self-register)
 * @route   PUT /api/community-responders/alert/:id/respond
 * @access  Private
 */
const respondToAlert = asyncHandler(async (req, res) => {
  const { status, eta, distance } = req.body;
  const alert = await CommunityAlert.findById(req.params.id);
  if (!alert) throw ApiError.notFound('Alert not found');
  if (alert.status !== 'active') throw ApiError.badRequest('Alert is no longer active');
  if (alert.userId.toString() === req.user.id) throw ApiError.badRequest('You cannot respond to your own alert');

  // Check if already in responders list
  let responder = alert.responders.find((r) => r.userId?.toString() === req.user.id);

  if (!responder) {
    // Self-register: any nearby user can become a responder
    const responderProfile = await CommunityResponder.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id).select('name');
    alert.responders.push({
      responderId: responderProfile?._id || null,
      userId: req.user.id,
      name: user.name,
      status,
      eta: eta || '',
      distance: distance || '',
      acceptedAt: status === 'accepted' ? new Date() : undefined,
      arrivedAt: status === 'arrived' ? new Date() : undefined,
    });
  } else {
    // Update existing entry
    responder.status = status;
    if (status === 'accepted') {
      responder.acceptedAt = new Date();
      responder.eta = eta || '';
      responder.distance = distance || '';
    }
    if (status === 'arrived') {
      responder.arrivedAt = new Date();
    }
  }

  await alert.save();

  const user = await User.findById(req.user.id).select('name');
  const actionText = status === 'accepted' ? 'is coming to help' : status === 'arrived' ? 'has arrived' : 'declined';

  // System message
  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: `${user.name} ${actionText}${eta ? ` (ETA: ${eta})` : ''}`,
    type: 'system',
  });

  // Real-time update to alert room
  const io = req.app.get('io');
  if (io) {
    const acceptedCount = alert.responders.filter((r) => r.status === 'accepted' || r.status === 'arrived').length;
    const viewedCount = alert.responders.filter((r) => r.status === 'viewed').length;

    io.to(`community_alert_${alert._id}`).emit('community:responder-update', {
      alertId: alert._id,
      responderId: req.user.id,
      responderName: user.name,
      status,
      eta,
      distance,
      acceptedCount,
      viewedCount,
    });
  }

  // Notify the requester
  await PushService.sendToUser(alert.userId, {
    title: status === 'accepted' ? '✅ Responder Incoming' : status === 'arrived' ? '📍 Responder Arrived' : 'Responder Update',
    body: `${user.name} ${actionText}`,
    data: { type: 'responder_accepted', alertId: alert._id.toString() },
  });

  const updatedResponder = alert.responders.find((r) => r.userId?.toString() === req.user.id);
  ApiResponse.ok(res, { responder: updatedResponder }, `Response recorded: ${status}`);
});

/**
 * @desc    Complete a community alert
 * @route   PUT /api/community-responders/alert/:id/complete
 * @access  Private
 */
const completeAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({ _id: req.params.id, userId: req.user.id });
  if (!alert) throw ApiError.notFound('Alert not found or not yours');

  alert.status = 'completed';
  alert.completedAt = new Date();
  alert.duration = Math.round((Date.now() - alert.createdAt.getTime()) / 1000);
  await alert.save();

  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: 'This alert has been resolved. Thank you to all responders!',
    type: 'system',
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`community_alert_${alert._id}`).emit('community:alert-completed', { alertId: alert._id });
  }

  // Increment totalResponses for accepted/arrived responders
  const accepted = alert.responders.filter((r) => r.status === 'accepted' || r.status === 'arrived');
  for (const r of accepted) {
    if (r.responderId) {
      await CommunityResponder.findByIdAndUpdate(r.responderId, { $inc: { totalResponses: 1 } });
    }
  }

  ApiResponse.ok(res, { alert }, 'Community alert completed');
});

/**
 * @desc    Cancel a community alert
 * @route   PUT /api/community-responders/alert/:id/cancel
 * @access  Private
 */
const cancelAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({ _id: req.params.id, userId: req.user.id });
  if (!alert) throw ApiError.notFound('Alert not found or not yours');

  alert.status = 'cancelled';
  alert.cancelledAt = new Date();
  await alert.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`community_alert_${alert._id}`).emit('community:alert-cancelled', { alertId: alert._id });
  }

  ApiResponse.ok(res, null, 'Community alert cancelled');
});

// ══════════════════════════════════════════════════════
// GROUP CHAT
// ══════════════════════════════════════════════════════

/**
 * @desc    Get messages for a community alert session
 * @route   GET /api/community-responders/session/:id/messages
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    CommunityMessage.find({ communityAlertId: req.params.id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    CommunityMessage.countDocuments({ communityAlertId: req.params.id }),
  ]);

  ApiResponse.paginated(res, messages, { page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @desc    Send a message in community alert chat
 * @route   POST /api/community-responders/session/:id/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { text, mediaUrl, type } = req.body;
  const user = await User.findById(req.user.id).select('name');

  const message = await CommunityMessage.create({
    communityAlertId: req.params.id,
    senderId: req.user.id,
    senderName: user.name,
    text: text || '',
    mediaUrl: mediaUrl || '',
    type: type || 'text',
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`community_alert_${req.params.id}`).emit('community:message', {
      alertId: req.params.id,
      message,
    });
  }

  ApiResponse.created(res, { message }, 'Message sent');
});

// ══════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════

/**
 * @desc    Get community alert history for current user
 * @route   GET /api/community-responders/history
 * @access  Private
 */
const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    CommunityAlert.find({
      $or: [
        { userId: req.user.id },
        { 'responders.userId': new mongoose.Types.ObjectId(req.user.id) },
      ],
      status: { $in: ['completed', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('description status createdAt completedAt cancelledAt duration responders'),
    CommunityAlert.countDocuments({
      $or: [
        { userId: req.user.id },
        { 'responders.userId': new mongoose.Types.ObjectId(req.user.id) },
      ],
      status: { $in: ['completed', 'cancelled'] },
    }),
  ]);

  ApiResponse.paginated(res, alerts, { page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = {
  register,
  getProfile,
  toggleAvailability,
  updateLocation,
  getNearby,
  getNearbyAlerts,
  createAlert,
  getActiveAlert,
  getMyActiveAlert,
  getAlertById,
  respondToAlert,
  completeAlert,
  cancelAlert,
  getMessages,
  sendMessage,
  getHistory,
};
