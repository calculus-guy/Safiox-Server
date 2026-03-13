const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createDeviceSchema, updateDeviceSchema } = require('../validators/device.validator');

router.use(authenticateToken);

router.get('/', deviceController.getDevices);
router.get('/:id', deviceController.getDeviceById);
router.post('/', validate(createDeviceSchema), deviceController.addDevice);
router.put('/:id', validate(updateDeviceSchema), deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;
