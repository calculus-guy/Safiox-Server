const jwt = require('jsonwebtoken');

/**
 * Generate an access token (short-lived).
 * @param {Object} payload - { id, role, email }
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

/**
 * Generate a refresh token (long-lived).
 * @param {Object} payload - { id }
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

/**
 * Generate both access and refresh tokens for a user.
 * @param {Object} user - Mongoose user document
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokenPair = (user) => {
  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user._id,
  });

  return { accessToken, refreshToken };
};

module.exports = { generateAccessToken, generateRefreshToken, generateTokenPair };
