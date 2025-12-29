const { PrismaClient } = require('@prisma/client');
const math = require('mathjs');

/**
 * User Discovery and Matching Service
 * Advanced algorithms for finding compatible users for skill exchanges
 */
class UserMatchingService {
  constructor() {
    this.prisma = new PrismaClient();
    this.matchingWeights = {
      skillRelevance: 0.35,    // How well skills match user's needs
      personalityMatch: 0.25,  // Personality type compatibility
      locationProximity: 0.15, // Geographic proximity
      availabilityMatch: 0.10, // Time availability overlap
      experienceLevel: 0.10,   // Experience level alignment
      communicationStyle: 0.05 // Communication preferences
    };
  }

  /**
   * Find compatible users for skill exchange
   * @param {number} userId - Current user ID
   * @param {object} criteria - Matching criteria
   * @returns {Array} Matched users with scores
   */
  async findMatches(userId, criteria = {}) {
    try {
      const {
        wantedSkills = [],
        offeredSkills = [],
        location = null,
        maxDistance = 50, // kilometers
        minMatchScore = 0.6,
        personalityTypes = [],
        minReputation = 0,
        maxDistanceToTravel = 25,
        preferredAvailability = [],
        limit = 20
      } = criteria;

      // Get current user's profile
      const currentUser = await this.getUserProfile(userId);
      if (!currentUser) {
        throw new Error('User profile not found');
      }

      // Build base query
      const whereClause = {
        id: { not: userId },
        isActive: true,
        banned: false
      };

      if (minReputation > 0) {
        whereClause.reputation = { gte: minReputation };
      }

      // Get potential matches
      const potentialMatches = await this.prisma.user.findMany({
        where: whereClause,
        include: {
          skills: {
            where: { isActive: true },
            include: {
              exchanges: {
                where: { status: 'completed' },
                include: {
                  receivedReviews: true
                }
              }
            }
          }
        },
        take: limit * 3 // Get more to filter and rank
      });

      // Score each potential match
      const scoredMatches = [];
      
      for (const candidate of potentialMatches) {
        const score = await this.calculateMatchScore(currentUser, candidate, criteria);
        
        if (score.totalScore >= minMatchScore) {
          scoredMatches.push({
            user: candidate,
            matchScore: score,
            compatibilityFactors: score.factors
          });
        }
      }

      // Sort by match score and return top matches
      scoredMatches.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);

      return {
        matches: scoredMatches.slice(0, limit),
        total: scoredMatches.length,
        criteria,
        algorithm: 'advanced_matching'
      };

    } catch (error) {
      console.error('User matching error:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive match score between two users
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @param {object} criteria - Matching criteria
   * @returns {object} Match score breakdown
   */
  async calculateMatchScore(user1, user2, criteria) {
    try {
      const factors = {};

      // 1. Skill Relevance Score
      factors.skillRelevance = await this.calculateSkillRelevance(user1, user2, criteria);

      // 2. Personality Compatibility
      factors.personalityMatch = this.calculatePersonalityCompatibility(user1, user2);

      // 3. Location Proximity
      factors.locationProximity = this.calculateLocationProximity(
        user1, user2, criteria.maxDistance || 50
      );

      // 4. Availability Overlap
      factors.availabilityMatch = this.calculateAvailabilityMatch(
        user1, user2, criteria.preferredAvailability || []
      );

      // 5. Experience Level Alignment
      factors.experienceLevel = this.calculateExperienceAlignment(user1, user2);

      // 6. Communication Style Compatibility
      factors.communicationStyle = this.calculateCommunicationCompatibility(user1, user2);

      // Calculate weighted total score
      let totalScore = 0;
      let weightSum = 0;

      for (const [factorName, weight] of Object.entries(this.matchingWeights)) {
        if (factors[factorName] !== undefined) {
          totalScore += factors[factorName] * weight;
          weightSum += weight;
        }
      }

      // Normalize score
      const normalizedScore = weightSum > 0 ? totalScore / weightSum : 0;

      return {
        totalScore: Math.round(normalizedScore * 100) / 100,
        factors,
        breakdown: this.getScoreBreakdown(factors)
      };

    } catch (error) {
      console.error('Match score calculation error:', error);
      return {
        totalScore: 0,
        factors: {},
        breakdown: {}
      };
    }
  }

  /**
   * Calculate skill relevance score
   * @param {object} user1 - User looking for skills
   * @param {object} user2 - User offering skills
   * @param {object} criteria - Matching criteria
   * @returns {number} Skill relevance score (0-1)
   */
  async calculateSkillRelevance(user1, user2, criteria) {
    try {
      const { wantedSkills = [], offeredSkills = [] } = criteria;
      
      // Get user's skill needs (skills they want to learn)
      const userNeeds = wantedSkills.length > 0 ? wantedSkills : user1.interests || [];
      
      // Get candidate's skills (skills they can teach)
      const candidateSkills = user2.skills.map(skill => skill.title.toLowerCase());
      
      if (userNeeds.length === 0 || candidateSkills.length === 0) {
        return 0;
      }

      // Calculate relevance using Jaccard similarity and semantic matching
      const directMatches = userNeeds.filter(need => 
        candidateSkills.some(skill => 
          skill.includes(need.toLowerCase()) || need.toLowerCase().includes(skill)
        )
      ).length;

      const semanticMatches = await this.findSemanticMatches(userNeeds, candidateSkills);

      const totalMatches = directMatches + semanticMatches;
      const relevanceScore = Math.min(1, totalMatches / userNeeds.length);

      // Bonus for verified skills
      const verifiedBonus = user2.skills.filter(skill => skill.isVerified).length * 0.1;
      
      // Bonus for high-rated skills
      const ratingBonus = user2.skills.reduce((sum, skill) => {
        return sum + (skill.rating || 0) / 5 * 0.1;
      }, 0);

      return Math.min(1, relevanceScore + verifiedBonus + ratingBonus);

    } catch (error) {
      console.error('Skill relevance calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate personality compatibility
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @returns {number} Personality match score (0-1)
   */
  calculatePersonalityCompatibility(user1, user2) {
    try {
      if (!user1.personalityType || !user2.personalityType) {
        return 0.5; // Neutral score if personality not available
      }

      // Personality type compatibility matrix
      const compatibilityMatrix = {
        'INTJ': { 'ENFP': 0.9, 'ENTP': 0.8, 'INFJ': 0.7, 'INTJ': 0.6 },
        'INTP': { 'ENTJ': 0.9, 'ENTP': 0.8, 'INFJ': 0.7, 'INTP': 0.6 },
        'ENTJ': { 'INTP': 0.9, 'INFP': 0.7, 'ENTJ': 0.6, 'ENFJ': 0.6 },
        'ENTP': { 'INTJ': 0.8, 'INTP': 0.8, 'INFJ': 0.6, 'ENTP': 0.6 },
        'INFJ': { 'ENFP': 0.8, 'ENTP': 0.6, 'INFJ': 0.7, 'INTJ': 0.7 },
        'INFP': { 'ENFJ': 0.8, 'ENTJ': 0.7, 'INFP': 0.7, 'ENFP': 0.6 },
        'ENFJ': { 'INFP': 0.8, 'ISFP': 0.7, 'ENFJ': 0.7, 'ENFP': 0.6 },
        'ENFP': { 'INTJ': 0.9, 'INFJ': 0.8, 'ENFP': 0.6, 'ENFJ': 0.6 },
        'ISTJ': { 'ESFP': 0.7, 'ESTP': 0.7, 'ISTJ': 0.6, 'ISFJ': 0.6 },
        'ISFJ': { 'ESFP': 0.7, 'ESTP': 0.7, 'ISFJ': 0.7, 'ISTJ': 0.6 },
        'ESTJ': { 'ISFP': 0.7, 'ISTP': 0.7, 'ESTJ': 0.6, 'ESFJ': 0.6 },
        'ESFJ': { 'ISFP': 0.7, 'ISTP': 0.7, 'ESFJ': 0.7, 'ESTJ': 0.6 },
        'ISTP': { 'ESFJ': 0.7, 'ESTJ': 0.7, 'ISTP': 0.6, 'ISFP': 0.6 },
        'ISFP': { 'ESFJ': 0.7, 'ESTJ': 0.7, 'ISFP': 0.6, 'ISTP': 0.6 },
        'ESTP': { 'ISFJ': 0.7, 'ISTJ': 0.7, 'ESTP': 0.6, 'ESFP': 0.6 },
        'ESFP': { 'ISFJ': 0.7, 'ISTJ': 0.7, 'ESFP': 0.6, 'ESTP': 0.6 }
      };

      const user1Type = user1.personalityType;
      const user2Type = user2.personalityType;
      
      if (compatibilityMatrix[user1Type] && compatibilityMatrix[user1Type][user2Type]) {
        return compatibilityMatrix[user1Type][user2Type];
      }

      // Default compatibility for unknown combinations
      return 0.5;

    } catch (error) {
      console.error('Personality compatibility error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate location proximity score
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @param {number} maxDistance - Maximum acceptable distance
   * @returns {number} Location proximity score (0-1)
   */
  calculateLocationProximity(user1, user2, maxDistance = 50) {
    try {
      if (!user1.location || !user2.location) {
        return 0.3; // Lower score if location not available
      }

      // In a real implementation, you would use geocoding services
      // For now, we'll use simple string matching
      const user1Location = user1.location.toLowerCase();
      const user2Location = user2.location.toLowerCase();

      if (user1Location === user2Location) {
        return 1.0; // Same location
      }

      if (user1Location.includes(user2Location) || user2Location.includes(user1Location)) {
        return 0.8; // Similar location
      }

      // Check if they're in the same region/state/country
      const user1Parts = user1Location.split(',').map(part => part.trim());
      const user2Parts = user2Location.split(',').map(part => part.trim());

      const commonParts = user1Parts.filter(part => 
        user2Parts.some(user2Part => 
          part === user2Part || part.includes(user2Part) || user2Part.includes(part)
        )
      );

      if (commonParts.length > 0) {
        return 0.6;
      }

      return 0.2; // Different locations

    } catch (error) {
      console.error('Location proximity calculation error:', error);
      return 0.3;
    }
  }

  /**
   * Calculate availability overlap score
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @param {Array} preferredTimes - Preferred time slots
   * @returns {number} Availability match score (0-1)
   */
  calculateAvailabilityMatch(user1, user2, preferredTimes = []) {
    try {
      const user1Availability = user1.availability || {};
      const user2Availability = user2.availability || {};

      // Default availability: 9 AM - 6 PM weekdays
      const defaultAvailability = {
        weekdays: { start: 9, end: 18 },
        weekends: { start: 10, end: 16 }
      };

      const avail1 = { ...defaultAvailability, ...user1Availability };
      const avail2 = { ...defaultAvailability, ...user2Availability };

      // Calculate overlap in hours per week
      let totalOverlap = 0;
      let totalPossible = 0;

      // Weekdays overlap
      const weekdayOverlap = Math.max(0, Math.min(avail1.weekdays?.end || 18, avail2.weekdays?.end || 18) - 
                                   Math.max(avail1.weekdays?.start || 9, avail2.weekdays?.start || 9));
      totalOverlap += weekdayOverlap * 5; // 5 weekdays
      totalPossible += (avail1.weekdays?.end || 18) - (avail1.weekdays?.start || 9);

      // Weekend overlap
      const weekendOverlap = Math.max(0, Math.min(avail1.weekends?.end || 16, avail2.weekends?.end || 16) - 
                                     Math.max(avail1.weekends?.start || 10, avail2.weekends?.start || 10));
      totalOverlap += weekendOverlap * 2; // 2 weekend days
      totalPossible += (avail1.weekends?.end || 16) - (avail1.weekends?.start || 10);

      const overlapRatio = totalPossible > 0 ? totalOverlap / totalPossible : 0;

      // Bonus for preferred time matches
      let preferenceBonus = 0;
      if (preferredTimes.length > 0) {
        const matchedPreferences = preferredTimes.filter(time => 
          this.timeMatchesAvailability(time, avail2)
        ).length;
        preferenceBonus = matchedPreferences / preferredTimes.length * 0.2;
      }

      return Math.min(1, overlapRatio + preferenceBonus);

    } catch (error) {
      console.error('Availability match calculation error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate experience level alignment
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @returns {number} Experience alignment score (0-1)
   */
  calculateExperienceAlignment(user1, user2) {
    try {
      // Compare overall experience levels
      const user1Level = user1.level || 1;
      const user2Level = user2.level || 1;

      const levelDifference = Math.abs(user1Level - user2Level);
      
      // Optimal difference is 1-3 levels (complementary but not too far apart)
      let score;
      if (levelDifference === 0) {
        score = 0.7; // Same level - good for peer learning
      } else if (levelDifference <= 3) {
        score = 0.9; // Perfect difference for skill exchange
      } else if (levelDifference <= 5) {
        score = 0.6; // Still acceptable
      } else {
        score = 0.3; // Too far apart
      }

      // Bonus for high reputation and consistent activity
      const repBonus = Math.min(0.1, (user2.reputation || 0) / 1000 * 0.1);

      return Math.min(1, score + repBonus);

    } catch (error) {
      console.error('Experience alignment calculation error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate communication style compatibility
   * @param {object} user1 - First user
   * @param {object} user2 - Second user
   * @returns {number} Communication compatibility score (0-1)
   */
  calculateCommunicationCompatibility(user1, user2) {
    try {
      // This would analyze communication preferences and styles
      // For now, we'll use simple heuristics based on user activity and response time

      const user1ResponseTime = user1.responseTime || 24; // hours
      const user2ResponseTime = user2.responseTime || 24;

      // Similar response times indicate compatible communication styles
      const responseDiff = Math.abs(user1ResponseTime - user2ResponseTime);
      const responseScore = Math.max(0, 1 - (responseDiff / 24)); // Decay over 24 hours

      // Bonus for active users
      const user1ActivityBonus = user1.lastActivity ? 
        (Date.now() - new Date(user1.lastActivity).getTime()) < 7 * 24 * 60 * 60 * 1000 ? 0.1 : 0 : 0;
      const user2ActivityBonus = user2.lastActivity ? 
        (Date.now() - new Date(user2.lastActivity).getTime()) < 7 * 24 * 60 * 60 * 1000 ? 0.1 : 0 : 0;

      return Math.min(1, responseScore + user1ActivityBonus + user2ActivityBonus);

    } catch (error) {
      console.error('Communication compatibility error:', error);
      return 0.5;
    }
  }

  /**
   * Find semantic matches between skill needs and offerings
   * @param {Array} needs - User skill needs
   * @param {Array} skills - Available skills
   * @returns {number} Number of semantic matches
   */
  async findSemanticMatches(needs, skills) {
    try {
      // This would use NLP services or embedding models
      // For now, we'll use simple keyword matching with synonyms

      const skillSynonyms = {
        'programming': ['coding', 'development', 'software', 'web development'],
        'design': ['graphic design', 'ui/ux', 'visual design'],
        'marketing': ['digital marketing', 'advertising', 'promotion'],
        'music': ['instrument', 'singing', 'composition'],
        'language': ['linguistic', 'communication', 'speaking']
      };

      let semanticMatches = 0;

      for (const need of needs) {
        const needLower = need.toLowerCase();
        
        for (const skill of skills) {
          const skillLower = skill.toLowerCase();
          
          // Check direct synonym matches
          if (skillSynonyms[needLower]) {
            const synonyms = skillSynonyms[needLower];
            if (synonyms.some(synonym => skillLower.includes(synonym))) {
              semanticMatches++;
              break;
            }
          }
          
          // Check partial matches
          const words = needLower.split(' ');
          if (words.some(word => skillLower.includes(word) && word.length > 3)) {
            semanticMatches++;
            break;
          }
        }
      }

      return semanticMatches;

    } catch (error) {
      console.error('Semantic matching error:', error);
      return 0;
    }
  }

  /**
   * Check if preferred time matches availability
   * @param {string} preferredTime - Preferred time slot
   * @param {object} availability - User availability
   * @returns {boolean} Whether time matches
   */
  timeMatchesAvailability(preferredTime, availability) {
    // This would parse time preferences and check against availability
    // Simplified implementation
    return true; // Placeholder
  }

  /**
   * Get user profile with related data
   * @param {number} userId - User ID
   * @returns {object} User profile
   */
  async getUserProfile(userId) {
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
              receivedReviews: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get score breakdown for display
   * @param {object} factors - Score factors
   * @returns {object} Score breakdown
   */
  getScoreBreakdown(factors) {
    return {
      skillRelevance: Math.round((factors.skillRelevance || 0) * 100),
      personalityMatch: Math.round((factors.personalityMatch || 0) * 100),
      locationProximity: Math.round((factors.locationProximity || 0) * 100),
      availabilityMatch: Math.round((factors.availabilityMatch || 0) * 100),
      experienceLevel: Math.round((factors.experienceLevel || 0) * 100),
      communicationStyle: Math.round((factors.communicationStyle || 0) * 100)
    };
  }

  /**
   * Find similar users (collaborative filtering)
   * @param {number} userId - User ID
   * @param {number} limit - Number of similar users to find
   * @returns {Array} Similar users
   */
  async findSimilarUsers(userId, limit = 10) {
    try {
      const currentUser = await this.getUserProfile(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Find users with similar skills and interests
      const similarUsers = await this.prisma.user.findMany({
        where: {
          id: { not: userId },
          isActive: true,
          OR: [
            {
              interests: {
                hasSome: currentUser.interests || []
              }
            },
            {
              skills: {
                some: {
                  category: {
                    in: currentUser.skills.map(skill => skill.category)
                  }
                }
              }
            }
          ]
        },
        include: {
          skills: true,
          _count: {
            select: {
              exchanges: {
                where: { status: 'completed' }
              }
            }
          }
        },
        take: limit * 2
      });

      // Calculate similarity scores
      const scoredUsers = similarUsers.map(user => {
        const similarity = this.calculateUserSimilarity(currentUser, user);
        return {
          user,
          similarityScore: similarity
        };
      });

      // Sort by similarity and return top matches
      scoredUsers.sort((a, b) => b.similarityScore - a.similarityScore);

      return scoredUsers.slice(0, limit);

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

      // Interest overlap
      const commonInterests = (user1.interests || []).filter(interest => 
        (user2.interests || []).includes(interest)
      ).length;
      
      const totalInterests = new Set([...user1.interests || [], ...user2.interests || []]).size;
      if (totalInterests > 0) {
        similarity += commonInterests / totalInterests;
        factors++;
      }

      // Skill category overlap
      const user1Categories = new Set(user1.skills.map(skill => skill.category));
      const user2Categories = new Set(user2.skills.map(skill => skill.category));
      const commonCategories = new Set([...user1Categories].filter(cat => user2Categories.has(cat))).size;
      const totalCategories = new Set([...user1Categories, ...user2Categories]).size;
      
      if (totalCategories > 0) {
        similarity += commonCategories / totalCategories;
        factors++;
      }

      // Reputation similarity (normalize difference)
      const repDiff = Math.abs((user1.reputation || 0) - (user2.reputation || 0));
      const maxRep = Math.max(user1.reputation || 0, user2.reputation || 0, 1000);
      const repSimilarity = Math.max(0, 1 - (repDiff / maxRep));
      
      similarity += repSimilarity;
      factors++;

      return factors > 0 ? similarity / factors : 0;

    } catch (error) {
      console.error('User similarity calculation error:', error);
      return 0;
    }
  }

  /**
   * Get discovery statistics
   * @param {number} userId - User ID
   * @returns {object} Discovery statistics
   */
  async getDiscoveryStats(userId) {
    try {
      const [totalMatches, verifiedSkills, successfulExchanges] = await Promise.all([
        this.findMatches(userId, { limit: 1000 }).then(result => result.total),
        this.prisma.skill.count({ where: { userId, isVerified: true } }),
        this.prisma.exchange.count({
          where: {
            OR: [
              { requesterId: userId },
              { providerId: userId }
            ],
            status: 'completed'
          }
        })
      ]);

      return {
        totalPotentialMatches: totalMatches,
        verifiedSkills,
        successfulExchanges,
        matchRate: totalMatches > 0 ? successfulExchanges / totalMatches : 0
      };

    } catch (error) {
      console.error('Failed to get discovery stats:', error);
      return {
        totalPotentialMatches: 0,
        verifiedSkills: 0,
        successfulExchanges: 0,
        matchRate: 0
      };
    }
  }
}

module.exports = new UserMatchingService();