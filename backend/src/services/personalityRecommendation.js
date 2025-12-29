const { PrismaClient } = require('@prisma/client');
const math = require('mathjs');

/**
 * Personality-Based Recommendation Engine
 * Advanced recommendation system that considers user personality types, preferences, and behavioral patterns
 */
class PersonalityRecommendationEngine {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Personality type definitions with characteristics
    this.personalityTypes = {
      'INTJ': {
        name: 'The Architect',
        description: 'Imaginative, strategic thinkers with a plan for everything',
        traits: ['strategic', 'independent', 'decisive', 'logical'],
        learningStyle: 'structured',
        communicationStyle: 'direct',
        preferredDifficulty: 'advanced',
        skillCategories: ['Programming', 'Technology', 'Business'],
        collaborationStyle: 'autonomous'
      },
      'INTP': {
        name: 'The Thinker',
        description: 'Innovative inventors with an unquenchable thirst for knowledge',
        traits: ['analytical', 'curious', 'theoretical', 'independent'],
        learningStyle: 'theoretical',
        communicationStyle: 'thoughtful',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Academic', 'Programming', 'Creative'],
        collaborationStyle: 'independent'
      },
      'ENTJ': {
        name: 'The Commander',
        description: 'Bold, imaginative and strong-willed, who find or make a way',
        traits: ['leadership', 'strategic', 'efficient', 'goal-oriented'],
        learningStyle: 'practical',
        communicationStyle: 'assertive',
        preferredDifficulty: 'advanced',
        skillCategories: ['Business', 'Leadership', 'Technology'],
        collaborationStyle: 'leadership'
      },
      'ENTP': {
        name: 'The Debater',
        description: 'Smart and curious thinkers who cannot resist an intellectual challenge',
        traits: ['innovative', 'curious', 'energetic', 'versatile'],
        learningStyle: 'experimental',
        communicationStyle: 'enthusiastic',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Creative', 'Business', 'Technology'],
        collaborationStyle: 'collaborative'
      },
      'INFJ': {
        name: 'The Advocate',
        description: 'Quiet and mystical, yet very inspiring and tireless idealists',
        traits: ['insightful', 'idealistic', 'creative', 'caring'],
        learningStyle: 'reflective',
        communicationStyle: 'empathetic',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Creative', 'Language', 'Lifestyle'],
        collaborationStyle: 'supportive'
      },
      'INFP': {
        name: 'The Mediator',
        description: 'Poetic, kind and altruistic people, always eager to help good causes',
        traits: ['idealistic', 'creative', 'adaptable', 'principled'],
        learningStyle: 'creative',
        communicationStyle: 'gentle',
        preferredDifficulty: 'beginner',
        skillCategories: ['Creative', 'Language', 'Lifestyle'],
        collaborationStyle: 'cooperative'
      },
      'ENFJ': {
        name: 'The Protagonist',
        description: 'Charismatic and inspiring leaders, able to mesmerize listeners',
        traits: ['charismatic', 'reliable', 'idealistic', 'organized'],
        learningStyle: 'interactive',
        communicationStyle: 'warm',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Business', 'Language', 'Lifestyle'],
        collaborationStyle: 'supportive'
      },
      'ENFP': {
        name: 'The Campaigner',
        description: 'Enthusiastic, creative and sociable free spirits, who can always find a reason to smile',
        traits: ['enthusiastic', 'creative', 'sociable', 'optimistic'],
        learningStyle: 'interactive',
        communicationStyle: 'expressive',
        preferredDifficulty: 'beginner',
        skillCategories: ['Creative', 'Business', 'Language'],
        collaborationStyle: 'collaborative'
      },
      'ISTJ': {
        name: 'The Logistician',
        description: 'Practical and fact-minded, whose reliability cannot be doubted',
        traits: ['responsible', 'logical', 'organized', 'steady'],
        learningStyle: 'structured',
        communicationStyle: 'direct',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Business', 'Academic', 'Technology'],
        collaborationStyle: 'systematic'
      },
      'ISFJ': {
        name: 'The Protector',
        description: 'Very dedicated and warm protectors, always ready to defend their loved ones',
        traits: ['reliable', 'caring', 'loyal', 'practical'],
        learningStyle: 'supportive',
        communicationStyle: 'considerate',
        preferredDifficulty: 'beginner',
        skillCategories: ['Lifestyle', 'Creative', 'Language'],
        collaborationStyle: 'cooperative'
      },
      'ESTJ': {
        name: 'The Executive',
        description: 'Excellent administrators, unsurpassed at managing things or people',
        traits: ['efficient', 'organized', 'logical', 'responsible'],
        learningStyle: 'practical',
        communicationStyle: 'clear',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Business', 'Technology', 'Leadership'],
        collaborationStyle: 'leadership'
      },
      'ESFJ': {
        name: 'The Consul',
        description: 'Extraordinarily caring, social and popular people, always eager to help',
        traits: ['caring', 'organized', 'reliable', 'sociable'],
        learningStyle: 'interactive',
        communicationStyle: 'warm',
        preferredDifficulty: 'beginner',
        skillCategories: ['Lifestyle', 'Business', 'Language'],
        collaborationStyle: 'supportive'
      },
      'ISTP': {
        name: 'The Virtuoso',
        description: 'Bold and practical experimenters, masters of all kinds of tools',
        traits: ['practical', 'analytical', 'independent', 'resourceful'],
        learningStyle: 'hands-on',
        communicationStyle: 'concise',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Technology', 'Creative', 'Lifestyle'],
        collaborationStyle: 'autonomous'
      },
      'ISFP': {
        name: 'The Adventurer',
        description: 'Flexible and charming artists, always ready to explore new possibilities',
        traits: ['flexible', 'artistic', 'sensitive', 'curious'],
        learningStyle: 'creative',
        communicationStyle: 'gentle',
        preferredDifficulty: 'beginner',
        skillCategories: ['Creative', 'Lifestyle', 'Language'],
        collaborationStyle: 'cooperative'
      },
      'ESTP': {
        name: 'The Entrepreneur',
        description: 'Smart, energetic and perceptive people, who truly enjoy living on the edge',
        traits: ['energetic', 'practical', 'observant', 'resourceful'],
        learningStyle: 'experiential',
        communicationStyle: 'direct',
        preferredDifficulty: 'intermediate',
        skillCategories: ['Business', 'Technology', 'Lifestyle'],
        collaborationStyle: 'practical'
      },
      'ESFP': {
        name: 'The Entertainer',
        description: 'Spontaneous, energetic and enthusiastic people - life is never boring around them',
        traits: ['enthusiastic', 'spontaneous', 'caring', 'flexible'],
        learningStyle: 'interactive',
        communicationStyle: 'expressive',
        preferredDifficulty: 'beginner',
        skillCategories: ['Creative', 'Lifestyle', 'Language'],
        collaborationStyle: 'supportive'
      }
    };

