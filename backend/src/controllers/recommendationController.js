const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Personality types and their characteristics
const PERSONALITY_TYPES = {
  INTJ: {
    name: "Architect",
    description: "Imaginative, strategic thinkers",
    traits: ["analytical", "strategic", "independent", "decisive"],
    preferences: { complexity: "high", learningStyle: "self-paced", collaboration: "low" }
  },
  INFP: {
    name: "Mediator", 
    description: "Poetic, kind, altruistic people",
    traits: ["creative", "empathetic", "adaptable", "idealistic"],
    preferences: { complexity: "medium", learningStyle: "collaborative", collaboration: "high" }
  },
  ENFP: {
    name: "Campaigner",
    description: "Enthusiastic, creative, sociable",
    traits: ["enthusiastic", "creative", "sociable", "flexible"],
    preferences: { complexity: "medium", learningStyle: "interactive", collaboration: "high" }
  },
  ENTJ: {
    name: "Commander",
    description: "Bold, imaginative, strong-willed",
    traits: ["natural_leader", "efficient", "strategic", "confident"],
    preferences: { complexity: "high", learningStyle: "goal-oriented", collaboration: "medium" }
  },
  ISTJ: {
    name: "Logistician",
    description: "Practical, fact-oriented, reliable",
    traits: ["reliable", "practical", "methodical", "responsible"],
    preferences: { complexity: "medium", learningStyle: "structured", collaboration: "low" }
  },
  ISFJ: {
    name: "Protector",
    description: "Warm, dedicated, understanding",
    traits: ["caring", "reliable", "empathetic", "cooperative"],
    preferences: { complexity: "medium", learningStyle: "supportive", collaboration: "high" }
  }
};

