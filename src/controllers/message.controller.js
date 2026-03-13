const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Build a deterministic conversation key from two user IDs.
 */
const buildConversationKey = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

/**
 * @desc    Get list of conversations for current user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  // Get all unique conversation keys that involve this user
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: req.user.id }, { receiverId: req.user.id }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: '$conversationKey',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', req.user.id] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  // Populate the other user's info
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId =
        conv.lastMessage.senderId.toString() === req.user.id
          ? conv.lastMessage.receiverId
          : conv.lastMessage.senderId;
      const otherUser = await User.findById(otherUserId).select('name avatar');
      return {
        conversationKey: conv._id,
        otherUser,
        lastMessage: {
          content: conv.lastMessage.content,
          mediaType: conv.lastMessage.mediaType,
          createdAt: conv.lastMessage.createdAt,
          isFromMe: conv.lastMessage.senderId.toString() === req.user.id,
        },
        unreadCount: conv.unreadCount,
      };
    })
  );

  ApiResponse.ok(res, { conversations: enriched });
});

/**
 * @desc    Get messages with a specific user
 * @route   GET /api/messages/:userId
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const conversationKey = buildConversationKey(req.user.id, req.params.userId);
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationKey })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversationKey }),
  ]);

  // Mark messages from other user as read
  await Message.updateMany(
    { conversationKey, receiverId: req.user.id, read: false },
    { read: true, readAt: new Date() }
  );

  ApiResponse.paginated(res, messages.reverse(), { page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @desc    Send a message
 * @route   POST /api/messages/:userId
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const receiverId = req.params.userId;
  if (receiverId === req.user.id) throw ApiError.badRequest('Cannot message yourself');

  const receiver = await User.findById(receiverId);
  if (!receiver) throw ApiError.notFound('User not found');

  const conversationKey = buildConversationKey(req.user.id, receiverId);

  const message = await Message.create({
    conversationKey,
    senderId: req.user.id,
    receiverId,
    content: req.body.content || '',
    mediaUrl: req.body.mediaUrl || '',
    mediaType: req.body.mediaType || 'text',
  });

  // Send push + in-app notification
  const sender = await User.findById(req.user.id).select('name');
  await Notification.create({
    userId: receiverId,
    type: 'message',
    title: `New message from ${sender.name}`,
    body: req.body.content ? req.body.content.substring(0, 100) : 'Voice message',
    data: { userId: req.user.id, conversationKey },
  });

  // Real-time delivery
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${receiverId}`).emit('message:new', {
      conversationKey,
      message,
      senderName: sender.name,
    });
  }

  ApiResponse.created(res, { message }, 'Message sent');
});

module.exports = { getConversations, getMessages, sendMessage };
