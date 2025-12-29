const express = require('express');
const {
  getDashboardStats,
  getUsers,
  getUserDetails,
  toggleUserBan,
  updateUserRole,
  getReports,
  reviewReport,
  getSkillReports,
  moderateSkill,
  getActivityLogs,
  bulkUserOperations,
  bulkSkillOperations,
  bulkReportOperations,
  bulkSendNotifications
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard and statistics
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/ban', toggleUserBan);
router.patch('/users/:userId/role', updateUserRole);

// Reports and moderation
router.get('/reports', getReports);
router.patch('/reports/:reportId', reviewReport);
router.get('/skills/:skillId/reports', getSkillReports);
router.patch('/skills/:skillId/moderate', moderateSkill);

// Activity logs
router.get('/activity-logs', getActivityLogs);

// Bulk operations
router.post('/bulk/users', bulkUserOperations);
router.post('/bulk/skills', bulkSkillOperations);
router.post('/bulk/reports', bulkReportOperations);
router.post('/bulk/notifications', bulkSendNotifications);

module.exports = router;