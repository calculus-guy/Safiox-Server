const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Organization = require('../models/Organization');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const SOSAlert = require('../models/SOSAlert');
const Incident = require('../models/Incident');
const Notification = require('../models/Notification');
const CommunityAlert = require('../models/CommunityAlert');
const CommunityResponder = require('../models/CommunityResponder');
const CommunityMessage = require('../models/CommunityMessage');
const EmailService = require('../services/email.service');

// ══════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all users (paginated, filterable)
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (role && role !== 'all') query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select('-password -refreshToken'),
    User.countDocuments(query),
  ]);

  ApiResponse.paginated(res, users, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Get single user detail
 * @route   GET /api/admin/users/:id
 * @access  Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, { user });
});

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password -refreshToken');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, { user }, 'User role updated');
});

/**
 * @desc    Deactivate a user
 * @route   PUT /api/admin/users/:id/deactivate
 * @access  Admin
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isDeactivated: true, deactivatedAt: new Date() },
    { new: true }
  ).select('name email isDeactivated');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, { user }, 'User deactivated');
});

/**
 * @desc    Reactivate a user
 * @route   PUT /api/admin/users/:id/reactivate
 * @access  Admin
 */
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isDeactivated: false, deactivatedAt: null },
    { new: true }
  ).select('name email isDeactivated');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, { user }, 'User reactivated');
});

// ══════════════════════════════════════════════════════
// ORGANIZATION VERIFICATION
// ══════════════════════════════════════════════════════

/**
 * @desc    Get organizations pending verification
 * @route   GET /api/admin/organizations/pending
 * @access  Admin
 */
const getPendingOrgs = asyncHandler(async (req, res) => {
  const orgs = await Organization.find({ verificationStatus: 'pending' })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email');
  ApiResponse.ok(res, { organizations: orgs, count: orgs.length });
});

/**
 * @desc    Get all organizations (filterable)
 * @route   GET /api/admin/organizations
 * @access  Admin
 */
const getAllOrganizations = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (status && status !== 'all') query.verificationStatus = status;
  if (type && type !== 'all') query.type = type;

  const [orgs, total] = await Promise.all([
    Organization.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email'),
    Organization.countDocuments(query),
  ]);

  ApiResponse.paginated(res, orgs, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Get single organization detail (for admin review)
 * @route   GET /api/admin/organizations/:id
 * @access  Admin
 */
const getOrganizationById = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id)
    .populate('userId', 'name email phone createdAt');
  if (!org) throw ApiError.notFound('Organization not found');
  ApiResponse.ok(res, { organization: org });
});

/**
 * @desc    Approve organization
 * @route   PUT /api/admin/organizations/:id/approve
 * @access  Admin
 */
const approveOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { verificationStatus: 'verified', verifiedAt: new Date(), verificationRejectionReason: '' },
    { new: true }
  );
  if (!org) throw ApiError.notFound('Organization not found');

  try {
    await EmailService.sendOrgApprovalEmail(org);
  } catch (err) {
    console.error('Failed to send org approval email:', err.message);
  }

  // In-app notification to org admin
  await Notification.create({
    userId: org.userId,
    type: 'org_approved',
    title: '✅ Organization Verified',
    body: `${org.name} has been verified. You can now access all organization features.`,
    data: { organizationId: org._id },
  });

  ApiResponse.ok(res, { organization: org }, 'Organization approved');
});

/**
 * @desc    Reject organization
 * @route   PUT /api/admin/organizations/:id/reject
 * @access  Admin
 */
const rejectOrganization = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    {
      verificationStatus: 'rejected',
      rejectedAt: new Date(),
      verificationRejectionReason: reason || '',
    },
    { new: true }
  );
  if (!org) throw ApiError.notFound('Organization not found');

  try {
    await EmailService.sendOrgRejectionEmail(org, reason);
  } catch (err) {
    console.error('Failed to send org rejection email:', err.message);
  }

  // In-app notification to org admin
  await Notification.create({
    userId: org.userId,
    type: 'org_rejected',
    title: '❌ Organization Verification Failed',
    body: reason
      ? `Your organization was not verified. Reason: ${reason}`
      : 'Your organization verification was unsuccessful. Please contact support.',
    data: { organizationId: org._id },
  });

  ApiResponse.ok(res, { organization: org }, 'Organization rejected');
});

