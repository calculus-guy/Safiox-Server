const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateProfileSchema,
  updateStatusSchema,
  updateSettingsSchema,
  updateSOSSettingsSchema,
  updateFakeCallConfigSchema,
  updateNotificationSettingsSchema,
  updateDeviceTokenSchema,
} = require('../validators/user.validator');

// All user routes require authentication
router.use(authenticateToken);

// ── Profile ──
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.get('/:userId/profile', userController.getUserProfile);

// ── Safety status ──
router.put('/status', validate(updateStatusSchema), userController.updateStatus);

// ── Settings ──
router.get('/settings', userController.getSettings);
router.put('/settings', validate(updateSettingsSchema), userController.updateSettings);

// ── SOS Settings ──
router.get('/sos-settings', userController.getSOSSettings);
router.put('/sos-settings', validate(updateSOSSettingsSchema), userController.updateSOSSettings);

// ── Fake call config ──
router.put('/fake-call-config', validate(updateFakeCallConfigSchema), userController.updateFakeCallConfig);

// ── Notification settings ──
router.get('/notification-settings', userController.getNotificationSettings);
router.put('/notification-settings', validate(updateNotificationSettingsSchema), userController.updateNotificationSettings);

// ── Device tokens ──
router.put('/device-token', validate(updateDeviceTokenSchema), userController.updateDeviceToken);
router.delete('/device-token', validate(updateDeviceTokenSchema), userController.removeDeviceToken);

module.exports = router;
