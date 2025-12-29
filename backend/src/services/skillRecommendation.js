const { PrismaClient } = require('@prisma/client');
const personalityRecommendation = require('./personalityRecommendation');
const searchService = require('./search');

/**
 * Advanced Skill Recommendation Algorithm
 * Multi-layered recommendation system using collaborative filtering, content-based filtering, and machine learning
 */
class SkillRecommendationService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Recommendation algorithm weights
    this.algorithmWeights = {
      contentBased: 0.35,      // Content similarity
      collaborative: 0.25,     // User behavior patterns
      personality: 0.20,       // Personality matching
      trending: 0.10,          // Trending/popular skills
      quality: 0.10            // Skill quality metrics
    };

    // Skill similarity thresholds
    this.similarityThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };

    // Minimum interactions for collaborative filtering
    this.minInteractions = 3;
  }

  /**
   * Get comprehensive skill recommendations for a user
   * @param {number} userId - User ID
   * @param {object} options - Recommendation options
   * @returns {object} Comprehensive recommendations
   */
  async getComprehensiveRecommendations(userId, options = {}) {
    try {
      const {
        limit = 20,
        algorithm = 'hybrid', // 'content', 'collaborative', 'personality', 'hybrid'
        categories = [],
        excludeSeen = true,
        includeReasons = true,
        weightAdjustments = {}
      } = options;

      // Get user profile and interaction history
      const userProfile = await this.getUserProfileForRecommendations(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Run different recommendation algorithms
      const recommendations = await this.runRecommendationAlgorithms(
        userProfile, 
        algorithm, 
        limit, 
        categories
      );

      // Apply exclusions and filters
      let filteredRecommendations = this.applyFilters(recommendations, userProfile, {
        excludeSeen,
        categories,
        minQuality: 0.3
      });

      // Rank and score recommendations
      const rankedRecommendations = await this.rankRecommendations(
        filteredRecommendations, 
        userProfile, 
        weightAdjustments
      );

      // Generate explanations and reasons
      if (includeReasons) {
        await this.generateRecommendationReasons(rankedRecommendations, userProfile);
      }

      return {
        recommendations: rankedRecommendations.slice(0, limit),
        algorithm,
        totalConsidered: filteredRecommendations.length,
        userProfile: {
          personalityType: userProfile.personalityType,
          skillLevel: this.calculateUserSkillLevel(userProfile),
          preferences: this.extractUserPreferences(userProfile)
        },
        recommendationBreakdown: this.getRecommendationBreakdown(rankedRecommendations)
      };

    } catch (error) {
      console.error('Comprehensive recommendations error:', error);
      throw error;
    }
  }

  /**
   * Run different recommendation algorithms
   * @param {object} userProfile - User profile
   * @param {string} algorithm - Algorithm to use
   * @param {number} limit - Number of recommendations
   * @param {Array} categories - Category filters
   * @returns {Array} Combined recommendations
   */
  async runRecommendationAlgorithms(userProfile, algorithm, limit, categories) {
    let recommendations = [];

    if (algorithm === 'content' || algorithm === 'hybrid') {
      const contentRecs = await this.contentBasedRecommendations(userProfile, limit, categories);
      recommendations.push(...contentRecs.map(rec => ({ ...rec, source: 'content' })));
    }

    if (algorithm === 'collaborative' || algorithm === 'hybrid') {
      const collabRecs = await this.collaborativeFilteringRecommendations(userProfile, limit, categories);
      recommendations.push(...collabRecs.map(rec => ({ ...rec, source: 'collaborative' })));
    }

    if (algorithm === 'personality' || algorithm === 'hybrid') {
      const personalityRecs = await personalityRecommendation.getPersonalizedRecommendations(userProfile.id, {
        limit: limit * 0.5,
        categories,
        excludeSeen: false
      });
      recommendations.push(...personalityRecs.recommendations.map(rec => ({ 
        ...rec, 
        source: 'personality',
        personalityScore: rec.compositeScore 
      })));
    }

    if (algorithm === 'hybrid') {
      const trendingRecs = await this.trendingRecommendations(userProfile, limit * 0.3, categories);
      recommendations.push(...trendingRecs.map(rec => ({ ...rec, source: 'trending' })));
    }

    // Remove duplicates and combine
    return this.combineAndDeduplicate(recommendations);
  }

  /**
   * Content-based filtering recommendations
   * @param {object} userProfile - User profile
   * @param {number} limit - Number of recommendations
   * @param {Array} categories - Category filters
   * @returns {Array} Content-based recommendations
   */
  async contentBasedRecommendations(userProfile, limit, categories) {
    try {
      // Get user's skill preferences
      const userSkillProfile = this.buildUserSkillProfile(userProfile);
      
      // Find similar skills based on content
      const candidateSkills = await this.findCandidateSkills(userProfile, categories, limit * 3);
      
      // Calculate content similarity scores
      const scoredSkills = candidateSkills.map(skill => {
        const similarityScore = this.calculateContentSimilarity(userSkillProfile, skill);
        const qualityScore = this.calculateSkillQuality(skill);
        
        return {
          ...skill,
          contentScore: similarityScore,
          qualityScore,
          combinedScore: (similarityScore * 0.7) + (qualityScore * 0.3)
        };
      });

      // Sort by combined score and return top recommendations
      return scoredSkills
        .filter(skill => skill.combinedScore > 0.3)
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Content-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Collaborative filtering recommendations
   * @param {object} userProfile - User profile
   * @param {number} limit - Number of recommendations
   * @param {Array} categories - Category filters
   * @returns {Array} Collaborative recommendations
   */
  async collaborativeFilteringRecommendations(userProfile, limit, categories) {
    try {
      // Find similar users based on behavior
      const similarUsers = await this.findSimilarUsers(userProfile, 50);
      
      // Get skills that similar users have interacted with
      const candidateSkills = await this.getSkillsFromSimilarUsers(similarUsers, userProfile.id, categories);
      
      // Calculate collaborative scores
      const scoredSkills = candidateSkills.map(skill => {
        const similarityScore = this.calculateUserSimilarity(userProfile, skill.user);
        const popularityScore = this.calculatePopularityScore(skill, similarUsers);
        const qualityScore = this.calculateSkillQuality(skill);
        
        return {
          ...skill,
          collaborativeScore: (similarityScore * 0.4) + (popularityScore * 0.4) + (qualityScore * 0.2),
          similarityScore,
          popularityScore,
          qualityScore
        };
      });

      // Return top recommendations
      return scoredSkills
        .filter(skill => skill.collaborativeScore > 0.3)
        .sort((a, b) => b.collaborativeScore - a.collaborativeScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return [];
    }
  }

  /**
   * Trending recommendations based on popular skills
   * @param {object} userProfile - User profile
   * @param {number} limit - Number of recommendations
   * @param {Array} categories - Category filters
   * @returns {Array} Trending recommendations
   */
  async trendingRecommendations(userProfile, limit, categories) {
    try {
      const trendingSkills = await this.prisma.skill.findMany({
        where: {
          isActive: true,
          userId: { not: userProfile.id },
          ...(categories.length > 0 && { category: { in: categories } }),
          viewCount: { gt: 50 }, // Only consider skills with some visibility
          rating: { gt: 3.5 }   // Minimum quality threshold
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              reputation: true,
              profilePhoto: true
            }
          },
          exchanges: {
            where: { status: 'completed' },
            include: {
              receivedReviews: true
            }
          }
        },
        orderBy: [
          { viewCount: 'desc' },
          { rating: 'desc' },
          { requestCount: 'desc' }
        ],
        take: limit * 2
      });

      // Score trending skills based on user preferences
      const userPreferences = this.extractUserPreferences(userProfile);
      
      const scoredSkills = trendingSkills.map(skill => {
        const preferenceScore = this.calculatePreferenceAlignment(skill, userPreferences);
        const trendScore = this.calculateTrendScore(skill);
        
        return {
          ...skill,
          trendingScore: (preferenceScore * 0.6) + (trendScore * 0.4),
          preferenceScore,
          trendScore
        };
      });

      return scoredSkills
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Trending recommendations error:', error);
      return [];
    }
  }

  /**
   * Build user skill profile for content-based filtering
   * @param {object} userProfile - User profile
   * @returns {object} User skill profile
   */
  buildUserSkillProfile(userProfile) {
    const profile = {
      categories: {},
      tags: {},
      difficulties: {},
      durations: [],
      modes: {},
      skills: userProfile.skills || []
    };

    // Analyze user's skills
    userProfile.skills?.forEach(skill => {
      // Category preferences
      profile.categories[skill.category] = (profile.categories[skill.category] || 0) + 1;
      
      // Tag preferences
      skill.tags?.forEach(tag => {
        profile.tags[tag] = (profile.tags[tag] || 0) + 1;
      });
      
      // Difficulty preferences
      if (skill.difficulty) {
        profile.difficulties[skill.difficulty] = (profile.difficulties[skill.difficulty] || 0) + 1;
      }
      
      // Duration preferences
      if (skill.duration) {
        profile.durations.push(skill.duration);
      }
      
      // Mode preferences
      profile.modes[skill.mode] = (profile.modes[skill.mode] || 0) + 1;
    });

    return profile;
  }

  /**
   * Find candidate skills for recommendation
   * @param {object} userProfile - User profile
   * @param {Array} categories - Category filters
   * @param {number} limit - Number of candidates
   * @returns {Array} Candidate skills
   */
  async findCandidateSkills(userProfile, categories, limit) {
    const whereClause = {
      isActive: true,
      userId: { not: userProfile.id }
    };

    if (categories.length > 0) {
      whereClause.category = { in: categories };
    } else {
      // If no category filter, get skills from user's preferred categories
      const userCategories = [...new Set(userProfile.skills?.map(skill => skill.category) || [])];
      if (userCategories.length > 0) {
        whereClause.category = { in: userCategories };
      }
    }

    return await this.prisma.skill.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            reputation: true,
            profilePhoto: true
          }
        },
        exchanges: {
          where: { status: 'completed' },
          include: {
            receivedReviews: true
          }
        }
      },
      take: limit
    });
  }

  /**
   * Calculate content similarity between user profile and skill
   * @param {object} userProfile - User skill profile
   * @param {object} skill - Skill to evaluate
   * @returns {number} Similarity score (0-1)
   */
  calculateContentSimilarity(userProfile, skill) {
    let score = 0;
    let factors = 0;

    // Category similarity
    if (userProfile.categories[skill.category]) {
      score += 0.3;
    }
    factors++;

    // Tag similarity
    if (skill.tags) {
      const skillTags = skill.tags;
      let tagMatches = 0;
      
      Object.keys(userProfile.tags).forEach(userTag => {
        if (skillTags.includes(userTag)) {
          tagMatches++;
        }
      });
      
      if (skillTags.length > 0) {
        score += (tagMatches / skillTags.length) * 0.25;
      }
    }
    factors++;

    // Difficulty alignment
    if (skill.difficulty && userProfile.difficulties[skill.difficulty]) {
      score += 0.2;
    }
    factors++;

    // Mode alignment
    if (skill.mode && userProfile.modes[skill.mode]) {
      score += 0.15;
    }
    factors++;

    // Duration alignment (using average)
    if (userProfile.durations.length > 0 && skill.duration) {
      const avgDuration = userProfile.durations.reduce((sum, dur) => sum + dur, 0) / userProfile.durations.length;
      const durationDiff = Math.abs(skill.duration - avgDuration);
      const durationAlignment = Math.max(0, 1 - (durationDiff / avgDuration));
      score += durationAlignment * 0.1;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate skill quality score
   * @param {object} skill - Skill to evaluate
   * @returns {number} Quality score (0-1)
   */
  calculateSkillQuality(skill) {
    let score = 0;
    let factors = 0;

    // Rating score
    if (skill.rating) {
      score += (skill.rating / 5) * 0.4;
    }
    factors++;

    // Review count bonus
    if (skill.reviewCount > 0) {
      score += Math.min(0.3, Math.log(skill.reviewCount + 1) / 10);
    }
    factors++;

    // Verification bonus
    if (skill.isVerified) {
      score += 0.2;
    }
    factors++;

    // View count (engagement indicator)
    if (skill.viewCount > 0) {
      score += Math.min(0.1, Math.log(skill.viewCount + 1) / 20);
    }
    factors++;

    return factors > 0 ? Math.min(1, score) : 0;
  }

  /**
   * Find similar users for collaborative filtering
   * @param {object} userProfile - User profile
   * @param {number} limit - Number of similar users to find
   * @returns {Array} Similar users
   */
  async findSimilarUsers(userProfile, limit = 50) {
    try {
      // Find users with similar skill categories
      const userCategories = [...new Set(userProfile.skills?.map(skill => skill.category) || [])];
      
      const similarUsers = await this.prisma.user.findMany({
        where: {
          id: { not: userProfile.id },
          isActive: true,
          skills: {
            some: {
              category: { in: userCategories }
            }
          }
        },
        include: {
          skills: {
            where: { isActive: true }
          }
        },
        take: limit * 2
      });

      // Calculate similarity scores
      return similarUsers
        .map(user => ({
          user,
          similarityScore: this.calculateUserSimilarity(userProfile, user)
        }))
        .filter(item => item.similarityScore > 0.3)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Similar users finding error:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two users
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @returns {number} Similarity score (0-1)
   */
  calculateUserSimilarity(user1, user2) {
    try {
      let similarity = 0;
      let factors = 0;

      // Skill category overlap
      const user1Categories = new Set(user1.skills?.map(skill => skill.category) || []);
      const user2Categories = new Set(user2.skills?.map(skill => skill.category) || []);
      
      const categoryOverlap = new Set([...user1Categories].filter(cat => user2Categories.has(cat))).size;
      const categoryUnion = new Set([...user1Categories, ...user2Categories]).size;
      
      if (categoryUnion > 0) {
        similarity += categoryOverlap / categoryUnion;
      }
      factors++;

      // Tag overlap
      const user1Tags = new Set(user1.skills?.flatMap(skill => skill.tags || []) || []);
      const user2Tags = new Set(user2.skills?.flatMap(skill => skill.tags || []) || []);
      
      const tagOverlap = new Set([...user1Tags].filter(tag => user2Tags.has(tag))).size;
      const tagUnion = new Set([...user1Tags, ...user2Tags]).size;
      
      if (tagUnion > 0) {
        similarity += (tagOverlap / tagUnion) * 0.8;
      }
      factors++;

      // Reputation similarity
      const repDiff = Math.abs((user1.reputation || 0) - (user2.reputation || 0));
      const maxRep = Math.max(user1.reputation || 0, user2.reputation || 0, 1000);
      const repSimilarity = maxRep > 0 ? Math.max(0, 1 - (repDiff / maxRep)) : 0.5;
      similarity += repSimilarity * 0.5;
      factors++;

      return factors > 0 ? similarity / factors : 0;

    } catch (error) {
      console.error('User similarity calculation error:', error);
      return 0;
    }
  }

  /**
   * Get skills from similar users
   * @param {Array} similarUsers - Similar users
   * @param {number} currentUserId - Current user ID
   * @param {Array} categories - Category filters
   * @returns {Array} Skills from similar users
   */
  async getSkillsFromSimilarUsers(similarUsers, currentUserId, categories) {
    try {
      const userIds = similarUsers.map(item => item.user.id);
      
      if (userIds.length === 0) return [];

      const whereClause = {
        userId: { in: userIds },
        isActive: true
      };

      if (categories.length > 0) {
        whereClause.category = { in: categories };
      }

      return await this.prisma.skill.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              reputation: true,
              profilePhoto: true
            }
          },
          exchanges: {
            where: { status: 'completed' },
            include: {
              receivedReviews: true
            }
          }
        },
        take: 100
      });

    } catch (error) {
      console.error('Skills from similar users error:', error);
      return [];
    }
  }

  /**
   * Calculate popularity score for collaborative filtering
   * @param {object} skill - Skill to evaluate
   * @param {Array} similarUsers - Similar users
   * @returns {number} Popularity score (0-1)
   */
  calculatePopularityScore(skill, similarUsers) {
    try {
      // Count how many similar users have interacted with skills in the same category
      let interactions = 0;
      const totalSimilarUsers = similarUsers.length;
      
      similarUsers.forEach(similarUser => {
        const userSkills = similarUser.user.skills || [];
        const hasSimilarSkill = userSkills.some(userSkill => 
          userSkill.category === skill.category
        );
        if (hasSimilarSkill) {
          interactions++;
        }
      });

      return totalSimilarUsers > 0 ? interactions / totalSimilarUsers : 0;

    } catch (error) {
      console.error('Popularity score calculation error:', error);
      return 0;
    }
  }

  /**
   * Get user profile specifically for recommendations
   * @param {number} userId - User ID
   * @returns {object} User profile for recommendations
   */
  async getUserProfileForRecommendations(userId) {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          skills: {
            where: { isActive: true }
          },
          exchanges: {
            where: { status: 'completed' },
            include: {
              receivedReviews: true,
              skill: true
            }
          },
          userPreferences: true,
          activityLogs: {
            where: {
              action: { in: ['skill_viewed', 'skill_requested', 'exchange_completed'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
          }
        }
      });

    } catch (error) {
      console.error('Failed to get user profile for recommendations:', error);
      return null;
    }
  }

  /**
   * Extract user preferences for recommendations
   * @param {object} userProfile - User profile
   * @returns {object} User preferences
   */
  extractUserPreferences(userProfile) {
    return {
      categories: [...new Set(userProfile.skills?.map(skill => skill.category) || [])],
      tags: [...new Set(userProfile.skills?.flatMap(skill => skill.tags || []) || [])],
      difficulties: userProfile.skills?.map(skill => skill.difficulty).filter(Boolean) || [],
      modes: userProfile.skills?.map(skill => skill.mode).filter(Boolean) || [],
      averageDuration: this.calculateAverageDuration(userProfile.skills),
      maxPrice: Math.max(...(userProfile.skills?.map(skill => skill.price || 0) || [0])),
      preferredRating: 4.0 // Default preference
    };
  }

  /**
   * Calculate average skill duration
   * @param {Array} skills - User's skills
   * @returns {number} Average duration
   */
  calculateAverageDuration(skills) {
    if (!skills || skills.length === 0) return 60; // Default 1 hour
    
    const durations = skills.map(skill => skill.duration).filter(d => d && d > 0);
    if (durations.length === 0) return 60;
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  /**
   * Calculate user skill level
   * @param {object} userProfile - User profile
   * @returns {string} Skill level
   */
  calculateUserSkillLevel(userProfile) {
    const { level, xp, reputation } = userProfile;
    
    if (level >= 10 || xp >= 10000 || reputation >= 500) {
      return 'advanced';
    } else if (level >= 5 || xp >= 5000 || reputation >= 200) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Calculate preference alignment score
   * @param {object} skill - Skill to evaluate
   * @param {object} preferences - User preferences
   * @returns {number} Alignment score (0-1)
   */
  calculatePreferenceAlignment(skill, preferences) {
    let score = 0;
    let factors = 0;

    // Category preference
    if (preferences.categories.includes(skill.category)) {
      score += 0.4;
    }
    factors++;

    // Tag preferences
    if (skill.tags && preferences.tags.length > 0) {
      const matchingTags = skill.tags.filter(tag => preferences.tags.includes(tag));
      if (skill.tags.length > 0) {
        score += (matchingTags.length / skill.tags.length) * 0.3;
      }
    }
    factors++;

    // Mode preference
    if (preferences.modes.includes(skill.mode)) {
      score += 0.2;
    }
    factors++;

    // Duration alignment
    if (skill.duration && preferences.averageDuration) {
      const durationDiff = Math.abs(skill.duration - preferences.averageDuration);
      const alignment = Math.max(0, 1 - (durationDiff / preferences.averageDuration));
      score += alignment * 0.1;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate trend score for a skill
   * @param {object} skill - Skill to evaluate
   * @returns {number} Trend score (0-1)
   */
  calculateTrendScore(skill) {
    try {
      // Calculate based on recent activity
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Recent view count factor
      const viewScore = Math.min(0.5, (skill.viewCount || 0) / 1000);
      
      // Recent request count factor
      const requestScore = Math.min(0.3, (skill.requestCount || 0) / 100);
      
      // Recent creation bonus
      const creationScore = skill.createdAt > thirtyDaysAgo ? 0.2 : 0;
      
      return viewScore + requestScore + creationScore;

    } catch (error) {
      console.error('Trend score calculation error:', error);
      return 0;
    }
  }

  /**
   * Apply filters to recommendations
   * @param {Array} recommendations - Recommendations to filter
   * @param {object} userProfile - User profile
   * @param {object} filters - Filter criteria
   * @returns {Array} Filtered recommendations
   */
  applyFilters(recommendations, userProfile, filters) {
    let filtered = [...recommendations];

    // Remove skills user already has
    if (filters.excludeSeen) {
      const userSkillIds = new Set(userProfile.skills?.map(skill => skill.id) || []);
      filtered = filtered.filter(skill => !userSkillIds.has(skill.id));
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(skill => filters.categories.includes(skill.category));
    }

    // Quality filter
    if (filters.minQuality) {
      filtered = filtered.filter(skill => {
        const quality = this.calculateSkillQuality(skill);
        return quality >= filters.minQuality;
      });
    }

    return filtered;
  }

  /**
   * Rank recommendations using weighted scoring
   * @param {Array} recommendations - Recommendations to rank
   * @param {object} userProfile - User profile
   * @param {object} weightAdjustments - Custom weight adjustments
   * @returns {Array} Ranked recommendations
   */
  async rankRecommendations(recommendations, userProfile, weightAdjustments = {}) {
    const weights = { ...this.algorithmWeights, ...weightAdjustments };

    return recommendations.map(skill => {
      let compositeScore = 0;

      // Content-based score
      if (skill.contentScore) {
        compositeScore += skill.contentScore * weights.contentBased;
      }

      // Collaborative score
      if (skill.collaborativeScore) {
        compositeScore += skill.collaborativeScore * weights.collaborative;
      }

      // Personality score
      if (skill.personalityScore) {
        compositeScore += skill.personalityScore * weights.personality;
      }

      // Trending score
      if (skill.trendingScore) {
        compositeScore += skill.trendingScore * weights.trending;
      }

      // Quality score
      const qualityScore = this.calculateSkillQuality(skill);
      compositeScore += qualityScore * weights.quality;

      return {
        ...skill,
        compositeScore,
        qualityScore,
        rankingFactors: {
          content: skill.contentScore || 0,
          collaborative: skill.collaborativeScore || 0,
          personality: skill.personalityScore || 0,
          trending: skill.trendingScore || 0,
          quality: qualityScore
        }
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Generate explanation reasons for recommendations
   * @param {Array} recommendations - Ranked recommendations
   * @param {object} userProfile - User profile
   * @returns {Array} Recommendations with reasons
   */
  async generateRecommendationReasons(recommendations, userProfile) {
    for (const skill of recommendations) {
      skill.reasons = [];

      // Content-based reasons
      if (skill.contentScore > 0.7) {
        skill.reasons.push('Similar to skills you already offer');
      }

      // Quality reasons
      if (skill.qualityScore > 0.8) {
        skill.reasons.push('Highly rated by other learners');
      } else if (skill.isVerified) {
        skill.reasons.push('Verified skill quality');
      }

      // Personality reasons
      if (skill.personalityScore > 0.7) {
        skill.reasons.push('Matches your learning style and personality');
      }

      // Trending reasons
      if (skill.trendingScore > 0.6) {
        skill.reasons.push('Popular and trending skill');
      }

      // Category match
      const userCategories = userProfile.skills?.map(skill => skill.category) || [];
      if (userCategories.includes(skill.category)) {
        skill.reasons.push(`Fits your interest in ${skill.category}`);
      }

      // Provider reputation
      if (skill.user.reputation > 500) {
        skill.reasons.push(`Taught by ${skill.user.name}, a highly-rated instructor`);
      }
    }

    return recommendations;
  }

  /**
   * Combine and deduplicate recommendations from different algorithms
   * @param {Array} recommendations - All recommendations
   * @returns {Array} Combined recommendations
   */
  combineAndDeduplicate(recommendations) {
    const skillMap = new Map();

    recommendations.forEach(rec => {
      const existing = skillMap.get(rec.id);
      
      if (existing) {
        // Merge scores from different algorithms
        existing.sources = existing.sources || [];
        existing.sources.push(rec.source);
        existing.algorithmScores = existing.algorithmScores || {};
        existing.algorithmScores[rec.source] = rec.compositeScore || rec.contentScore || rec.collaborativeScore || 0;
      } else {
        skillMap.set(rec.id, {
          ...rec,
          sources: [rec.source],
          algorithmScores: {
            [rec.source]: rec.compositeScore || rec.contentScore || rec.collaborativeScore || 0
          }
        });
      }
    });

    return Array.from(skillMap.values());
  }

  /**
   * Get recommendation breakdown for analytics
   * @param {Array} recommendations - Ranked recommendations
   * @returns {object} Breakdown statistics
   */
  getRecommendationBreakdown(recommendations) {
    const breakdown = {
      total: recommendations.length,
      bySource: {},
      byCategory: {},
      averageScore: 0
    };

    let totalScore = 0;

    recommendations.forEach(rec => {
      totalScore += rec.compositeScore;

      // Count by source
      rec.sources?.forEach(source => {
        breakdown.bySource[source] = (breakdown.bySource[source] || 0) + 1;
      });

      // Count by category
      breakdown.byCategory[rec.category] = (breakdown.byCategory[rec.category] || 0) + 1;
    });

    breakdown.averageScore = recommendations.length > 0 ? totalScore / recommendations.length : 0;

    return breakdown;
  }
}

module.exports = new SkillRecommendationService();