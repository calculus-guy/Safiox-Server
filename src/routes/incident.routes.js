const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { reportIncidentSchema } = require('../validators/incident.validator');

router.use(authenticateToken);

router.post('/report', validate(reportIncidentSchema), incidentController.reportIncident);
router.get('/my', incidentController.getMyIncidents);

module.exports = router;
