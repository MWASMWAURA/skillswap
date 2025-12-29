const express = require('express');
const {
  getSkillRecommendations,
  getUserMatches,
  getPersonalityInsights
} = require('../controllers/recommendationController');
const { authenticateToken, optionalAuth } = require('../utils/auth');

const router = express.Router();

// All recommendation routes require authentication
router.use(authenticateToken);

// Skill recommendations
router.get('/skills', getSkillRecommendations);
router.get('/skills/:userId', optionalAuth, getSkillRecommendations);

// User matching for skill exchanges
router.get('/matches', getUserMatches);

// Personality insights
router.get('/personality/:userId', optionalAuth, getPersonalityInsights);

// Get user's recommendation feedback (for improving the algorithm)
router.post('/feedback', async (req, res) => {
  try {
    const { recommendationId, action, rating } = req.body;
    const userId = req.user.id;

    // Store feedback for improving recommendation algorithm
    // This would be used to train the recommendation model
    console.log(`Feedback from user ${userId}:`, { recommendationId, action, rating });

    res.json({ message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get personalized dashboard insights
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current activity and recommendations
    const [
      userData,
      skillRecommendations,
      userMatches
    ] = await Promise.all([
      req.app.get('prisma').user.findUnique({
        where: { id: userId },
        include: {
          skills: { take: 3, orderBy: { createdAt: 'desc' } },
          badges: { take: 5, orderBy: { earnedAt: 'desc' } },
          exchanges: { 
            take: 3, 
            orderBy: { createdAt: 'desc' },
            include: { skill: true }
          }
        }
      }),
      getSkillRecommendations({ query: { userId, limit: 5 } }),
      getUserMatches({ query: { userId, limit: 5 } })
    ]);

    res.json({
      userProfile: {
        name: userData.name,
        level: userData.level,
        xp: userData.xp,
        streak: userData.streak,
        personalityType: userData.personalityType
      },
      recentActivity: {
        skills: userData.skills,
        badges: userData.badges,
        exchanges: userData.exchanges
      },
      recommendations: {
        skills: skillRecommendations.recommendations || [],
        matches: userMatches.matches || []
      },
      insights: {
        nextLevelXP: req.app.get('gamificationService').getXPForNextLevel(userData.xp),
        completionRate: userData.exchanges.length > 0 ? 
          (userData.exchanges.filter(e => e.status === 'completed').length / userData.exchanges.length) * 100 : 0,
        recommendationEngagement: 85 // Would be calculated from actual data
      }
    });

  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({ error: 'Failed to get dashboard insights' });
  }
});

module.exports = router;