// ══════════════════════════════════════════════════════
// CONTENT MODERATION (Admin takedown)
// ══════════════════════════════════════════════════════

/**
 * @desc    Remove a feed post (admin takedown)
 * @route   PUT /api/admin/posts/:id/remove
 * @access  Admin
 */
const removePost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const post = await FeedPost.findByIdAndUpdate(
    req.params.id,
    {
      isRemoved: true,
      removedAt: new Date(),
      removedBy: req.user.id,
      removalReason: reason || 'Violation of community guidelines',
    },
    { new: true }
  );
  if (!post) throw ApiError.notFound('Post not found');

  // Notify the post author
  await Notification.create({
    userId: post.authorId,
    type: 'system',
    title: 'Post Removed',
    body: `Your post was removed: ${reason || 'Violation of community guidelines'}`,
    data: { postId: post._id },
  });

  ApiResponse.ok(res, { post }, 'Post removed');
});

/**
 * @desc    Restore a removed post
 * @route   PUT /api/admin/posts/:id/restore
 * @access  Admin
 */
const restorePost = asyncHandler(async (req, res) => {
  const post = await FeedPost.findByIdAndUpdate(
    req.params.id,
    { isRemoved: false, removedAt: null, removedBy: null, removalReason: null },
    { new: true }
  );
  if (!post) throw ApiError.notFound('Post not found');
  ApiResponse.ok(res, { post }, 'Post restored');
});

/**
 * @desc    Remove a comment (admin takedown)
 * @route   PUT /api/admin/comments/:id/remove
 * @access  Admin
 */
const removeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { isRemoved: true },
    { new: true }
  );
  if (!comment) throw ApiError.notFound('Comment not found');
  ApiResponse.ok(res, { comment }, 'Comment removed');
});

// ══════════════════════════════════════════════════════
// SOS MANAGEMENT
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all active SOS alerts
 * @route   GET /api/admin/sos/active
 * @access  Admin
 */
const getActiveSOS = asyncHandler(async (req, res) => {
  const alerts = await SOSAlert.find({ status: { $in: ['active', 'escalated'] } })
    .sort({ createdAt: -1 })
    .populate('userId', 'name phone avatar');
  ApiResponse.ok(res, { alerts, count: alerts.length });
});

/**
 * @desc    Admin resolve an SOS alert
 * @route   PUT /api/admin/sos/:id/resolve
 * @access  Admin
 */
const adminResolveSOS = asyncHandler(async (req, res) => {
  const SOSService = require('../services/sos.service');
  const io = req.app.get('io');
  const result = await SOSService.resolve(req.params.id, null, 'admin', io);
  ApiResponse.ok(res, result, 'SOS alert resolved by admin');
});

// ══════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get platform analytics
 * @route   GET /api/admin/analytics
 * @access  Admin
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalOrgs,
    verifiedOrgs,
    pendingOrgs,
    totalPosts,
    totalIncidents,
    activeSOS,
    resolvedSOS,
    activeCommunityAlerts,
    totalResponders,
  ] = await Promise.all([
    User.countDocuments({ role: 'personal' }),
    Organization.countDocuments(),
    Organization.countDocuments({ verificationStatus: 'verified' }),
    Organization.countDocuments({ verificationStatus: 'pending' }),
    FeedPost.countDocuments({ isRemoved: { $ne: true } }),
    Incident.countDocuments(),
    SOSAlert.countDocuments({ status: { $in: ['active', 'escalated'] } }),
    SOSAlert.countDocuments({ status: 'resolved' }),
    CommunityAlert.countDocuments({ status: 'active' }),
    CommunityResponder.countDocuments(),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

  ApiResponse.ok(res, {
    analytics: {
      users: { total: totalUsers, newThisWeek: newUsersThisWeek },
      organizations: { total: totalOrgs, verified: verifiedOrgs, pending: pendingOrgs },
      feed: { totalPosts },
      incidents: { total: totalIncidents },
      sos: { active: activeSOS, resolved: resolvedSOS },
      community: { activeAlerts: activeCommunityAlerts, totalResponders },
    },
  });
});

