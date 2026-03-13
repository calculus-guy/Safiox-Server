const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const SOSService = require('../services/sos.service');

/**
 * @desc    Trigger SOS alert
 * @route   POST /api/sos/trigger
 * @access  Private
 */
const trigger = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await SOSService.trigger(req.user.id, req.body, io);
  ApiResponse.created(res, result, 'SOS alert triggered');
});

/**
 * @desc    Get user's active SOS alert
 * @route   GET /api/sos/active
 * @access  Private
 */
const getActive = asyncHandler(async (req, res) => {
  const alert = await SOSService.getActive(req.user.id);
  ApiResponse.ok(res, { alert });
});

/**
 * @desc    Escalate SOS to emergency contacts
 * @route   PUT /api/sos/:id/escalate
 * @access  Private
 */
const escalate = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await SOSService.escalate(req.params.id, req.user.id, io);
  ApiResponse.ok(res, result, 'SOS escalated to emergency contacts');
});

/**
 * @desc    Cancel SOS alert
 * @route   PUT /api/sos/:id/cancel
 * @access  Private
 */
const cancel = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await SOSService.cancel(req.params.id, req.user.id, io);
  ApiResponse.ok(res, result, 'SOS alert cancelled');
});

/**
 * @desc    Resolve SOS alert
 * @route   PUT /api/sos/:id/resolve
 * @access  Private
 */
const resolve = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await SOSService.resolve(req.params.id, req.user.id, 'user', io);
  ApiResponse.ok(res, result, 'SOS alert resolved');
});

/**
 * @desc    Update live location during SOS
 * @route   PUT /api/sos/:id/location
 * @access  Private
 */
const updateLocation = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await SOSService.updateLocation(req.params.id, req.user.id, req.body, io);
  ApiResponse.ok(res, result);
});

/**
 * @desc    Get SOS by public tracking token (no auth)
 * @route   GET /api/sos/track/:token
 * @access  Public
 */
const getByTrackingToken = asyncHandler(async (req, res) => {
  const result = await SOSService.getByTrackingToken(req.params.token);
  ApiResponse.ok(res, result);
});

/**
 * @desc    Get user's SOS history
 * @route   GET /api/sos/history
 * @access  Private
 */
const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const result = await SOSService.getHistory(req.user.id, page, limit);
  ApiResponse.paginated(res, result.alerts, result.pagination);
});

/**
 * @desc    Get SOS settings (delegated to user controller but placed here for route convenience)
 * @route   GET /api/sos/settings
 * @access  Private
 */
const getSettings = asyncHandler(async (req, res) => {
  const userController = require('./user.controller');
  return userController.getSOSSettings(req, res);
});

/**
 * @desc    Update SOS settings
 * @route   PUT /api/sos/settings
 * @access  Private
 */
const updateSettings = asyncHandler(async (req, res) => {
  const userController = require('./user.controller');
  return userController.updateSOSSettings(req, res);
});

module.exports = {
  trigger,
  getActive,
  escalate,
  cancel,
  resolve,
  updateLocation,
  getByTrackingToken,
  getHistory,
  getSettings,
  updateSettings,
};
