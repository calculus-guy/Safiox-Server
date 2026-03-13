const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const CommunityResponder = require('../models/CommunityResponder');
const CommunityAlert = require('../models/CommunityAlert');
const CommunityMessage = require('../models/CommunityMessage');
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
  // Check if already registered
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
const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const responder = await CommunityResponder.findOneAndUpdate(
    { userId: req.user.id },
    { location: { type: 'Point', coordinates: [longitude, latitude] } },
    { new: true }
  );
  if (!responder) throw ApiError.notFound('Responder profile not found');
  ApiResponse.ok(res, null, 'Location updated');
});

/**
 * @desc    Get nearby available responders
 * @route   GET /api/community-responders/nearby
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
 * @desc    Create a community alert (request help)
 * @route   POST /api/community-responders/alert
 * @access  Private
 */
const createAlert = asyncHandler(async (req, res) => {
  const { description, location, radius, visibility, alertOfficialServices, notifyEmergencyContacts, shareLocation } = req.body;

  // Check for existing active alert
  const existing = await CommunityAlert.findOne({ userId: req.user.id, status: 'active' });
  if (existing) throw ApiError.conflict('You already have an active community alert');

  const alert = await CommunityAlert.create({
    userId: req.user.id,
    description,
    location: { type: 'Point', coordinates: [location.longitude, location.latitude] },
    radius,
    visibility,
    alertOfficialServices,
    notifyEmergencyContacts,
    shareLocation,
  });

  // Find nearby available responders and notify them
  const nearbyResponders = await CommunityResponder.find({
    available: true,
    userId: { $ne: req.user.id },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
        $maxDistance: radius || 3000,
      },
    },
  }).limit(50);

  // Add responders to alert
  const responderRecords = nearbyResponders.map((r) => ({
    responderId: r._id,
    userId: r.userId,
    name: r.name,
    status: 'notified',
  }));
  alert.responders = responderRecords;
  await alert.save();

  // Send push notifications and create in-app notifications
  const responderUserIds = nearbyResponders.map((r) => r.userId);
  if (responderUserIds.length > 0) {
    await PushService.sendToMultiple(responderUserIds, {
      title: '🆘 Community Alert Nearby',
      body: description.substring(0, 100),
      data: { type: 'community_alert', alertId: alert._id.toString() },
    });

    const notifications = responderUserIds.map((userId) => ({
      userId,
      type: 'community_alert',
      title: '🆘 Someone Nearby Needs Help',
      body: description.substring(0, 200),
      data: { alertId: alert._id },
    }));
    await Notification.insertMany(notifications);
  }

  // Emit real-time
  const io = req.app.get('io');
  if (io) {
    responderUserIds.forEach((userId) => {
      io.to(`user:${userId}`).emit('community:new-alert', {
        alertId: alert._id,
        description: description.substring(0, 100),
        location: { latitude: location.latitude, longitude: location.longitude },
      });
    });
  }

  // System message in chat
  const user = await User.findById(req.user.id).select('name');
  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: `${visibility === 'anonymous' ? 'Someone' : user.name} has requested community assistance. ${nearbyResponders.length} responder(s) notified.`,
    type: 'system',
  });

  ApiResponse.created(res, {
    alert,
    respondersNotified: nearbyResponders.length,
  }, 'Community alert created');
});

/**
 * @desc    Get active community alert for current user
 * @route   GET /api/community-responders/alert/active
 * @access  Private
 */
const getActiveAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({
    $or: [
      { userId: req.user.id, status: 'active' },
      { 'responders.userId': req.user.id, status: 'active' },
    ],
  });
  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Get alert detail
 * @route   GET /api/community-responders/alert/:id
 * @access  Private
 */
const getAlertById = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findById(req.params.id)
    .populate('userId', 'name avatar');
  if (!alert) throw ApiError.notFound('Community alert not found');
  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Respond to a community alert (accept/decline)
 * @route   PUT /api/community-responders/alert/:id/respond
 * @access  Private
 */
const respondToAlert = asyncHandler(async (req, res) => {
  const { status, eta, distance } = req.body;
  const alert = await CommunityAlert.findById(req.params.id);
  if (!alert) throw ApiError.notFound('Alert not found');
  if (alert.status !== 'active') throw ApiError.badRequest('Alert is no longer active');

  // Find this responder in the alert
  const responder = alert.responders.find((r) => r.userId.toString() === req.user.id);
  if (!responder) throw ApiError.forbidden('You are not a notified responder');

  responder.status = status;
  if (status === 'accepted') {
    responder.acceptedAt = new Date();
    responder.eta = eta || '';
    responder.distance = distance || '';
  }
  if (status === 'arrived') {
    responder.arrivedAt = new Date();
  }

  await alert.save();

  // Add system message
  const user = await User.findById(req.user.id).select('name');
  const actionText = status === 'accepted' ? 'is coming to help' : status === 'arrived' ? 'has arrived' : 'declined';
  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: `${user.name} ${actionText}${eta ? ` (ETA: ${eta})` : ''}`,
    type: 'system',
  });

  // Real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`community:${alert._id}`).emit('community:responder-update', {
      alertId: alert._id,
      responderId: req.user.id,
      responderName: user.name,
      status,
      eta,
      distance,
    });
  }

  // Push notify the person who created the alert
  await PushService.sendToUser(alert.userId, {
    title: status === 'accepted' ? '✅ Responder Incoming' : status === 'arrived' ? '📍 Responder Arrived' : 'Responder Update',
    body: `${user.name} ${actionText}`,
    data: { type: 'responder_accepted', alertId: alert._id.toString() },
  });

  ApiResponse.ok(res, { responder }, `Response recorded: ${status}`);
});

/**
 * @desc    Complete / cancel community alert
 * @route   PUT /api/community-responders/alert/:id/complete
 * @access  Private
 */
const completeAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({ _id: req.params.id, userId: req.user.id });
  if (!alert) throw ApiError.notFound('Alert not found');

  alert.status = 'completed';
  alert.completedAt = new Date();
  alert.duration = Math.round((Date.now() - alert.createdAt.getTime()) / 1000);
  await alert.save();

  // System message
  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: 'This alert has been resolved. Thank you to all responders!',
    type: 'system',
  });

  // Real-time
  const io = req.app.get('io');
  if (io) {
    io.to(`community:${alert._id}`).emit('community:alert-completed', { alertId: alert._id });
  }

  // Increment responder stats for those who accepted
  const acceptedResponders = alert.responders.filter((r) => r.status === 'accepted' || r.status === 'arrived');
  for (const r of acceptedResponders) {
    await CommunityResponder.findByIdAndUpdate(r.responderId, {
      $inc: { totalResponses: 1 },
    });
  }

  ApiResponse.ok(res, { alert }, 'Community alert completed');
});

/**
 * @desc    Cancel community alert
 * @route   PUT /api/community-responders/alert/:id/cancel
 * @access  Private
 */
const cancelAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findOne({ _id: req.params.id, userId: req.user.id });
  if (!alert) throw ApiError.notFound('Alert not found');

  alert.status = 'cancelled';
  alert.cancelledAt = new Date();
  await alert.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`community:${alert._id}`).emit('community:alert-cancelled', { alertId: alert._id });
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

  // Broadcast via WebSocket
  const io = req.app.get('io');
  if (io) {
    io.to(`community:${req.params.id}`).emit('community:message', {
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
        { 'responders.userId': req.user.id },
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
        { 'responders.userId': req.user.id },
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
  createAlert,
  getActiveAlert,
  getAlertById,
  respondToAlert,
  completeAlert,
  cancelAlert,
  getMessages,
  sendMessage,
  getHistory,
};