    // Learning style preferences for different personality types
    this.learningStylePreferences = {
      'structured': {
        preferredFormats: ['course', 'curriculum', 'tutorial'],
        preferredDuration: '60-120',
        preferredScheduling: 'regular',
        contentStyle: 'step-by-step'
      },
      'creative': {
        preferredFormats: ['workshop', 'project-based', 'collaborative'],
        preferredDuration: '30-90',
        preferredScheduling: 'flexible',
        contentStyle: 'explorative'
      },
      'theoretical': {
        preferredFormats: ['lecture', 'reading', 'discussion'],
        preferredDuration: '60-180',
        preferredScheduling: 'self-paced',
        contentStyle: 'comprehensive'
      },
      'hands-on': {
        preferredFormats: ['practical', 'demonstration', 'practice'],
        preferredDuration: '45-90',
        preferredScheduling: 'flexible',
        contentStyle: 'applied'
      },
      'interactive': {
        preferredFormats: ['group', 'discussion', 'mentoring'],
        preferredDuration: '30-120',
        preferredScheduling: 'regular',
        contentStyle: 'social'
      },
      'reflective': {
        preferredFormats: ['self-study', 'reflection', 'journaling'],
        preferredDuration: '45-90',
        preferredScheduling: 'flexible',
        contentStyle: 'mindful'
      },
      'experimental': {
        preferredFormats: ['trial-and-error', 'exploration', 'research'],
        preferredDuration: '60-120',
        preferredScheduling: 'irregular',
        contentStyle: 'discovery'
      },
      'supportive': {
        preferredFormats: ['mentoring', 'peer-learning', 'support-group'],
        preferredDuration: '45-90',
        preferredScheduling: 'regular',
        contentStyle: 'encouraging'
      },
      'experiential': {
        preferredFormats: ['real-world', 'internship', 'apprenticeship'],
        preferredDuration: '120-240',
        preferredScheduling: 'intensive',
        contentStyle: 'immersive'
      },
      'practical': {
        preferredFormats: ['application', 'case-study', 'problem-solving'],
        preferredDuration: '60-90',
        preferredScheduling: 'structured',
        contentStyle: 'results-oriented'
      }
    };

