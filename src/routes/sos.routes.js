const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { sosLimiter } = require('../middleware/rateLimiter.middleware');
const validate = require('../middleware/validate.middleware');
const { triggerSOSSchema, updateLocationSchema } = require('../validators/sos.validator');
const { updateSOSSettingsSchema } = require('../validators/user.validator');

// ── Public routes ──
router.get('/track/:token', sosController.getByTrackingToken);

// ── Protected routes ──
router.use(authenticateToken);

router.post('/trigger', sosLimiter, validate(triggerSOSSchema), sosController.trigger);
router.get('/active', sosController.getActive);
router.put('/:id/escalate', sosController.escalate);
router.put('/:id/cancel', sosController.cancel);
router.put('/:id/resolve', sosController.resolve);
router.put('/:id/location', validate(updateLocationSchema), sosController.updateLocation);
router.get('/history', sosController.getHistory);
router.get('/settings', sosController.getSettings);
router.put('/settings', validate(updateSOSSettingsSchema), sosController.updateSettings);

module.exports = router;
