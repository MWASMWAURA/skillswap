const express = require('express');
const {
  advancedSearch,
  discoverUsers,
  getSimilarSkills,
  getTrendingSkills,
  verifySkill,
  getSearchAnalytics
} = require('../controllers/searchController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../utils/auth');

const router = express.Router();

// Public search routes (don't require authentication)
router.get('/skills', advancedSearch);
router.get('/users', discoverUsers);
router.get('/skills/:skillId/similar', optionalAuth, getSimilarSkills);
router.get('/trending', getTrendingSkills);

// Protected search routes
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const history = await prisma.searchHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json({ history });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// Admin-only routes
router.post('/skills/:skillId/verify', authenticateToken, requireAdmin, verifySkill);
router.get('/analytics', authenticateToken, requireAdmin, getSearchAnalytics);

module.exports = router;