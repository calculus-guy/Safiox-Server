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
 * @desc    Approve organization
 * @route   PUT /api/admin/organizations/:id/approve
 * @access  Admin
 */
const approveOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { verificationStatus: 'verified' },
    { new: true }
  );
  if (!org) throw ApiError.notFound('Organization not found');

  try {
    await EmailService.sendOrgApprovalEmail(org);
  } catch (err) {
    console.error('Failed to send org approval email:', err.message);
  }

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
    { verificationStatus: 'rejected', verificationRejectionReason: reason || '' },
    { new: true }
  );
  if (!org) throw ApiError.notFound('Organization not found');
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
  ] = await Promise.all([
    User.countDocuments({ role: 'individual' }),
    Organization.countDocuments(),
    Organization.countDocuments({ verificationStatus: 'verified' }),
    Organization.countDocuments({ verificationStatus: 'pending' }),
    FeedPost.countDocuments({ isRemoved: { $ne: true } }),
    Incident.countDocuments(),
    SOSAlert.countDocuments({ status: { $in: ['active', 'escalated'] } }),
    SOSAlert.countDocuments({ status: 'resolved' }),
  ]);

  // New users in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

  ApiResponse.ok(res, {
    analytics: {
      users: { total: totalUsers, newThisWeek: newUsersThisWeek },
      organizations: { total: totalOrgs, verified: verifiedOrgs, pending: pendingOrgs },
      feed: { totalPosts },
      incidents: { total: totalIncidents },
      sos: { active: activeSOS, resolved: resolvedSOS },
    },
  });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  getPendingOrgs,
  getAllOrganizations,
  approveOrganization,
  rejectOrganization,
  removePost,
  restorePost,
  removeComment,
  getActiveSOS,
  adminResolveSOS,
  getAnalytics,
};