// Collaborative filtering for skill recommendations
const getSkillRecommendations = async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    const targetUserId = userId || req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get user's existing skills and preferences
    const userData = await prisma.user.findUnique({
      where: { id: parseInt(targetUserId) },
      include: {
        skills: {
          where: { isActive: true }
        },
        userPreferences: true,
        exchanges: {
          where: { status: 'completed' },
          include: {
            skill: true
          }
        }
      }
    });

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Content-based filtering: Recommend skills based on user's existing skills
    const contentBasedRecommendations = await getContentBasedRecommendations(userData);

    // 2. Collaborative filtering: Find similar users and their skills
    const collaborativeRecommendations = await getCollaborativeRecommendations(userData);

    // 3. Personality-based filtering
    const personalityBasedRecommendations = await getPersonalityBasedRecommendations(userData);

    // 4. Trending skills in user's areas of interest
    const trendingRecommendations = await getTrendingRecommendations(userData);

    // Combine and score all recommendations
    const allRecommendations = [
      ...contentBasedRecommendations.map(skill => ({ ...skill, score: skill.score * 0.4, reason: 'Based on your existing skills' })),
      ...collaborativeRecommendations.map(skill => ({ ...skill, score: skill.score * 0.3, reason: 'Popular among similar users' })),
      ...personalityBasedRecommendations.map(skill => ({ ...skill, score: skill.score * 0.2, reason: 'Matches your personality' })),
      ...trendingRecommendations.map(skill => ({ ...skill, score: skill.score * 0.1, reason: 'Currently trending' }))
    ];

    // Remove duplicates and sort by score
    const uniqueRecommendations = allRecommendations
      .filter((skill, index, self) => 
        index === self.findIndex(s => s.id === skill.id)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit));

    // Update user preferences based on recommendations
    await updateUserPreferences(userData, uniqueRecommendations);

    res.json({
      recommendations: uniqueRecommendations,
      userProfile: {
        personalityType: userData.personalityType,
        skillCount: userData.skills.length,
        preferenceMatch: calculatePreferenceMatch(userData, uniqueRecommendations)
      },
      recommendationTypes: {
        contentBased: contentBasedRecommendations.length,
        collaborative: collaborativeRecommendations.length,
        personalityBased: personalityBasedRecommendations.length,
        trending: trendingRecommendations.length
      }
    });

  } catch (error) {
    console.error('Get skill recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

// Content-based filtering
const getContentBasedRecommendations = async (userData) => {
  try {
    const userSkillCategories = userData.skills.map(skill => skill.category);
    const userSkillTags = userData.skills.flatMap(skill => skill.tags);

    // Find skills in similar categories or with similar tags
    const recommendations = await prisma.skill.findMany({
      where: {
        AND: [
          { isActive: true },
          { verificationStatus: { in: ['approved', 'verified'] } },
          { userId: { not: userData.id } },
          {
            OR: [
              { category: { in: userSkillCategories } },
              { tags: { hasSome: userSkillTags } },
              { difficulty: { in: userData.skills.map(s => s.difficulty) } }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        }
      },
      take: 20
    });

    // Score based on similarity to user's profile
    return recommendations.map(skill => {
      let score = 0;
      
      // Category match
      if (userSkillCategories.includes(skill.category)) {
        score += 30;
      }
      
      // Tag overlap
      const tagOverlap = skill.tags.filter(tag => userSkillTags.includes(tag)).length;
      score += tagOverlap * 10;
      
      // User reputation bonus
      score += Math.min(skill.user.reputation / 10, 20);
      
      // Skill rating bonus
      if (skill.rating) {
        score += skill.rating * 5;
      }

      return { ...skill, score };
    });

  } catch (error) {
    console.error('Content-based recommendations error:', error);
    return [];
  }
};

// Collaborative filtering
const getCollaborativeRecommendations = async (userData) => {
  try {
    // Find users with similar skill sets
    const similarUsers = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userData.id } },
          { isActive: true },
          {
            skills: {
              some: {
                category: { in: userData.skills.map(s => s.category) }
              }
            }
          }
        ]
      },
      include: {
        skills: {
          where: {
            isActive: true,
            verificationStatus: { in: ['approved', 'verified'] }
          }
        }
      },
      take: 10
    });

    // Collect skills from similar users
    const similarUserSkills = similarUsers.flatMap(user => user.skills);
    
    // Get skills that are not in user's existing skills
    const userSkillIds = userData.skills.map(skill => skill.id);
    const newSkills = similarUserSkills.filter(skill => !userSkillIds.includes(skill.id));

    // Score and deduplicate
    const skillMap = new Map();
    newSkills.forEach(skill => {
      if (skillMap.has(skill.id)) {
        skillMap.get(skill.id).score += 10; // Bonus for being recommended by multiple similar users
      } else {
        skillMap.set(skill.id, { ...skill, score: 10 });
      }
    });

    return Array.from(skillMap.values()).slice(0, 15);

  } catch (error) {
    console.error('Collaborative recommendations error:', error);
    return [];
  }
};

// Personality-based filtering
const getPersonalityBasedRecommendations = async (userData) => {
  try {
    if (!userData.personalityType || !PERSONALITY_TYPES[userData.personalityType]) {
      return [];
    }

    const personality = PERSONALITY_TYPES[userData.personalityType];
    
    // Get skills that match personality preferences
    let whereConditions = {
      isActive: true,
      verificationStatus: { in: ['approved', 'verified'] },
      userId: { not: userData.id }
    };

    // Add personality-based filtering logic
    switch (userData.personalityType) {
      case 'INTJ':
      case 'ENTJ':
        whereConditions.difficulty = { in: ['intermediate', 'advanced'] };
        break;
      case 'INFP':
      case 'ISFJ':
        whereConditions.mode = { in: ['in-person', 'hybrid'] };
        break;
      case 'ENFP':
        whereConditions.mode = { in: ['online', 'hybrid'] };
        break;
      case 'ISTJ':
        whereConditions.duration = { lte: 120 }; // Prefers shorter sessions
        break;
    }

    const recommendations = await prisma.skill.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        }
      },
      take: 10
    });

    return recommendations.map(skill => ({
      ...skill,
      score: 25 + Math.random() * 15 // Base score for personality match
    }));

  } catch (error) {
    console.error('Personality-based recommendations error:', error);
    return [];
  }
};

