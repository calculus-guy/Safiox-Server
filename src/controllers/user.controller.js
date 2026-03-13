const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, { user: user.toSafeObject() });
});

/**
 * @desc    Update user profile (name, phone, avatar)
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  ApiResponse.ok(res, { user: user.toSafeObject() }, 'Profile updated');
});

/**
 * @desc    Update safety status (safe/unsafe)
 * @route   PUT /api/users/status
 * @access  Private
 */
const updateStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { status: req.body.status },
    { new: true }
  );
  ApiResponse.ok(res, { status: user.status }, 'Status updated');
});

/**
 * @desc    Get user settings
 * @route   GET /api/users/settings
 * @access  Private
 */
const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('settings sosSettings fakeCallConfig');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, {
    settings: user.settings,
    sosSettings: user.sosSettings,
    fakeCallConfig: user.fakeCallConfig,
  });
});

/**
 * @desc    Update general settings
 * @route   PUT /api/users/settings
 * @access  Private
 */
const updateSettings = asyncHandler(async (req, res) => {
  const updateFields = {};
  for (const [key, value] of Object.entries(req.body)) {
    updateFields[`settings.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true }
  ).select('settings');
  ApiResponse.ok(res, { settings: user.settings }, 'Settings updated');
});

/**
 * @desc    Get SOS settings
 * @route   GET /api/sos/settings
 * @access  Private
 */
const getSOSSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('sosSettings fakeCallConfig');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, {
    sosSettings: user.sosSettings,
    fakeCallConfig: user.fakeCallConfig,
  });
});

/**
 * @desc    Update SOS settings
 * @route   PUT /api/sos/settings
 * @access  Private
 */
const updateSOSSettings = asyncHandler(async (req, res) => {
  const updateFields = {};
  for (const [key, value] of Object.entries(req.body)) {
    updateFields[`sosSettings.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true }
  ).select('sosSettings');
  ApiResponse.ok(res, { sosSettings: user.sosSettings }, 'SOS settings updated');
});

/**
 * @desc    Update fake call config
 * @route   PUT /api/users/fake-call-config
 * @access  Private
 */
const updateFakeCallConfig = asyncHandler(async (req, res) => {
  const updateFields = {};
  for (const [key, value] of Object.entries(req.body)) {
    updateFields[`fakeCallConfig.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true }
  ).select('fakeCallConfig');
  ApiResponse.ok(res, { fakeCallConfig: user.fakeCallConfig }, 'Fake call config updated');
});

/**
 * @desc    Get notification settings
 * @route   GET /api/users/notification-settings
 * @access  Private
 */
const getNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    'settings.pushNotifications settings.emergencyAlerts settings.nearbyIncidents settings.safeZoneNotifications settings.systemUpdates'
  );
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, {
    pushNotifications: user.settings.pushNotifications,
    emergencyAlerts: user.settings.emergencyAlerts,
    nearbyIncidents: user.settings.nearbyIncidents,
    safeZoneNotifications: user.settings.safeZoneNotifications,
    systemUpdates: user.settings.systemUpdates,
  });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/notification-settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const updateFields = {};
  for (const [key, value] of Object.entries(req.body)) {
    updateFields[`settings.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true }
  ).select('settings');
  ApiResponse.ok(res, {
    pushNotifications: user.settings.pushNotifications,
    emergencyAlerts: user.settings.emergencyAlerts,
    nearbyIncidents: user.settings.nearbyIncidents,
    safeZoneNotifications: user.settings.safeZoneNotifications,
    systemUpdates: user.settings.systemUpdates,
  }, 'Notification settings updated');
});

/**
 * @desc    Update device push token
 * @route   PUT /api/users/device-token
 * @access  Private
 */
const updateDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { deviceTokens: token },
  });
  ApiResponse.ok(res, null, 'Device token registered');
});

/**
 * @desc    Remove device push token (on logout from specific device)
 * @route   DELETE /api/users/device-token
 * @access  Private
 */
const removeDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { deviceTokens: token },
  });
  ApiResponse.ok(res, null, 'Device token removed');
});

module.exports = {
  getProfile,
  updateProfile,
  updateStatus,
  getSettings,
  updateSettings,
  getSOSSettings,
  updateSOSSettings,
  updateFakeCallConfig,
  getNotificationSettings,
  updateNotificationSettings,
  updateDeviceToken,
  removeDeviceToken,
};
