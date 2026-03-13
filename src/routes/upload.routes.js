const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/signature', uploadController.getUploadSignature);
router.delete('/', uploadController.deleteUpload);

module.exports = router;
