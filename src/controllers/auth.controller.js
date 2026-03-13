const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const AuthService = require('../services/auth.service');

/**
 * @desc    Register individual user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  ApiResponse.created(res, result, 'Registration successful');
});

/**
 * @desc    Register organization (multi-step)
 * @route   POST /api/auth/register/organization
 * @access  Public
 */
const registerOrganization = asyncHandler(async (req, res) => {
  const result = await AuthService.registerOrganization(req.body, req.files);
  ApiResponse.created(res, result, 'Organization registration submitted');
});

/**
 * @desc    Login with email + password
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body);
  ApiResponse.ok(res, result, 'Login successful');
});

/**
 * @desc    Google SSO authentication
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = asyncHandler(async (req, res) => {
  const result = await AuthService.googleAuth(req.body);
  ApiResponse.ok(res, result, 'Google authentication successful');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  ApiResponse.ok(res, result, 'Token refreshed');
});

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  ApiResponse.ok(res, result);
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body.token, req.body.password);
  ApiResponse.ok(res, result);
});

/**
 * @desc    Verify email with token
 * @route   POST /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyEmail(req.params.token);
  ApiResponse.ok(res, result);
});

/**
 * @desc    Logout — invalidate refresh token
 * @route   DELETE /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const result = await AuthService.logout(req.user.id);
  ApiResponse.ok(res, result);
});

module.exports = {
  register,
  registerOrganization,
  login,
  googleAuth,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout,
};
