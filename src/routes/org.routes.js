const express = require('express');
const router = express.Router();
const orgController = require('../controllers/org.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  incidentQuerySchema,
  updateIncidentStatusSchema,
  dispatchUnitSchema,
  createStaffSchema,
  updateStaffSchema,
  createUnitSchema,
  updateUnitSchema,
  unitQuerySchema,
  broadcastSchema,
  updateOrgProfileSchema,
} = require('../validators/org.validator');

// All routes require auth + organization role
router.use(authenticateToken, authorizeRole('organization', 'admin'));

// ── Incidents ──
router.get('/incidents', validate(incidentQuerySchema, 'query'), orgController.getIncidents);
router.get('/incidents/:id', orgController.getIncidentById);
router.put('/incidents/:id/status', validate(updateIncidentStatusSchema), orgController.updateIncidentStatus);
router.put('/incidents/:id/dispatch', validate(dispatchUnitSchema), orgController.dispatchUnit);

// ── Staff ──
router.get('/staff', orgController.getStaff);
router.post('/staff', validate(createStaffSchema), orgController.addStaff);
router.put('/staff/:id', validate(updateStaffSchema), orgController.updateStaff);
router.delete('/staff/:id', orgController.deleteStaff);

// ── Fleet Units ──
router.get('/units', validate(unitQuerySchema, 'query'), orgController.getUnits);
router.post('/units', validate(createUnitSchema), orgController.addUnit);
router.put('/units/:id', validate(updateUnitSchema), orgController.updateUnit);
router.delete('/units/:id', orgController.deleteUnit);

// ── Profile & Stats ──
router.get('/profile', orgController.getProfile);
router.put('/profile', validate(updateOrgProfileSchema), orgController.updateProfile);
router.get('/stats', orgController.getStats);

// ── Broadcast ──
router.post('/broadcast', validate(broadcastSchema), orgController.sendBroadcast);

module.exports = router;
