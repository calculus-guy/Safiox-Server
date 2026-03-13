/**
 * Wraps async route handlers so thrown errors are automatically
 * passed to Express error-handling middleware via next().
 *
 * Usage:
 *   router.get('/endpoint', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
