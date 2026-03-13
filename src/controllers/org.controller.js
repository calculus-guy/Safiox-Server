const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Organization = require('../models/Organization');
const Incident = require('../models/Incident');
const Staff = require('../models/Staff');
const FleetUnit = require('../models/FleetUnit');
const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ── Helper: Get org for current user ──
const getOrgForUser = async (userId) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw ApiError.notFound('Organization not found');
  return org;
};

// ══════════════════════════════════════════════════════
// INCIDENTS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get incidents for this organization (filterable)
 * @route   GET /api/org/incidents
 * @access  Private (organization)
 */
const getIncidents = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { status, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = { organizationId: org._id };
  if (status && status !== 'all') query.status = status;
  if (type && type !== 'all') query.type = type;

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('assignedUnitId', 'unitName type')
      .populate('assignedStaffId', 'name role'),
    Incident.countDocuments(query),
  ]);

  ApiResponse.paginated(res, incidents, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Get single incident detail
 * @route   GET /api/org/incidents/:id
 * @access  Private (organization)
 */
const getIncidentById = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const incident = await Incident.findOne({ _id: req.params.id, organizationId: org._id })
    .populate('assignedUnitId', 'unitName type status')
    .populate('assignedStaffId', 'name role status')
    .populate('userId', 'name phone avatar');
  if (!incident) throw ApiError.notFound('Incident not found');
  ApiResponse.ok(res, { incident });
});

/**
 * @desc    Update incident status (transition)
 * @route   PUT /api/org/incidents/:id/status
 * @access  Private (organization)
 */
const updateIncidentStatus = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { status, outcome, note } = req.body;

  const incident = await Incident.findOne({ _id: req.params.id, organizationId: org._id });
  if (!incident) throw ApiError.notFound('Incident not found');

  // Map status to timeline action
  const actionMap = {
    'Responding': 'dispatched',
    'On-Scene': 'on_scene',
    'Resolved': 'resolved',
  };

  incident.status = status;
  if (outcome) incident.outcome = outcome;

  // Add timeline entry
  incident.timeline.push({
    action: actionMap[status] || status.toLowerCase(),
    timestamp: new Date(),
    note: note || '',
    performedBy: req.user.id,
  });

  await incident.save();

  // Update org stats if resolved
  if (status === 'Resolved') {
    await Organization.findByIdAndUpdate(org._id, {
      $inc: { 'stats.totalIncidents': 1 },
    });
  }

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`org:${org._id}`).emit('incident:status-update', {
      incidentId: incident._id,
      status,
      outcome,
      timeline: incident.timeline,
    });
  }

  ApiResponse.ok(res, { incident }, 'Incident status updated');
});

/**
 * @desc    Dispatch a unit to an incident
 * @route   PUT /api/org/incidents/:id/dispatch
 * @access  Private (organization)
 */
const dispatchUnit = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { unitId, staffId, note } = req.body;

  const incident = await Incident.findOne({ _id: req.params.id, organizationId: org._id });
  if (!incident) throw ApiError.notFound('Incident not found');

  // Update unit status
  const unit = await FleetUnit.findOneAndUpdate(
    { _id: unitId, organizationId: org._id },
    { status: 'Responding', assignedIncidentId: incident._id },
    { new: true }
  );
  if (!unit) throw ApiError.notFound('Fleet unit not found');

  // Assign to incident
  incident.assignedUnitId = unitId;
  if (staffId) incident.assignedStaffId = staffId;
  if (incident.status === 'Pending') incident.status = 'Responding';

  incident.timeline.push({
    action: 'dispatched',
    timestamp: new Date(),
    note: note || `Unit ${unit.unitName} dispatched`,
    performedBy: req.user.id,
  });

  await incident.save();

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`org:${org._id}`).emit('incident:dispatched', {
      incidentId: incident._id,
      unitId,
      unitName: unit.unitName,
    });
  }

  ApiResponse.ok(res, { incident, unit }, 'Unit dispatched');
});

// ══════════════════════════════════════════════════════
// STAFF
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all staff
 * @route   GET /api/org/staff
 * @access  Private (organization)
 */
const getStaff = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const staff = await Staff.find({ organizationId: org._id }).sort({ createdAt: -1 });
  ApiResponse.ok(res, { staff });
});

/**
 * @desc    Add staff member
 * @route   POST /api/org/staff
 * @access  Private (organization)
 */
const addStaff = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const member = await Staff.create({
    organizationId: org._id,
    ...req.body,
  });
  ApiResponse.created(res, { staff: member }, 'Staff member added');
});

/**
 * @desc    Update staff member
 * @route   PUT /api/org/staff/:id
 * @access  Private (organization)
 */
const updateStaff = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const member = await Staff.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!member) throw ApiError.notFound('Staff member not found');
  ApiResponse.ok(res, { staff: member }, 'Staff member updated');
});

/**
 * @desc    Delete staff member
 * @route   DELETE /api/org/staff/:id
 * @access  Private (organization)
 */
const deleteStaff = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const member = await Staff.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  if (!member) throw ApiError.notFound('Staff member not found');
  ApiResponse.ok(res, null, 'Staff member removed');
});

// ══════════════════════════════════════════════════════
// FLEET UNITS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all fleet units
 * @route   GET /api/org/units
 * @access  Private (organization)
 */
const getUnits = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { status } = req.query;
  const query = { organizationId: org._id };
  if (status && status !== 'all') query.status = status;

  const units = await FleetUnit.find(query)
    .sort({ createdAt: -1 })
    .populate('assignedIncidentId', 'type status');
  ApiResponse.ok(res, { units });
});

