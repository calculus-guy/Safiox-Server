const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', notifController.getNotifications);
router.get('/unread-count', notifController.getUnreadCount);
router.put('/read-all', notifController.markAllAsRead);
router.put('/:id/read', notifController.markAsRead);
router.delete('/:id', notifController.deleteNotification);

module.exports = router;
