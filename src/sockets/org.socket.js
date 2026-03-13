/**
 * Organization Dashboard WebSocket event handlers.
 * Handles real-time incident updates and unit tracking.
 */
module.exports = (io) => {
  return {
    register(socket) {
      const userId = socket.userId;

      // ── Join org dashboard room ──
      socket.on('org:join', ({ orgId }) => {
        socket.join(`org:${orgId}`);
        socket.emit('org:joined', { orgId });
      });

      // ── Leave org dashboard room ──
      socket.on('org:leave', ({ orgId }) => {
        socket.leave(`org:${orgId}`);
      });

      // ── Fleet unit location update ──
      socket.on('org:unit-location', ({ orgId, unitId, latitude, longitude }) => {
        io.to(`org:${orgId}`).emit('org:unit-location', {
          unitId,
          latitude,
          longitude,
          timestamp: new Date(),
        });
      });

      // ── Staff status update ──
      socket.on('org:staff-status', ({ orgId, staffId, status }) => {
        io.to(`org:${orgId}`).emit('org:staff-status', {
          staffId,
          status,
          timestamp: new Date(),
        });
      });
    },
  };
};