/**
 * @desc    Add fleet unit
 * @route   POST /api/org/units
 * @access  Private (organization)
 */
const addUnit = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { unitName, type, status: unitStatus, location } = req.body;

  const unitData = {
    organizationId: org._id,
    unitName,
    type,
    status: unitStatus || 'Available',
  };

  if (location) {
    unitData.location = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    };
  }

  const unit = await FleetUnit.create(unitData);
  ApiResponse.created(res, { unit }, 'Fleet unit added');
});

/**
 * @desc    Update fleet unit
 * @route   PUT /api/org/units/:id
 * @access  Private (organization)
 */
const updateUnit = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const updates = { ...req.body };

  if (updates.location) {
    updates.location = {
      type: 'Point',
      coordinates: [updates.location.longitude, updates.location.latitude],
    };
  }

  const unit = await FleetUnit.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!unit) throw ApiError.notFound('Fleet unit not found');
  ApiResponse.ok(res, { unit }, 'Fleet unit updated');
});

/**
 * @desc    Delete fleet unit
 * @route   DELETE /api/org/units/:id
 * @access  Private (organization)
 */
const deleteUnit = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const unit = await FleetUnit.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  if (!unit) throw ApiError.notFound('Fleet unit not found');
  ApiResponse.ok(res, null, 'Fleet unit removed');
});

// ══════════════════════════════════════════════════════
// PROFILE & STATS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get org profile
 * @route   GET /api/org/profile
 * @access  Private (organization)
 */
const getProfile = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  ApiResponse.ok(res, { organization: org });
});

/**
 * @desc    Update org profile
 * @route   PUT /api/org/profile
 * @access  Private (organization)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { name, phone, address, operatingHours, hotlineNumbers } = req.body;

  if (name) org.name = name;
  if (phone) org.phone = phone;
  if (address) org.address = address;
  if (operatingHours) org.operatingHours = { ...org.operatingHours.toObject(), ...operatingHours };
  if (hotlineNumbers) org.hotlineNumbers = hotlineNumbers;

  await org.save();
  ApiResponse.ok(res, { organization: org }, 'Profile updated');
});

/**
 * @desc    Get org dashboard stats
 * @route   GET /api/org/stats
 * @access  Private (organization)
 */
const getStats = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);

  const [
    totalIncidents,
    pendingIncidents,
    activeIncidents,
    resolvedIncidents,
    totalStaff,
    onDutyStaff,
    totalUnits,
    availableUnits,
  ] = await Promise.all([
    Incident.countDocuments({ organizationId: org._id }),
    Incident.countDocuments({ organizationId: org._id, status: 'Pending' }),
    Incident.countDocuments({ organizationId: org._id, status: { $in: ['Responding', 'On-Scene'] } }),
    Incident.countDocuments({ organizationId: org._id, status: 'Resolved' }),
    Staff.countDocuments({ organizationId: org._id }),
    Staff.countDocuments({ organizationId: org._id, status: 'On Duty' }),
    FleetUnit.countDocuments({ organizationId: org._id }),
    FleetUnit.countDocuments({ organizationId: org._id, status: 'Available' }),
  ]);

  const responseRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

  ApiResponse.ok(res, {
    stats: {
      totalIncidents,
      pendingIncidents,
      activeIncidents,
      resolvedIncidents,
      responseRate,
      totalStaff,
      onDutyStaff,
      totalUnits,
      availableUnits,
    },
  });
});

// ══════════════════════════════════════════════════════
// BROADCAST
// ══════════════════════════════════════════════════════

/**
 * @desc    Send broadcast to users within coverage area
 * @route   POST /api/org/broadcast
 * @access  Private (organization)
 */
const sendBroadcast = asyncHandler(async (req, res) => {
  const org = await getOrgForUser(req.user.id);
  const { message } = req.body;

  // Find all users within org coverage area (simplified: users near org location)
  const nearbyUsers = await User.find({
    lastLocation: {
      $nearSphere: {
        $geometry: org.location,
        $maxDistance: 10000, // 10km radius
      },
    },
    _id: { $ne: req.user.id },
    role: 'individual',
  }).select('_id');

  const userIds = nearbyUsers.map((u) => u._id);

  // Create broadcast record
  const broadcast = await Broadcast.create({
    organizationId: org._id,
    message,
    sentToCount: userIds.length,
    sentBy: req.user.id,
  });

  // Create notifications for all nearby users
  if (userIds.length > 0) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'broadcast',
      title: `📢 Alert from ${org.name}`,
      body: message,
      data: { organizationId: org._id, broadcastId: broadcast._id },
    }));
    await Notification.insertMany(notifications);
  }

  // Push notification
  const PushService = require('../services/push.service');
  await PushService.sendToMultiple(userIds, {
    title: `📢 ${org.name}`,
    body: message,
    data: { type: 'broadcast', organizationId: org._id.toString() },
  });

  // Emit real-time
  const io = req.app.get('io');
  if (io) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit('broadcast', {
        organizationName: org.name,
        message,
        timestamp: new Date(),
      });
    });
  }

  ApiResponse.created(res, { broadcast, sentTo: userIds.length }, 'Broadcast sent');
});

module.exports = {
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  dispatchUnit,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getUnits,
  addUnit,
  updateUnit,
  deleteUnit,
  getProfile,
  updateProfile,
  getStats,
  sendBroadcast,
};
