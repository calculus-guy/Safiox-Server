const SOSAlert = require('../models/SOSAlert');
const User = require('../models/User');

/**
 * SOS WebSocket event handlers.
 * Handles real-time location tracking and status updates during SOS.
 */
module.exports = (io) => {
  const sosNamespace = io; // using default namespace with room-based isolation

  // ── SOS Events (handled in the main connection) ──
  return {
    /**
     * Register SOS-related event handlers for a connected socket.
     */
    register(socket) {
      const userId = socket.userId;

      // ── Join SOS tracking room ──
      socket.on('sos:join-tracking', async ({ alertId, trackingToken }) => {
        try {
          const query = trackingToken
            ? { trackingToken }
            : { _id: alertId, status: { $in: ['active', 'escalated'] } };

          const alert = await SOSAlert.findOne(query);
          if (!alert) {
            return socket.emit('sos:error', { message: 'SOS alert not found' });
          }

          socket.join(`sos:${alert._id}`);
          socket.emit('sos:joined', {
            alertId: alert._id,
            status: alert.status,
            location: {
              latitude: alert.location.coordinates[1],
              longitude: alert.location.coordinates[0],
            },
          });
        } catch (err) {
          socket.emit('sos:error', { message: 'Failed to join tracking' });
        }
      });

      // ── Leave SOS tracking room ──
      socket.on('sos:leave-tracking', ({ alertId }) => {
        socket.leave(`sos:${alertId}`);
      });

      // ── Real-time location update from SOS user ──
      socket.on('sos:location-update', async ({ alertId, latitude, longitude }) => {
        try {
          const alert = await SOSAlert.findOne({
            _id: alertId,
            userId,
            status: { $in: ['active', 'escalated'] },
          });

          if (!alert) return;

          const coords = [longitude, latitude];
          alert.location.coordinates = coords;
          alert.locationHistory.push({ coordinates: coords, timestamp: new Date() });
          await alert.save();

          // Update user's last known location
          await User.findByIdAndUpdate(userId, {
            lastLocation: { type: 'Point', coordinates: coords },
          });

          // Broadcast to all trackers
          io.to(`sos:${alertId}`).emit('sos:location-update', {
            alertId,
            latitude,
            longitude,
            timestamp: new Date(),
          });
        } catch (err) {
          console.error('SOS location update error:', err.message);
        }
      });

      // ── SOS battery level update ──
      socket.on('sos:battery-update', ({ alertId, batteryLevel }) => {
        io.to(`sos:${alertId}`).emit('sos:battery-update', {
          alertId,
          batteryLevel,
          timestamp: new Date(),
        });
      });
    },
  };
};