// ══════════════════════════════════════════════════════
// COMMUNITY RESPONDER MANAGEMENT (Admin)
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all community alerts (paginated, filterable by status)
 * @route   GET /api/admin/community/alerts
 * @access  Admin
 */
const getCommunityAlerts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (status && status !== 'all') query.status = status;

  const [alerts, total] = await Promise.all([
    CommunityAlert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email avatar'),
    CommunityAlert.countDocuments(query),
  ]);

  ApiResponse.paginated(res, alerts, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Get single community alert detail with full responder list
 * @route   GET /api/admin/community/alerts/:id
 * @access  Admin
 */
const getCommunityAlertById = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findById(req.params.id)
    .populate('userId', 'name email avatar');
  if (!alert) throw ApiError.notFound('Community alert not found');
  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Admin force-resolve a community alert
 * @route   PUT /api/admin/community/alerts/:id/resolve
 * @access  Admin
 */
const adminResolveCommunityAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findById(req.params.id);
  if (!alert) throw ApiError.notFound('Community alert not found');

  alert.status = 'completed';
  alert.completedAt = new Date();
  alert.duration = Math.round((Date.now() - alert.createdAt.getTime()) / 1000);
  await alert.save();

  await CommunityMessage.create({
    communityAlertId: alert._id,
    senderId: req.user.id,
    senderName: 'System',
    text: 'This alert has been resolved by an administrator.',
    type: 'system',
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`community_alert_${alert._id}`).emit('community:alert-completed', {
      alertId: alert._id,
      resolvedBy: 'admin',
    });
  }

  ApiResponse.ok(res, { alert }, 'Community alert resolved by admin');
});

/**
 * @desc    Admin force-cancel a community alert
 * @route   PUT /api/admin/community/alerts/:id/cancel
 * @access  Admin
 */
const adminCancelCommunityAlert = asyncHandler(async (req, res) => {
  const alert = await CommunityAlert.findById(req.params.id);
  if (!alert) throw ApiError.notFound('Community alert not found');

  alert.status = 'cancelled';
  alert.cancelledAt = new Date();
  await alert.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`community_alert_${alert._id}`).emit('community:alert-cancelled', {
      alertId: alert._id,
      cancelledBy: 'admin',
    });
  }

  ApiResponse.ok(res, null, 'Community alert cancelled by admin');
});

/**
 * @desc    Get all registered community responders (paginated)
 * @route   GET /api/admin/community/responders
 * @access  Admin
 */
