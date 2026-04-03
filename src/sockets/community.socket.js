const CommunityAlert = require('../models/CommunityAlert');
const CommunityMessage = require('../models/CommunityMessage');
const User = require('../models/User');

/**
 * Community Responder WebSocket event handlers.
 * Room naming: community_alert_{alertId}  (matches frontend socketService)
 */
module.exports = (io) => {
  return {
    register(socket) {
      const userId = socket.userId;

      // ── Join community alert room ──
      socket.on('community:join', async ({ alertId }) => {
        try {
          const alert = await CommunityAlert.findById(alertId);
          if (!alert) return socket.emit('community:error', { message: 'Alert not found' });

          socket.join(`community_alert_${alertId}`);
          socket.emit('community:joined', { alertId, status: alert.status });
        } catch {
          socket.emit('community:error', { message: 'Failed to join alert room' });
        }
      });

      // ── Leave community alert room ──
      socket.on('community:leave', ({ alertId }) => {
        socket.leave(`community_alert_${alertId}`);
      });

      // ── Send message via socket (alternative to REST) ──
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

          io.to(`community_alert_${alertId}`).emit('community:message', { alertId, message });
        } catch {
          socket.emit('community:error', { message: 'Failed to send message' });
        }
      });

      // ── Typing indicators ──
      socket.on('community:typing', ({ alertId }) => {
        socket.to(`community_alert_${alertId}`).emit('community:typing', { userId, alertId });
      });

      socket.on('community:stop-typing', ({ alertId }) => {
        socket.to(`community_alert_${alertId}`).emit('community:stop-typing', { userId, alertId });
      });

      // ── Live responder location broadcast ──
      socket.on('community:responder-location', ({ alertId, latitude, longitude }) => {
        io.to(`community_alert_${alertId}`).emit('community:responder-location', {
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