    // Personality-based skill category weights
    this.categoryPersonalityWeights = {
      'INTJ': { 'Programming': 0.9, 'Technology': 0.8, 'Business': 0.7, 'Academic': 0.6 },
      'INTP': { 'Academic': 0.9, 'Programming': 0.8, 'Creative': 0.7, 'Technology': 0.6 },
      'ENTJ': { 'Business': 0.9, 'Leadership': 0.9, 'Technology': 0.7, 'Programming': 0.6 },
      'ENTP': { 'Creative': 0.9, 'Business': 0.7, 'Technology': 0.7, 'Programming': 0.5 },
      'INFJ': { 'Creative': 0.8, 'Language': 0.8, 'Lifestyle': 0.7, 'Business': 0.5 },
      'INFP': { 'Creative': 0.9, 'Language': 0.8, 'Lifestyle': 0.7, 'Academic': 0.5 },
      'ENFJ': { 'Business': 0.8, 'Language': 0.8, 'Lifestyle': 0.7, 'Academic': 0.6 },
      'ENFP': { 'Creative': 0.9, 'Business': 0.7, 'Language': 0.7, 'Technology': 0.5 },
      'ISTJ': { 'Business': 0.8, 'Academic': 0.7, 'Technology': 0.7, 'Programming': 0.6 },
      'ISFJ': { 'Lifestyle': 0.8, 'Creative': 0.7, 'Language': 0.6, 'Business': 0.5 },
      'ESTJ': { 'Business': 0.9, 'Technology': 0.8, 'Leadership': 0.8, 'Programming': 0.6 },
      'ESFJ': { 'Lifestyle': 0.8, 'Business': 0.7, 'Language': 0.7, 'Creative': 0.6 },
      'ISTP': { 'Technology': 0.9, 'Creative': 0.7, 'Lifestyle': 0.6, 'Business': 0.5 },
      'ISFP': { 'Creative': 0.9, 'Lifestyle': 0.8, 'Language': 0.6, 'Business': 0.4 },
      'ESTP': { 'Business': 0.8, 'Technology': 0.8, 'Lifestyle': 0.7, 'Programming': 0.5 },
      'ESFP': { 'Creative': 0.9, 'Lifestyle': 0.8, 'Language': 0.7, 'Business': 0.5 }
    };
  }

  /**
   * Get personalized skill recommendations for a user
   * @param {number} userId - User ID
   * @param {object} options - Recommendation options
   * @returns {object} Personalized recommendations
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    try {
      const {
        limit = 20,
        categories = [],
        excludeSeen = true,
        considerPersonality = true,
        considerBehavior = true,
        considerSocial = true
      } = options;

      // Get user profile with personality data
      const user = await this.getUserPersonalityProfile(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get base recommendations based on different factors
      const [personalityRecommendations, behaviorRecommendations, socialRecommendations] = await Promise.all([
        considerPersonality ? this.getPersonalityBasedRecommendations(user, limit * 0.5) : [],
        considerBehavior ? this.getBehaviorBasedRecommendations(user, limit * 0.3) : [],
        considerSocial ? this.getSocialBasedRecommendations(user, limit * 0.2) : []
      ]);

      // Combine and rank recommendations
      let combinedRecommendations = [
        ...personalityRecommendations.map(rec => ({ ...rec, source: 'personality', weight: 1.0 })),
        ...behaviorRecommendations.map(rec => ({ ...rec, source: 'behavior', weight: 0.8 })),
        ...socialRecommendations.map(rec => ({ ...rec, source: 'social', weight: 0.6 }))
      ];

      // Remove duplicates and already seen skills
      if (excludeSeen) {
        combinedRecommendations = this.removeSeenSkills(combinedRecommendations, userId);
      }

      // Filter by requested categories
      if (categories.length > 0) {
        combinedRecommendations = combinedRecommendations.filter(rec => 
          categories.includes(rec.category)
        );
      }

      // Rank recommendations by composite score
      const rankedRecommendations = this.rankRecommendations(combinedRecommendations, user);

      return {
        recommendations: rankedRecommendations.slice(0, limit),
        personalityProfile: user.personalityType,
        learningStyle: this.getPersonalityLearningStyle(user.personalityType),
        recommendationBreakdown: {
          personality: personalityRecommendations.length,
          behavior: behaviorRecommendations.length,
          social: socialRecommendations.length
        }
      };

    } catch (error) {
      console.error('Personalized recommendations error:', error);
      throw error;
    }
  }

  /**
   * Get user's personality profile
   * @param {number} userId - User ID
   * @returns {object} User personality profile
   */
  async getUserPersonalityProfile(userId) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          skills: true,
          exchanges: {
            where: { status: 'completed' },
            include: {
              receivedReviews: true,
              skill: true
            }
          },
          userPreferences: true,
          preferences: {
            where: {
              category: 'learning_style'
            }
          }
        }
      });

      if (!user) return null;

      // Calculate personality-based scores
      const personalityProfile = this.analyzeUserPersonality(user);
      
      return {
        ...user,
        personalityProfile,
        personalityType: user.personalityType || this.inferPersonalityType(user),
        learningPreferences: this.extractLearningPreferences(user),
        skillPreferences: this.analyzeSkillPreferences(user),
        collaborationStyle: this.determineCollaborationStyle(user)
      };

    } catch (error) {
      console.error('Failed to get user personality profile:', error);
      return null;
    }
  }

  /**
   * Get recommendations based on personality type
   * @param {object} user - User profile
   * @param {number} limit - Number of recommendations
   * @returns {Array} Personality-based recommendations
   */
  async getPersonalityBasedRecommendations(user, limit = 10) {
    try {
      const personalityType = user.personalityType;
      if (!personalityType || !this.personalityTypes[personalityType]) {
        return [];
      }

      const personality = this.personalityTypes[personalityType];
      const weights = this.categoryPersonalityWeights[personalityType] || {};

      // Find skills matching personality preferences
      const skills = await this.prisma.skill.findMany({
        where: {
          isActive: true,
          userId: { not: user.id },
          category: {
            in: personality.skillCategories
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              reputation: true,
              personalityType: true,
              profilePhoto: true
            }
          },
          exchanges: {
            where: { status: 'completed' },
            include: {
              receivedReviews: true
            }
          }
        }
      });

      // Score skills based on personality fit
      const scoredSkills = skills.map(skill => {
        let score = 0;

        // Base category weight
        score += (weights[skill.category] || 0.5) * 40;

        // Difficulty preference alignment
        const difficultyScore = this.getDifficultyAlignment(skill, personality.preferredDifficulty);
        score += difficultyScore * 20;

        // Learning style alignment
        const learningStyleScore = this.getLearningStyleAlignment(skill, personality.learningStyle);
        score += learningStyleScore * 20;

        // Provider personality compatibility
        if (skill.user.personalityType) {
          const compatibilityScore = this.getPersonalityCompatibility(personalityType, skill.user.personalityType);
          score += compatibilityScore * 15;

          // Bonus for complementary personalities
          if (this.areComplementaryPersonalities(personalityType, skill.user.personalityType)) {
            score += 5;
          }
        }

        // Skill quality factors
        if (skill.rating) score += skill.rating * 2;
        if (skill.isVerified) score += 5;
        if (skill.viewCount > 100) score += Math.min(10, skill.viewCount / 100);

        return {
          ...skill,
          personalityScore: score,
          personalityReasons: this.getPersonalityReasons(skill, personalityType)
        };
      });

      // Sort by personality score and return top recommendations
      return scoredSkills
        .sort((a, b) => b.personalityScore - a.personalityScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Personality-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on user behavior
   * @param {object} user - User profile
   * @param {number} limit - Number of recommendations
   * @returns {Array} Behavior-based recommendations
   */
  async getBehaviorBasedRecommendations(user, limit = 6) {
    try {
      // Analyze user's skill interaction patterns
      const interactionHistory = await this.prisma.activityLog.findMany({
        where: {
          userId: user.id,
          action: { in: ['skill_viewed', 'skill_requested', 'skill_completed'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Get skills in similar categories/tags to what user has interacted with
      const interactedCategories = new Set(
        user.skills.map(skill => skill.category)
      );

      const similarSkills = await this.prisma.skill.findMany({
        where: {
          isActive: true,
          userId: { not: user.id },
          category: { in: Array.from(interactedCategories) }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              reputation: true,
              profilePhoto: true
            }
          }
        },
        take: limit * 2
      });

      // Score based on similarity to user's skill pattern
      const scoredSkills = similarSkills.map(skill => {
        let score = 0;

        // Category familiarity bonus
        score += 20;

        // Tag overlap
        const userTags = new Set(user.skills.flatMap(skill => skill.tags || []));
        const skillTags = new Set(skill.tags || []);
        const commonTags = [...skillTags].filter(tag => userTags.has(tag));
        score += commonTags.length * 3;

        // Quality factors
        if (skill.rating) score += skill.rating * 2;
        if (skill.isVerified) score += 10;

        return {
          ...skill,
          behaviorScore: score
        };
      });

      return scoredSkills
        .sort((a, b) => b.behaviorScore - a.behaviorScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Behavior-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on social signals
   * @param {object} user - User profile
   * @param {number} limit - Number of recommendations
   * @returns {Array} Social-based recommendations
   */
  async getSocialBasedRecommendations(user, limit = 4) {
    try {
      // Get users with similar personalities or complementary skills
      const similarUsers = await this.prisma.user.findMany({
        where: {
          id: { not: user.id },
          isActive: true,
          OR: [
            {
              personalityType: user.personalityType
            },
            {
              skills: {
                some: {
                  category: { in: user.skills.map(skill => skill.category) }
                }
              }
            }
          ]
        },
        include: {
          skills: {
            where: { isActive: true },
            take: 5
          }
        },
        take: limit * 2
      });

      // Collect skills from similar users
      const socialSkills = similarUsers.flatMap(userData => userData.skills);

      // Score based on similarity and provider reputation
      const scoredSkills = socialSkills.map(skill => {
        let score = 0;

        // Similarity bonus
        score += 15;

        // Provider reputation
        const providerScore = Math.min(10, skill.user.reputation / 100);
        score += providerScore;

        // Skill quality
        if (skill.rating) score += skill.rating;
        if (skill.isVerified) score += 5;

        return {
          ...skill,
          socialScore: score
        };
      });

      // Remove duplicates and return top recommendations
      const uniqueSkills = this.removeDuplicateSkills(scoredSkills);
      
      return uniqueSkills
        .sort((a, b) => b.socialScore - a.socialScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Social-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Analyze user personality based on behavior and preferences
   * @param {object} user - User data
   * @returns {object} Personality analysis
   */
  analyzeUserPersonality(user) {
    const analysis = {
      inferredType: null,
      confidence: 0,
      traits: [],
      learningPreferences: {},
      collaborationStyle: null
    };

    // Infer personality type based on available data
    if (user.personalityType) {
      analysis.inferredType = user.personalityType;
      analysis.confidence = 0.9;
    } else {
      analysis.inferredType = this.inferPersonalityType(user);
      analysis.confidence = 0.6;
    }

    // Extract traits from personality type
    if (analysis.inferredType && this.personalityTypes[analysis.inferredType]) {
      const personality = this.personalityTypes[analysis.inferredType];
      analysis.traits = personality.traits;
      analysis.learningPreferences = this.extractLearningPreferences(user);
    }

    return analysis;
  }

  /**
   * Infer personality type from user behavior
   * @param {object} user - User data
   * @returns {string} Inferred personality type
   */
  inferPersonalityType(user) {
    // Simple inference based on available data
    // In a real implementation, this would use more sophisticated algorithms
    
    const { skills, interests, reputation, level } = user;
    
    // Count skill categories
    const categories = skills.map(skill => skill.category);
    const categoryCounts = {};
    categories.forEach(cat => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Simple personality inference based on skill categories and activity
    if (topCategory === 'Programming' || topCategory === 'Technology') {
      return reputation > 500 ? 'INTJ' : 'INTP';
    } else if (topCategory === 'Business') {
      return level > 5 ? 'ENTJ' : 'ESTJ';
    } else if (topCategory === 'Creative') {
      return interests?.includes('artistic') ? 'INFP' : 'ENFP';
    } else if (topCategory === 'Language') {
      return level > 3 ? 'INFJ' : 'ENFJ';
    } else {
      return 'ISFJ'; // Default to nurturing type
    }
  }

  /**
   * Extract learning preferences from user data
   * @param {object} user - User data
   * @returns {object} Learning preferences
   */
  extractLearningPreferences(user) {
    const personality = this.personalityTypes[user.personalityType];
    if (!personality) return {};

    return {
      learningStyle: personality.learningStyle,
      difficulty: personality.preferredDifficulty,
      collaborationStyle: personality.collaborationStyle,
      communicationStyle: personality.communicationStyle
    };
  }

  /**
   * Analyze user's skill preferences
   * @param {object} user - User data
   * @returns {object} Skill preferences
   */
  analyzeSkillPreferences(user) {
    const skills = user.skills || [];
    const categories = {};
    const tags = {};
    const difficulties = {};

    skills.forEach(skill => {
      // Count categories
      categories[skill.category] = (categories[skill.category] || 0) + 1;
      
      // Count tags
      if (skill.tags) {
        skill.tags.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      }
      
      // Count difficulties
      if (skill.difficulty) {
        difficulties[skill.difficulty] = (difficulties[skill.difficulty] || 0) + 1;
      }
    });

    return {
      categories,
      tags,
      difficulties,
      preferredDuration: this.calculatePreferredDuration(skills),
      preferredMode: this.calculatePreferredMode(skills)
    };
  }

  /**
   * Determine collaboration style from user data
   * @param {object} user - User data
   * @returns {string} Collaboration style
   */
  determineCollaborationStyle(user) {
    const personality = this.personalityTypes[user.personalityType];
    return personality?.collaborationStyle || 'cooperative';
  }

  /**
   * Get personality learning style
   * @param {string} personalityType - Personality type
   * @returns {object} Learning style preferences
   */
  getPersonalityLearningStyle(personalityType) {
    const personality = this.personalityTypes[personalityType];
    if (!personality) return {};

    return this.learningStylePreferences[personality.learningStyle] || {};
  }

  /**
   * Calculate difficulty alignment score
   * @param {object} skill - Skill object
   * @param {string} preferredDifficulty - Preferred difficulty level
   * @returns {number} Alignment score (0-1)
   */
  getDifficultyAlignment(skill, preferredDifficulty) {
    if (!skill.difficulty || !preferredDifficulty) return 0.5;
    
    const difficultyMap = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3
    };
    
    const skillLevel = difficultyMap[skill.difficulty] || 2;
    const preferredLevel = difficultyMap[preferredDifficulty] || 2;
    
    // Perfect match gets 1.0, adjacent gets 0.7, far gets 0.3
    const diff = Math.abs(skillLevel - preferredLevel);
    return diff === 0 ? 1.0 : diff === 1 ? 0.7 : 0.3;
  }

  /**
   * Calculate learning style alignment score
   * @param {object} skill - Skill object
   * @param {string} learningStyle - Preferred learning style
   * @returns {number} Alignment score (0-1)
   */
  getLearningStyleAlignment(skill, learningStyle) {
    if (!skill.tags || !learningStyle) return 0.5;

    const learningTags = {
      'structured': ['curriculum', 'course', 'tutorial', 'step-by-step'],
      'creative': ['project-based', 'workshop', 'explorative', 'artistic'],
      'theoretical': ['lecture', 'reading', 'theory', 'comprehensive'],
      'hands-on': ['practical', 'demonstration', 'hands-on', 'applied'],
      'interactive': ['group', 'discussion', 'interactive', 'social'],
      'reflective': ['self-study', 'reflection', 'mindful', 'personal'],
      'experimental': ['trial-and-error', 'exploration', 'discovery', 'research'],
      'supportive': ['mentoring', 'peer-learning', 'support', 'encouraging'],
      'experiential': ['real-world', 'internship', 'apprenticeship', 'immersive'],
      'practical': ['application', 'case-study', 'problem-solving', 'results']
    };

    const relevantTags = learningTags[learningStyle] || [];
    const skillTags = skill.tags.map(tag => tag.toLowerCase());
    
    const matches = relevantTags.filter(tag => 
      skillTags.some(skillTag => skillTag.includes(tag) || tag.includes(skillTag))
    ).length;

    return Math.min(1.0, matches / 3); // Normalize to max of 1.0
  }

  /**
   * Calculate personality compatibility score
   * @param {string} type1 - First personality type
   * @param {string} type2 - Second personality type
   * @returns {number} Compatibility score (0-1)
   */
  getPersonalityCompatibility(type1, type2) {
    if (!type1 || !type2 || !this.personalityTypes[type1] || !this.personalityTypes[type2]) {
      return 0.5;
    }

    // Get compatibility from user matching service
    // For now, return a simple compatibility score
    const personality1 = this.personalityTypes[type1];
    const personality2 = this.personalityTypes[type2];

    // Check if they share communication styles
    if (personality1.communicationStyle === personality2.communicationStyle) {
      return 0.8;
    }

    // Check if they have complementary learning styles
    const compatibleLearningStyles = {
      'structured': ['hands-on', 'practical'],
      'creative': ['experimental', 'interactive'],
      'theoretical': ['reflective', 'supportive'],
      'hands-on': ['structured', 'practical'],
      'interactive': ['creative', 'supportive']
    };

    const compatible = compatibleLearningStyles[personality1.learningStyle]?.includes(personality2.learningStyle);
    return compatible ? 0.7 : 0.5;
  }

  /**
   * Check if two personalities are complementary
   * @param {string} type1 - First personality type
   * @param {string} type2 - Second personality type
   * @returns {boolean} Whether they are complementary
   */
  areComplementaryPersonalities(type1, type2) {
    const complementaryPairs = [
      ['INTJ', 'ENFP'], ['INTJ', 'ENTP'],
      ['INTP', 'ENTJ'], ['INTP', 'ENFJ'],
      ['ENTJ', 'INTP'], ['ENTJ', 'INFP'],
      ['ENTP', 'INFJ'], ['ENTP', 'INTJ'],
      ['INFJ', 'ENTP'], ['INFJ', 'ENFP'],
      ['INFP', 'ENTJ'], ['INFP', 'ENFJ'],
      ['ENFJ', 'INTP'], ['ENFJ', 'INFP'],
      ['ENFP', 'INTJ'], ['ENFP', 'INFJ']
    ];

    return complementaryPairs.some(pair => 
      (pair[0] === type1 && pair[1] === type2) || 
      (pair[0] === type2 && pair[1] === type1)
    );
  }

  /**
   * Get reasons why a skill matches user's personality
   * @param {object} skill - Skill object
   * @param {string} personalityType - User's personality type
   * @returns {Array} Explanation reasons
   */
  getPersonalityReasons(skill, personalityType) {
    const reasons = [];
    const personality = this.personalityTypes[personalityType];

    if (!personality) return reasons;

    // Category match
    if (personality.skillCategories.includes(skill.category)) {
      reasons.push(`This ${skill.category} skill aligns with your ${personality.name} personality`);
    }

    // Difficulty match
    const difficultyAlignment = this.getDifficultyAlignment(skill, personality.preferredDifficulty);
    if (difficultyAlignment > 0.7) {
      reasons.push(`The ${skill.difficulty} level matches your preferred challenge level`);
    }

    // Learning style match
    const learningAlignment = this.getLearningStyleAlignment(skill, personality.learningStyle);
    if (learningAlignment > 0.7) {
      reasons.push(`This skill's format matches your ${personality.learningStyle} learning style`);
    }

    return reasons;
  }

  /**
   * Remove already seen skills from recommendations
   * @param {Array} recommendations - Recommendations to filter
   * @param {number} userId - User ID
   * @returns {Array} Filtered recommendations
   */
  removeSeenSkills(recommendations, userId) {
    // This would check against user's interaction history
    // For now, return all recommendations
    return recommendations;
  }

  /**
   * Remove duplicate skills from recommendations
   * @param {Array} skills - Skills array
   * @returns {Array} Unique skills
   */
  removeDuplicateSkills(skills) {
    const seen = new Set();
    return skills.filter(skill => {
      if (seen.has(skill.id)) {
        return false;
      }
      seen.add(skill.id);
      return true;
    });
  }

  /**
   * Rank recommendations by composite score
   * @param {Array} recommendations - Combined recommendations
   * @param {object} user - User profile
   * @returns {Array} Ranked recommendations
   */
  rankRecommendations(recommendations, user) {
    return recommendations.map(rec => {
      let compositeScore = 0;

      // Personality match (highest weight)
      if (rec.personalityScore) {
        compositeScore += rec.personalityScore * 0.4;
      }

      // Behavior match
      if (rec.behaviorScore) {
        compositeScore += rec.behaviorScore * 0.3;
      }

      // Social match
      if (rec.socialScore) {
        compositeScore += rec.socialScore * 0.2;

      // Skill quality factors
      if (rec.rating) compositeScore += rec.rating * 2;
      if (rec.isVerified) compositeScore += 5;
      if (rec.viewCount > 100) compositeScore += Math.min(10, rec.viewCount / 100);
      }
      
      return {
        ...rec,
        compositeScore,
        personalizedReasons: [
          ...(rec.personalityReasons || []),
          rec.rating > 4 ? 'Highly rated by learners' : null,
          rec.isVerified ? 'Verified skill quality' : null,
          rec.viewCount > 100 ? 'Popular with learners' : null
        ].filter(Boolean)
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Calculate preferred session duration
   * @param {Array} skills - User's skills
   * @returns {number} Preferred duration in minutes
   */
  calculatePreferredDuration(skills) {
    if (skills.length === 0) return 60; // Default 1 hour
    
    const durations = skills.map(skill => skill.duration).filter(d => d);
    if (durations.length === 0) return 60;
    
    return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
  }

  /**
   * Calculate preferred session mode
   * @param {Array} skills - User's skills
   * @returns {string} Preferred mode
   */
  calculatePreferredMode(skills) {
    if (skills.length === 0) return 'online'; // Default
    
    const modes = skills.map(skill => skill.mode).filter(m => m);
    if (modes.length === 0) return 'online';
    
    // Return most common mode
    const modeCounts = {};
    modes.forEach(mode => {
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    });
    
    return Object.entries(modeCounts).sort(([,a], [,b]) => b - a)[0][0];
  }
}

module.exports = new PersonalityRecommendationEngine();