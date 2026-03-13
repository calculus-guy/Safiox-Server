const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Initialize Socket.IO on the given HTTP server.
 * Returns the io instance for use in socket event handlers.
 */
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // ── JWT auth middleware for all socket connections ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role, email }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Attach userId for downstream handlers
    socket.userId = socket.user.id;

    // Register all domain-specific socket event handlers
    const registerSocketHandlers = require('../sockets');
    registerSocketHandlers(io, socket);
  });

  return io;
};

module.exports = initSocket;
