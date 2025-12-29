const express = require('express');
const { 
  getUserProgress,
  getLeaderboards,
  getUserBadges,
  getAchievements,
  addXP,
  trackActivity,
  getUserStats,
  updateReputation,
  getPlatformStats
} = require('../controllers/gamificationController');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const router = express.Router();

// Protected routes (require authentication)
router.get('/progress', authenticateToken, getUserProgress);
router.get('/leaderboards', authenticateToken, getLeaderboards);
router.get('/badges', authenticateToken, getUserBadges);
router.get('/achievements', authenticateToken, getAchievements);
router.post('/activity', authenticateToken, trackActivity);
router.get('/stats', authenticateToken, getUserStats);
router.post('/xp', authenticateToken, addXP);
router.post('/reputation', authenticateToken, updateReputation);

// Admin routes
router.get('/platform/stats', authenticateToken, requireAdmin, getPlatformStats);

module.exports = router;