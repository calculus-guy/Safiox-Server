const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * 1-to-1 Chat WebSocket event handlers.
 * Handles real-time message delivery, typing, and read receipts.
 */
module.exports = (io) => {
  return {
    register(socket) {
      const userId = socket.userId;

      // ── Send DM via WebSocket (alternative to REST) ──
      socket.on('chat:send-message', async ({ receiverId, content, mediaUrl, mediaType }) => {
        try {
          const conversationKey = [userId, receiverId].sort().join('_');
          const sender = await User.findById(userId).select('name');

          const message = await Message.create({
            conversationKey,
            senderId: userId,
            receiverId,
            content: content || '',
            mediaUrl: mediaUrl || '',
            mediaType: mediaType || 'text',
          });

          // Deliver to receiver's personal room
          io.to(`user:${receiverId}`).emit('message:new', {
            conversationKey,
            message,
            senderName: sender.name,
          });

          // Confirm to sender
          socket.emit('message:sent', { message });

          // Create in-app notification
          await Notification.create({
            userId: receiverId,
            type: 'message',
            title: `New message from ${sender.name}`,
            body: content ? content.substring(0, 100) : 'Media message',
            data: { userId, conversationKey },
          });
        } catch (err) {
          socket.emit('chat:error', { message: 'Failed to send message' });
        }
      });

      // ── Typing indicator ──
      socket.on('chat:typing', ({ receiverId }) => {
        io.to(`user:${receiverId}`).emit('chat:typing', { userId });
      });

      // ── Stop typing ──
      socket.on('chat:stop-typing', ({ receiverId }) => {
        io.to(`user:${receiverId}`).emit('chat:stop-typing', { userId });
      });

      // ── Mark messages as read ──
      socket.on('chat:mark-read', async ({ conversationKey, senderId }) => {
        try {
          await Message.updateMany(
            { conversationKey, senderId, receiverId: userId, read: false },
            { read: true, readAt: new Date() }
          );

          // Notify sender that messages were read
          io.to(`user:${senderId}`).emit('chat:read', {
            conversationKey,
            readBy: userId,
            readAt: new Date(),
          });
        } catch (err) {
          console.error('Mark read error:', err.message);
        }
      });
    },
  };
};
