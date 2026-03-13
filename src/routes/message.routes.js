const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/conversations', messageController.getConversations);
router.get('/:userId', messageController.getMessages);
router.post('/:userId', messageController.sendMessage);

module.exports = router;