// Trending recommendations
const getTrendingRecommendations = async (userData) => {
  try {
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    return await prisma.skill.findMany({
      where: {
        isActive: true,
        verificationStatus: { in: ['approved', 'verified'] },
        userId: { not: userData.id },
        createdAt: { gte: recentDate }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        }
      },
      orderBy: [
        { viewCount: 'desc' },
        { requestCount: 'desc' }
      ],
      take: 5
    }).then(skills => skills.map(skill => ({
      ...skill,
      score: 15 + Math.random() * 10
    })));

  } catch (error) {
    console.error('Trending recommendations error:', error);
    return [];
  }
};

// User matching for skill exchanges
const getUserMatches = async (req, res) => {
  try {
    const {
      userId,
      skillOffered,
      skillWanted,
      location,
      maxDistance = 50,
      personalityMatch = true
    } = req.query;

    const targetUserId = userId || req.user.id;

    if (!skillOffered || !skillWanted) {
      return res.status(400).json({ error: 'Both skill offered and wanted are required' });
    }

    // Get current user's skill
    const userSkill = await prisma.skill.findFirst({
      where: {
        userId: parseInt(targetUserId),
        title: { contains: skillOffered, mode: 'insensitive' },
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            personalityType: true,
            location: true,
            level: true,
            reputation: true
          }
        }
      }
    });

    if (!userSkill) {
      return res.status(404).json({ error: 'User skill not found' });
    }

    // Find potential matches
    let whereConditions = {
      isActive: true,
      verificationStatus: { in: ['approved', 'verified'] },
      userId: { not: parseInt(targetUserId) },
      user: {
        isActive: true,
        banned: false
      }
    };

    // Add location filtering if provided
    if (location) {
      whereConditions.user.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    const potentialMatches = await prisma.skill.findMany({
      where: {
        ...whereConditions,
        title: { contains: skillWanted, mode: 'insensitive' }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            personalityType: true,
            location: true,
            level: true,
            reputation: true,
            profilePhoto: true,
            bio: true,
            lastActivity: true
          }
        },
        _count: {
          select: {
            exchanges: true
          }
        }
      },
      take: 50
    });

    // Score matches based on multiple factors
    const scoredMatches = potentialMatches.map(match => {
      let score = 0;
      let reasons = [];

      // Base compatibility score
      score += 20;

      // Personality match
      if (personalityMatch && userSkill.user.personalityType && match.user.personalityType) {
        const personalityScore = calculatePersonalityCompatibility(
          userSkill.user.personalityType,
          match.user.personalityType
        );
        score += personalityScore * 15;
        if (personalityScore > 0.7) {
          reasons.push('High personality compatibility');
        }
      }

      // Reputation score
      const reputationScore = Math.min(match.user.reputation / 10, 20);
      score += reputationScore;
      if (reputationScore > 15) {
        reasons.push('Highly rated user');
      }

      // Level proximity (similar experience levels work well together)
      const levelDiff = Math.abs(userSkill.user.level - match.user.level);
      if (levelDiff <= 5) {
        score += 15;
        reasons.push('Similar experience level');
      } else if (levelDiff <= 10) {
        score += 10;
        reasons.push('Compatible experience level');
      }

      // Activity score
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(match.user.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity <= 7) {
        score += 10;
        reasons.push('Recently active');
      }

      // Exchange experience
      if (match._count.exchanges > 5) {
        score += 5;
        reasons.push('Experienced in skill exchanges');
      }

      // Location bonus if same area
      if (userSkill.user.location && match.user.location &&
          userSkill.user.location.toLowerCase() === match.user.location.toLowerCase()) {
        score += 10;
        reasons.push('Same location');
      }

      return {
        ...match,
        matchScore: Math.round(score),
        matchReasons: reasons,
        compatibility: {
          personality: calculatePersonalityCompatibility(
            userSkill.user.personalityType,
            match.user.personalityType
          ),
          experience: Math.max(0, 1 - (levelDiff / 20)),
          reputation: match.user.reputation / 100,
          activity: daysSinceActivity <= 7 ? 1 : daysSinceActivity <= 30 ? 0.7 : 0.3
        }
      };
    });

    // Sort by match score
    const topMatches = scoredMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    res.json({
      matches: topMatches,
      searchCriteria: {
        skillOffered,
        skillWanted,
        location,
        maxDistance: parseInt(maxDistance),
        personalityMatch: personalityMatch === 'true'
      },
      userProfile: {
        personalityType: userSkill.user.personalityType,
        location: userSkill.user.location,
        level: userSkill.user.level
      },
      totalMatches: topMatches.length
    });

  } catch (error) {
    console.error('Get user matches error:', error);
    res.status(500).json({ error: 'Failed to get user matches' });
  }
};