const getCommunityResponders = asyncHandler(async (req, res) => {
  const { available, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (available === 'true') query.available = true;
  if (available === 'false') query.available = false;

  const [responders, total] = await Promise.all([
    CommunityResponder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name email avatar'),
    CommunityResponder.countDocuments(query),
  ]);

  ApiResponse.paginated(res, responders, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Verify / unverify a community responder
 * @route   PUT /api/admin/community/responders/:id/verify
 * @access  Admin
 */
const verifyCommunityResponder = asyncHandler(async (req, res) => {
  const { verified } = req.body;
  const responder = await CommunityResponder.findByIdAndUpdate(
    req.params.id,
    { verified: verified !== false },
    { new: true }
  ).populate('userId', 'name email');
  if (!responder) throw ApiError.notFound('Responder not found');

  await Notification.create({
    userId: responder.userId._id,
    type: 'system',
    title: responder.verified ? '✅ Responder Verified' : 'Responder Status Updated',
    body: responder.verified
      ? 'Your community responder profile has been verified by an admin.'
      : 'Your community responder verification has been revoked.',
    data: {},
  });

  ApiResponse.ok(res, { responder }, `Responder ${responder.verified ? 'verified' : 'unverified'}`);
});

/**
 * @desc    Remove a community responder profile
 * @route   DELETE /api/admin/community/responders/:id
 * @access  Admin
 */
const deleteCommunityResponder = asyncHandler(async (req, res) => {
  const responder = await CommunityResponder.findByIdAndDelete(req.params.id);
  if (!responder) throw ApiError.notFound('Responder not found');
  ApiResponse.ok(res, null, 'Responder profile removed');
});

/**
 * @desc    Get community stats summary
 * @route   GET /api/admin/community/stats
 * @access  Admin
 */
const getCommunityStats = asyncHandler(async (req, res) => {
  const [
    totalAlerts,
    activeAlerts,
    completedAlerts,
    cancelledAlerts,
    totalResponders,
    availableResponders,
    verifiedResponders,
  ] = await Promise.all([
    CommunityAlert.countDocuments(),
    CommunityAlert.countDocuments({ status: 'active' }),
    CommunityAlert.countDocuments({ status: 'completed' }),
    CommunityAlert.countDocuments({ status: 'cancelled' }),
    CommunityResponder.countDocuments(),
    CommunityResponder.countDocuments({ available: true }),
    CommunityResponder.countDocuments({ verified: true }),
  ]);

  // Avg responders per completed alert
  const completedWithResponders = await CommunityAlert.aggregate([
    { $match: { status: 'completed' } },
    { $project: { responderCount: { $size: '$responders' } } },
    { $group: { _id: null, avg: { $avg: '$responderCount' } } },
  ]);

  ApiResponse.ok(res, {
    stats: {
      alerts: { total: totalAlerts, active: activeAlerts, completed: completedAlerts, cancelled: cancelledAlerts },
      responders: { total: totalResponders, available: availableResponders, verified: verifiedResponders },
      avgRespondersPerAlert: completedWithResponders[0]?.avg?.toFixed(1) ?? 0,
    },
  });
});

// ══════════════════════════════════════════════════════
// FEED MODERATION — LIST
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all feed posts (paginated, filterable by removed status)
 * @route   GET /api/admin/posts
 * @access  Admin
 */
const getPosts = asyncHandler(async (req, res) => {
  const { removed, search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (removed === 'true') query.isRemoved = true;
  else if (removed === 'false') query.isRemoved = false;
  // default: return all (both removed and active)

  if (search) {
    query.content = { $regex: search, $options: 'i' };
  }

  const [posts, total] = await Promise.all([
    FeedPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('authorId', 'name username avatar')
      .populate('removedBy', 'name'),
    FeedPost.countDocuments(query),
  ]);

  ApiResponse.paginated(res, posts, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// ══════════════════════════════════════════════════════
// SOS HISTORY
// ══════════════════════════════════════════════════════

/**
 * @desc    Get paginated SOS alert history (all statuses)
 * @route   GET /api/admin/sos/history
 * @access  Admin
 */
const getSOSHistory = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, from, to } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const [alerts, total] = await Promise.all([
    SOSAlert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('userId', 'name phone avatar'),
    SOSAlert.countDocuments(query),
  ]);

  ApiResponse.paginated(res, alerts, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// ══════════════════════════════════════════════════════
// INCIDENTS OVERSIGHT
// ══════════════════════════════════════════════════════

/**
 * @desc    Get all incidents across all organizations (paginated, filterable)
 * @route   GET /api/admin/incidents
 * @access  Admin
 */
const getAllIncidents = asyncHandler(async (req, res) => {
  const { status, type, orgId, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (type && type !== 'all') query.type = type;
  if (orgId) query.organizationId = orgId;

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('organizationId', 'name type')
      .populate('userId', 'name phone avatar'),
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
 * @desc    Get single incident detail (admin view)
 * @route   GET /api/admin/incidents/:id
 * @access  Admin
 */
const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate('organizationId', 'name type phone address')
    .populate('userId', 'name phone avatar')
    .populate('assignedUnitId', 'unitName type status')
    .populate('assignedStaffId', 'name role');
  if (!incident) throw ApiError.notFound('Incident not found');
  ApiResponse.ok(res, { incident });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  getPendingOrgs,
  getAllOrganizations,
  getOrganizationById,
  approveOrganization,
  rejectOrganization,
  removePost,
  restorePost,
  removeComment,
  getPosts,
  getActiveSOS,
  adminResolveSOS,
  getSOSHistory,
  getAnalytics,
  // Community
  getCommunityAlerts,
  getCommunityAlertById,
  adminResolveCommunityAlert,
  adminCancelCommunityAlert,
  getCommunityResponders,
  verifyCommunityResponder,
  deleteCommunityResponder,
  getCommunityStats,
  // Incidents
  getAllIncidents,
  getIncidentById,
};
