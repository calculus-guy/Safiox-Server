const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// All admin routes require auth + admin role
router.use(authenticateToken, authorizeRole('admin'));

// ── Users ──
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/deactivate', adminController.deactivateUser);
router.put('/users/:id/reactivate', adminController.reactivateUser);

// ── Organizations ──
router.get('/organizations', adminController.getAllOrganizations);
router.get('/organizations/pending', adminController.getPendingOrgs);
router.put('/organizations/:id/approve', adminController.approveOrganization);
router.put('/organizations/:id/reject', adminController.rejectOrganization);

// ── Content Moderation ──
router.put('/posts/:id/remove', adminController.removePost);
router.put('/posts/:id/restore', adminController.restorePost);
router.put('/comments/:id/remove', adminController.removeComment);

// ── SOS Management ──
router.get('/sos/active', adminController.getActiveSOS);
router.put('/sos/:id/resolve', adminController.adminResolveSOS);

// ── Analytics ──
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
