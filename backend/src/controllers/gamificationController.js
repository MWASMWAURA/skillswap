const { PrismaClient } = require('@prisma/client');
const GamificationService = require('../services/gamificationService');

const prisma = new PrismaClient();

// Get user progress (XP, level, streak, reputation)
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        streak: true,
        longestStreak: true,
        reputation: true,
        profilePhoto: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate XP needed for next level
    const xpForNextLevel = GamificationService.getXPForNextLevel(user.xp);
    const currentLevelXP = user.xp;
    
    // Get recent achievements
    const recentBadges = await prisma.badge.findMany({
      where: { userId: userId },
      orderBy: { earnedAt: 'desc' },
      take: 5
    });

    res.json({
      level: user.level,
      currentXP: user.xp,
      nextLevelXP: xpForNextLevel,
      xp: user.xp,
      streak: user.streak,
      longestStreak: user.longestStreak,
      reputation: user.reputation,
      profilePhoto: user.profilePhoto,
      recentBadges
    });

  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Failed to get user progress' });
  }
};

// Get leaderboards
const getLeaderboards = async (req, res) => {
  try {
    const { type = 'all', timeframe = 'all' } = req.query;
    
    const leaderboards = await GamificationService.getLeaderboards(type);
    
    res.json({
      leaderboards,
      timeframe,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Get leaderboards error:', error);
    res.status(500).json({ error: 'Failed to get leaderboards' });
  }
};

// Get user badges/achievements
const getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const badges = await prisma.badge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' }
    });

    // Group badges by category
    const badgesByCategory = badges.reduce((acc, badge) => {
      if (!acc[badge.badgeType]) {
        acc[badge.badgeType] = [];
      }
      acc[badge.badgeType].push(badge);
      return acc;
    }, {});

    // Get achievements with progress
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      badges,
      badgesByCategory,
      achievements,
      totalBadges: badges.length
    });

  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({ error: 'Failed to get user badges' });
  }
};

// Get all available achievements
const getAchievements = async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    // Get user's progress on each achievement
    const userId = req.user.id;
    const userProgress = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });

    const achievementsWithProgress = achievements.map(achievement => {
      const progress = userProgress.find(p => p.achievementId === achievement.id);
      return {
        ...achievement,
        userProgress: progress ? {
          progress: progress.progress,
          completed: progress.completed,
          completedAt: progress.completedAt
        } : {
          progress: 0,
          completed: false,
          completedAt: null
        }
      };
    });

    res.json({
      achievements: achievementsWithProgress,
      totalAvailable: achievements.length
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};

// Add XP (for testing or admin use)
const addXP = async (req, res) => {
  try {
    const { action, customXP, userId } = req.body;
    const targetUserId = userId || req.user.id;
    
    const result = await GamificationService.addXP(targetUserId, action, customXP);
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: targetUserId,
        action: `xp_added_${action}`,
        resource: 'user',
        resourceId: targetUserId,
        metadata: { action, customXP, result }
      }
    });

    res.json({
      message: 'XP added successfully',
      result
    });

  } catch (error) {
    console.error('Add XP error:', error);
    res.status(500).json({ error: 'Failed to add XP' });
  }
};

// Track user activity (for login, daily activities)
const trackActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Track activity
    const result = await GamificationService.trackUserActivity(userId);
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'daily_activity',
        resource: 'user',
        resourceId: userId,
        metadata: result
      }
    });

    // Award daily active bonus
    await GamificationService.addXP(userId, 'DAILY_ACTIVE');
    
    res.json({
      message: 'Activity tracked successfully',
      streak: result.streak,
      longestStreak: result.longestStreak
    });

  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await GamificationService.getUserStats(userId);
    
    res.json(stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
};

// Calculate and update reputation
const updateReputation = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const reputation = await GamificationService.calculateReputation(userId);
    
    await prisma.user.update({
      where: { id: userId },
      data: { reputation }
    });

    res.json({
      message: 'Reputation updated',
      reputation
    });

  } catch (error) {
    console.error('Update reputation error:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
};

// Get platform statistics (for admin)
const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalSkills,
      completedExchanges,
      totalBadges
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActivity: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.skill.count(),
      prisma.exchange.count({ where: { status: 'completed' } }),
      prisma.badge.count()
    ]);

    // Get average stats
    const avgStats = await prisma.user.aggregate({
      _avg: {
        xp: true,
        level: true,
        reputation: true,
        streak: true
      }
    });

    res.json({
      totalUsers,
      activeUsers,
      totalSkills,
      completedExchanges,
      totalBadges,
      averageStats: avgStats._avg,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: 'Failed to get platform statistics' });
  }
};

module.exports = {
  getUserProgress,
  getLeaderboards,
  getUserBadges,
  getAchievements,
  addXP,
  trackActivity,
  getUserStats,
  updateReputation,
  getPlatformStats
};