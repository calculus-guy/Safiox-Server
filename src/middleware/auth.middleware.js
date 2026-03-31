const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Authenticate JWT access token from Authorization header.
 * Attaches req.user = { id, role, email }
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is not deactivated
    const user = await User.findById(decoded.id).select('_id role email isDeactivated');
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }
    if (user.isDeactivated) {
      throw ApiError.unauthorized('Account has been deactivated');
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error); // handled by errorHandler middleware
    }
    next(error);
  }
};

/**
 * Authorize by role(s).
 * Usage: authorizeRole('admin') or authorizeRole('personal', 'admin')
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