// Learning system: Update user preferences based on behavior
const updateUserPreferences = async (userData, recommendations) => {
  try {
    // This would track user interactions with recommendations
    // and update preferences accordingly
    // For now, we'll just simulate preference learning

    const preferredCategories = recommendations
      .filter(rec => rec.score > 50)
      .map(rec => rec.category);

    // Update or create user preferences
    for (const category of preferredCategories) {
      await prisma.userPreference.upsert({
        where: {
          userId_category_preferenceKey: {
            userId: userData.id,
            category: 'skill_categories',
            preferenceKey: category
          }
        },
        update: {
          preferenceValue: { interest: 'high' },
          confidence: 0.9
        },
        create: {
          userId: userData.id,
          category: 'skill_categories',
          preferenceKey: category,
          preferenceValue: { interest: 'high' },
          confidence: 0.7
        }
      });
    }

  } catch (error) {
    console.error('Update user preferences error:', error);
  }
};

// Calculate personality compatibility
const calculatePersonalityCompatibility = (type1, type2) => {
  if (!type1 || !type2) return 0.5;

  // Personality compatibility matrix (simplified)
  const compatibility = {
    'INTJ-INTJ': 0.8, 'INTJ-INFP': 0.6, 'INTJ-ENFP': 0.4, 'INTJ-ENTJ': 0.9,
    'INTJ-ISTJ': 0.7, 'INTJ-ISFJ': 0.5, 'INTJ-ENFJ': 0.6, 'INTJ-ESFJ': 0.4,
    'INFP-INTJ': 0.6, 'INFP-INFP': 0.8, 'INFP-ENFP': 0.9, 'INFP-ENTJ': 0.5,
    'INFP-ISTJ': 0.4, 'INFP-ISFJ': 0.8, 'INFP-ENFJ': 0.9, 'INFP-ESFJ': 0.7,
    'ENFP-INTJ': 0.4, 'ENFP-INFP': 0.9, 'ENFP-ENFP': 0.8, 'ENFP-ENTJ': 0.7,
    'ENFP-ISTJ': 0.3, 'ENFP-ISFJ': 0.7, 'ENFP-ENFJ': 0.8, 'ENFP-ESFJ': 0.9,
    'ENTJ-INTJ': 0.9, 'ENTJ-INFP': 0.5, 'ENTJ-ENFP': 0.7, 'ENTJ-ENTJ': 0.8,
    'ENTJ-ISTJ': 0.8, 'ENTJ-ISFJ': 0.6, 'ENTJ-ENFJ': 0.7, 'ENTJ-ESFJ': 0.5,
    'ISTJ-INTJ': 0.7, 'ISTJ-INFP': 0.4, 'ISTJ-ENFP': 0.3, 'ISTJ-ENTJ': 0.8,
    'ISTJ-ISTJ': 0.9, 'ISTJ-ISFJ': 0.8, 'ISTJ-ENFJ': 0.6, 'ISTJ-ESFJ': 0.7,
    'ISFJ-INTJ': 0.5, 'ISFJ-INFP': 0.8, 'ISFJ-ENFP': 0.7, 'ISFJ-ENTJ': 0.6,
    'ISFJ-ISTJ': 0.8, 'ISFJ-ISFJ': 0.9, 'ISFJ-ENFJ': 0.9, 'ISFJ-ESFJ': 0.8
  };

  return compatibility[`${type1}-${type2}`] || 0.5;
};

