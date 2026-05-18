const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Signature is public — it only returns a time-limited Cloudinary signing token.
// No sensitive data is exposed. Required to be public for pre-auth uploads (e.g. org registration docs).
router.get('/signature', uploadController.getUploadSignature);

// Delete requires auth — only authenticated users should be able to remove assets.
router.delete('/', authenticateToken, uploadController.deleteUpload);

module.exports = router;
