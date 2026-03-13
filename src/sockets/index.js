const sosSocket = require('./sos.socket');
const communitySocket = require('./community.socket');
const chatSocket = require('./chat.socket');
const orgSocket = require('./org.socket');

/**
 * Register all WebSocket event handlers on a connected socket.
 * This is called from the Socket.IO connection handler in config/socket.js.
 *
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {SocketIO.Socket} socket - Connected client socket
 */
const registerSocketHandlers = (io, socket) => {
  const userId = socket.userId;

  // Auto-join user's personal room for targeted notifications
  socket.join(`user:${userId}`);

  console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

  // Register all domain-specific handlers
  sosSocket(io).register(socket);
  communitySocket(io).register(socket);
  chatSocket(io).register(socket);
  orgSocket(io).register(socket);

  // ── User location update (background) ──
  socket.on('user:location-update', async ({ latitude, longitude }) => {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        lastLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      });
    } catch (err) {
      // Silent fail — location updates are best-effort
    }
  });

  // ── Connection status ──
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);
  });
};

module.exports = registerSocketHandlers;