// Calculate preference match
const calculatePreferenceMatch = (userData, recommendations) => {
  const averageScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;
  return Math.min(averageScore / 100, 1); // Normalize to 0-1
};

// Get personality insights for users
const getPersonalityInsights = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        skills: {
          where: { isActive: true }
        },
        exchanges: {
          where: { status: 'completed' },
          include: {
            skill: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Analyze user behavior to suggest personality type
    const behaviorAnalysis = analyzeUserBehavior(user);

    // Get compatibility with other users
    const compatibilityInsights = await getCompatibilityInsights(user);

    // Get recommended personality assessment
    const personalityRecommendation = recommendPersonalityType(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        currentPersonalityType: user.personalityType
      },
      behaviorAnalysis,
      compatibilityInsights,
      personalityRecommendation
    });

  } catch (error) {
    console.error('Get personality insights error:', error);
    res.status(500).json({ error: 'Failed to get personality insights' });
  }
};

// Analyze user behavior for personality insights
const analyzeUserBehavior = (user) => {
  const analysis = {
    patterns: [],
    traits: [],
    recommendations: []
  };

  // Analyze skill patterns
  const skillCategories = user.skills.reduce((acc, skill) => {
    acc[skill.category] = (acc[skill.category] || 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.keys(skillCategories).reduce((a, b) => 
    skillCategories[a] > skillCategories[b] ? a : b
  );

  // Analyze exchange patterns
  const exchangeCount = user.exchanges.length;
  const recentActivity = user.exchanges.filter(exchange => {
    const daysSince = Math.floor(
      (Date.now() - new Date(exchange.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 30;
  }).length;

  // Generate insights based on patterns
  if (exchangeCount > 10) {
    analysis.patterns.push('Highly active in skill exchanges');
    analysis.traits.push('collaborative');
  }

  if (Object.keys(skillCategories).length > 3) {
    analysis.patterns.push('Diverse skill interests');
    analysis.traits.push('versatile');
  }

  if (recentActivity > 5) {
    analysis.patterns.push('Consistently active');
    analysis.traits.push('committed');
  }

  return analysis;
};

// Get compatibility insights
const getCompatibilityInsights = async (user) => {
  if (!user.personalityType) {
    return { message: 'Personality type not set - take assessment for better matches' };
  }

  const compatibleTypes = Object.keys(PERSONALITY_TYPES)
    .filter(type => {
      if (type === user.personalityType) return true;
      const compatibility = calculatePersonalityCompatibility(user.personalityType, type);
      return compatibility > 0.7;
    });

  return {
    mostCompatible: compatibleTypes.slice(0, 3),
    personalityStrengths: PERSONALITY_TYPES[user.personalityType]?.traits || [],
    optimalLearningStyle: PERSONALITY_TYPES[user.personalityType]?.preferences || {}
  };
};

// Recommend personality type based on behavior
const recommendPersonalityType = (user) => {
  if (user.personalityType) {
    return {
      currentType: user.personalityType,
      recommendation: 'Current type matches your behavior patterns'
    };
  }

  // Simple heuristic-based recommendation
  const skillCount = user.skills.length;
  const exchangeCount = user.exchanges.length;

  if (skillCount > 5 && exchangeCount > 8) {
    return {
      recommendation: 'ENFP',
      reason: 'Your diverse skills and high collaboration suggest an enthusiastic, people-oriented personality'
    };
  } else if (skillCount > 3 && exchangeCount < 3) {
    return {
      recommendation: 'INTJ',
      reason: 'Focused skill development with selective collaboration suggests strategic, independent thinking'
    };
  } else {
    return {
      recommendation: 'INFP',
      reason: 'Balanced approach with meaningful connections suggests idealistic, adaptable nature'
    };
  }
};

module.exports = {
  getSkillRecommendations,
  getUserMatches,
  getPersonalityInsights
};