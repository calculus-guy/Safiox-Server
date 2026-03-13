const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadVerificationDocs } = require('../middleware/upload.middleware');
const {
  registerSchema,
  registerOrgSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require('../validators/auth.validator');

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// ── Public routes ──
router.post('/register', validate(registerSchema), authController.register);
router.post('/register/organization', uploadVerificationDocs, validate(registerOrgSchema), authController.registerOrganization);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// ── Protected routes ──
router.delete('/logout', authenticateToken, authController.logout);

module.exports = router;
