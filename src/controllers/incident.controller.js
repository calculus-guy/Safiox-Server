const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Incident = require('../models/Incident');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * @desc    Report an incident to an organization
 * @route   POST /api/incidents/report
 * @access  Private
 */
const reportIncident = asyncHandler(async (req, res) => {
  const { organizationId, type, severity, description, location } = req.body;

  // Verify org exists
  const org = await Organization.findById(organizationId);
  if (!org) throw ApiError.notFound('Organization not found');

  const user = await User.findById(req.user.id).select('name phone role');

  const incident = await Incident.create({
    organizationId,
    userId: req.user.id,
    userName: user.name,
    userPhone: user.phone,
    userRole: user.role,
    type,
    severity,
    description,
    location: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
      address: location.address || '',
    },
    timeline: [
      { action: 'received', timestamp: new Date(), note: 'Incident reported by user' },
    ],
  });

  // Notify org admin
  await Notification.create({
    userId: org.userId,
    type: 'incident_update',
    title: `New ${type} Incident`,
    body: `${user.name} has reported a ${severity.toLowerCase()} ${type.toLowerCase()} incident`,
    data: { incidentId: incident._id },
  });

  // Real-time notification
  const io = req.app.get('io');
  if (io) {
    io.to(`org:${org._id}`).emit('incident:new', {
      incident,
    });
  }

  ApiResponse.created(res, { incident }, 'Incident reported successfully');
});

/**
 * @desc    Get user's reported incidents
 * @route   GET /api/incidents/my
 * @access  Private
 */
const getMyIncidents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [incidents, total] = await Promise.all([
    Incident.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizationId', 'name type'),
    Incident.countDocuments({ userId: req.user.id }),
  ]);

  ApiResponse.paginated(res, incidents, { page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = { reportIncident, getMyIncidents };
