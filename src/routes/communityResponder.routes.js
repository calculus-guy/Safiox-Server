const express = require('express');
const router = express.Router();
const crController = require('../controllers/communityResponder.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  registerResponderSchema,
  createAlertSchema,
  updateResponderStatusSchema,
  sendMessageSchema,
} = require('../validators/communityResponder.validator');

router.use(authenticateToken);

// ── Responder management ──
router.post('/register', validate(registerResponderSchema), crController.register);
router.get('/profile', crController.getProfile);
router.put('/availability', crController.toggleAvailability);
router.put('/location', crController.updateLocation);
router.get('/nearby', crController.getNearby);

// ── Alerts ──
router.post('/alert', validate(createAlertSchema), crController.createAlert);
router.get('/alert/active', crController.getActiveAlert);
router.get('/alert/:id', crController.getAlertById);
router.put('/alert/:id/respond', validate(updateResponderStatusSchema), crController.respondToAlert);
router.put('/alert/:id/complete', crController.completeAlert);
router.put('/alert/:id/cancel', crController.cancelAlert);

// ── Group chat ──
router.get('/session/:id/messages', crController.getMessages);
router.post('/session/:id/messages', validate(sendMessageSchema), crController.sendMessage);

// ── History ──
router.get('/history', crController.getHistory);

module.exports = router;
