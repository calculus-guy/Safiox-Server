const CommunityAlert = require('../models/CommunityAlert');
const CommunityMessage = require('../models/CommunityMessage');
const User = require('../models/User');

/**
 * Community Responder WebSocket event handlers.
 * Handles real-time group chat, responder updates, and alert events.
 */
module.exports = (io) => {
  return {
    register(socket) {
      const userId = socket.userId;

      // ── Join community alert room ──
      socket.on('community:join', async ({ alertId }) => {
        try {
          const alert = await CommunityAlert.findById(alertId);
          if (!alert) {
            return socket.emit('community:error', { message: 'Alert not found' });
          }

          socket.join(`community:${alertId}`);
          socket.emit('community:joined', { alertId, status: alert.status });
        } catch (err) {
          socket.emit('community:error', { message: 'Failed to join alert room' });
        }
      });

      // ── Leave community alert room ──
      socket.on('community:leave', ({ alertId }) => {
        socket.leave(`community:${alertId}`);
      });

      // ── Send message in community group chat ──
      socket.on('community:send-message', async ({ alertId, text, mediaUrl, type }) => {
        try {
          const user = await User.findById(userId).select('name');

          const message = await CommunityMessage.create({
            communityAlertId: alertId,
            senderId: userId,
            senderName: user.name,
            text: text || '',
            mediaUrl: mediaUrl || '',
            type: type || 'text',
          });

          // Broadcast to all participants in the alert room
          io.to(`community:${alertId}`).emit('community:message', {
            alertId,
            message,
          });
        } catch (err) {
          socket.emit('community:error', { message: 'Failed to send message' });
        }
      });

      // ── Typing indicator ──
      socket.on('community:typing', ({ alertId }) => {
        socket.to(`community:${alertId}`).emit('community:typing', {
          userId,
          alertId,
        });
      });

      // ── Stop typing ──
      socket.on('community:stop-typing', ({ alertId }) => {
        socket.to(`community:${alertId}`).emit('community:stop-typing', {
          userId,
          alertId,
        });
      });

      // ── Responder location update ──
      socket.on('community:responder-location', ({ alertId, latitude, longitude }) => {
        io.to(`community:${alertId}`).emit('community:responder-location', {
          alertId,
          responderId: userId,
          latitude,
          longitude,
          timestamp: new Date(),
        });
      });
    },
  };
};
