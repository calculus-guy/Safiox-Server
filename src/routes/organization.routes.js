const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organization.controller');
const validate = require('../middleware/validate.middleware');
const { nearbyOrgsQuery } = require('../validators/org.validator');

// All public routes — no auth required
router.get('/', validate(nearbyOrgsQuery, 'query'), orgController.getNearbyOrganizations);
router.get('/:id', orgController.getOrganizationById);

module.exports = router;
