const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Notification = require('../models/Notification');

/**
 * @desc    Get notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 30;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ userId: req.user.id }),
    Notification.countDocuments({ userId: req.user.id, read: false }),
  ]);

  ApiResponse.paginated(res, notifications, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    unreadCount,
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) return ApiResponse.ok(res, null, 'Notification not found');
  ApiResponse.ok(res, { notification }, 'Marked as read');
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user.id, read: false },
    { read: true, readAt: new Date() }
  );
  ApiResponse.ok(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
});

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, read: false });
  ApiResponse.ok(res, { unreadCount: count });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  ApiResponse.ok(res, null, 'Notification deleted');
});

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount, deleteNotification };
