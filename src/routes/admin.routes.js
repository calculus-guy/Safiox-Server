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
router.get('/posts', adminController.getPosts);
router.put('/posts/:id/remove', adminController.removePost);
router.put('/posts/:id/restore', adminController.restorePost);
router.put('/comments/:id/remove', adminController.removeComment);

// ── SOS Management ──
router.get('/sos/active', adminController.getActiveSOS);
router.get('/sos/history', adminController.getSOSHistory);
router.put('/sos/:id/resolve', adminController.adminResolveSOS);

// ── Incidents Oversight ──
router.get('/incidents', adminController.getAllIncidents);
router.get('/incidents/:id', adminController.getIncidentById);

// ── Community Responders ──
router.get('/community/stats', adminController.getCommunityStats);
router.get('/community/alerts', adminController.getCommunityAlerts);
router.get('/community/alerts/:id', adminController.getCommunityAlertById);
router.put('/community/alerts/:id/resolve', adminController.adminResolveCommunityAlert);
router.put('/community/alerts/:id/cancel', adminController.adminCancelCommunityAlert);
router.get('/community/responders', adminController.getCommunityResponders);
router.put('/community/responders/:id/verify', adminController.verifyCommunityResponder);
router.delete('/community/responders/:id', adminController.deleteCommunityResponder);

// ── Analytics ──
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
