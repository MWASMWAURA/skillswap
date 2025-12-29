const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// XP and Level System Configuration
const XP_CONFIG = {
  BASE_XP_PER_LEVEL: 100,
  XP_MULTIPLIER: 1.2,
  MAX_LEVEL: 100,
  
  // XP rewards for different actions
  ACTIONS: {
    PROFILE_COMPLETE: 50,
    SKILL_CREATED: 25,
    EXCHANGE_REQUESTED: 10,
    EXCHANGE_COMPLETED: 100,
    REVIEW_GIVEN: 15,
    REVIEW_RECEIVED: 30,
    MESSAGE_SENT: 2,
    LOGIN_STREAK_BONUS: 5,
    DAILY_ACTIVE: 10,
    ACHIEVEMENT_UNLOCKED: 25
  }
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_STEPS: {
    name: "First Steps",
    description: "Complete your profile and create your first skill",
    category: "milestone",
    requirement: { type: "profile_complete", count: 1 },
    xpReward: 100,
    badgeType: "milestone",
    rarity: "common"
  },
  SKILL_MASTER: {
    name: "Skill Master",
    description: "Create 5 skills",
    category: "skill",
    requirement: { type: "skills_created", count: 5 },
    xpReward: 200,
    badgeType: "achievement",
    rarity: "rare"
  },
  SOCIAL_BUTTERFLY: {
    name: "Social Butterfly",
    description: "Complete 10 skill exchanges",
    category: "social",
    requirement: { type: "exchanges_completed", count: 10 },
    xpReward: 300,
    badgeType: "achievement",
    rarity: "epic"
  },
  CONSISTENT: {
    name: "Consistent",
    description: "Maintain a 7-day activity streak",
    category: "consistency",
    requirement: { type: "login_streak", count: 7 },
    xpReward: 150,
    badgeType: "milestone",
    rarity: "rare"
  }
};

class GamificationService {
  // Calculate level from XP
  static calculateLevel(xp) {
    if (xp <= 0) return 1;
    
    let level = 1;
    let remainingXP = xp;
    let xpForCurrentLevel = XP_CONFIG.BASE_XP_PER_LEVEL;
    
    while (level < XP_CONFIG.MAX_LEVEL && remainingXP >= xpForCurrentLevel) {
      remainingXP -= xpForCurrentLevel;
      level++;
      xpForCurrentLevel = Math.floor(xpForCurrentLevel * XP_CONFIG.XP_MULTIPLIER);
    }
    
    return level;
  }

