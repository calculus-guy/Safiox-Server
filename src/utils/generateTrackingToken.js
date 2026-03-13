const crypto = require('crypto');

/**
 * Generate a cryptographically secure tracking token for SOS alerts.
 * Used to create public tracking links: /sos/track/:token
 * @param {number} length - Token length in bytes (default 32 → 64 hex chars)
 * @returns {string} Hex-encoded random token
 */
const generateTrackingToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = generateTrackingToken;