  // Add XP to user and handle level up
  static async addXP(userId, action, customXP = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true }
      });

      if (!user) throw new Error('User not found');

      const xpToAdd = customXP || XP_CONFIG.ACTIONS[action] || 0;
      const newXP = user.xp + xpToAdd;
      const newLevel = this.calculateLevel(newXP);

      // Update user XP and level
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXP,
          level: newLevel,
          lastActivity: new Date()
        }
      });

      return {
        xpAdded: xpToAdd,
        newXP,
        newLevel,
        leveledUp: newLevel > user.level
      };

    } catch (error) {
      console.error('Add XP error:', error);
      throw error;
    }
  }

  // Handle user activity and streak tracking
  static async trackUserActivity(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          lastActivity: true, 
          streak: true, 
          longestStreak: true 
        }
      });

      if (!user) throw new Error('User not found');

      const today = new Date();
      const lastActivityDate = new Date(user.lastActivity);
      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));

      let newStreak = user.streak;
      let longestStreak = user.longestStreak;

      if (daysDiff === 0) {
        // Same day, no change to streak
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak++;
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
      }

      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          lastActivity: today,
          streak: newStreak,
          longestStreak: longestStreak
        }
      });

      return {
        streak: newStreak,
        longestStreak
      };

    } catch (error) {
      console.error('Track activity error:', error);
      throw error;
    }
  }

  // Calculate user reputation
  static async calculateReputation(userId) {
    try {
      const [
        reviewsReceived,
        exchangesCompleted
      ] = await Promise.all([
        prisma.review.findMany({
          where: { revieweeId: userId },
          select: { rating: true }
        }),
        prisma.exchange.count({
          where: {
            OR: [{ requesterId: userId }, { providerId: userId }],
            status: 'completed'
          }
        })
      ]);

      if (reviewsReceived.length === 0) return 0;

      // Base reputation from reviews (0-100)
      const avgRating = reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / reviewsReceived.length;
      const reviewScore = (avgRating / 5) * 80;

      // Activity bonus (0-20)
      const activityScore = Math.min(exchangesCompleted, 20);

      // Overall reputation (0-100)
      const reputation = Math.round(reviewScore + activityScore);

      return Math.min(reputation, 100);

    } catch (error) {
      console.error('Calculate reputation error:', error);
      return 0;
    }
  }

  // Get XP needed for next level
  static getXPForNextLevel(currentXP) {
    if (currentXP <= 0) return XP_CONFIG.BASE_XP_PER_LEVEL;
    
    let level = this.calculateLevel(currentXP);
    let xpForCurrentLevel = XP_CONFIG.BASE_XP_PER_LEVEL;
    
    // Calculate XP needed for current level
    for (let i = 1; i < level; i++) {
      xpForCurrentLevel = Math.floor(xpForCurrentLevel * XP_CONFIG.XP_MULTIPLIER);
    }
    
    // Calculate XP needed for next level
    const xpForNextLevel = Math.floor(xpForCurrentLevel * XP_CONFIG.XP_MULTIPLIER);
    const xpIntoCurrentLevel = currentXP - (xpForCurrentLevel * (level - 1));
    
    return Math.max(0, xpForNextLevel - xpIntoCurrentLevel);
  }

  // Get user statistics
  static async getUserStats(userId) {
    try {
      const [
        user,
        skillsCount,
        exchangesRequested,
        exchangesCompleted,
        reviewsGiven,
        reviewsReceived,
        badgesCount
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            xp: true,
            level: true,
            streak: true,
            longestStreak: true,
            reputation: true,
            createdAt: true,
            lastActivity: true
          }
        }),
        prisma.skill.count({ where: { userId } }),
        prisma.exchange.count({ where: { requesterId: userId } }),
        prisma.exchange.count({ 
          where: { 
            OR: [{ requesterId: userId }, { providerId: userId }],
            status: 'completed'
          }
        }),
        prisma.review.count({ where: { reviewerId: userId } }),
        prisma.review.count({ where: { revieweeId: userId } }),
        prisma.badge.count({ where: { userId } })
      ]);

      if (!user) throw new Error('User not found');

      // Calculate XP needed for next level
      const xpForNextLevel = this.getXPForNextLevel(user.xp);
      
      // Calculate level progress percentage
      const currentLevelXP = user.xp;
      const levelProgress = user.level < XP_CONFIG.MAX_LEVEL ? 
        ((user.xp % this.getXPForNextLevel(user.xp)) / this.getXPForNextLevel(user.xp)) * 100 : 100;

      // Calculate days since joined
      const daysSinceJoined = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

      return {
        ...user,
        skillsCount,
        exchangesRequested,
        exchangesCompleted,
        reviewsGiven,
        reviewsReceived,
        badgesCount,
        xpForNextLevel,
        levelProgress: Math.round(levelProgress),
        daysSinceJoined,
        memberSince: user.createdAt
      };

    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  // Get leaderboards
  static async getLeaderboards(type = 'all') {
    try {
      const leaderboards = {};

      // XP Leaders
      leaderboards.xp = await prisma.user.findMany({
        orderBy: { xp: 'desc' },
        take: 10,
        select: { id: true, name: true, xp: true, level: true, profilePhoto: true }
      });

      // Streak Leaders
      leaderboards.streak = await prisma.user.findMany({
        orderBy: { streak: 'desc' },
        take: 10,
        select: { id: true, name: true, streak: true, longestStreak: true, profilePhoto: true }
      });

      // Reputation Leaders
      leaderboards.reputation = await prisma.user.findMany({
        orderBy: { reputation: 'desc' },
        take: 10,
        select: { id: true, name: true, reputation: true, level: true, profilePhoto: true }
      });

      return leaderboards;

    } catch (error) {
      console.error('Get leaderboards error:', error);
      throw error;
    }
  }
}

module.exports = GamificationService;