const { PrismaClient } = require('@prisma/client');

/**
 * User Preference Learning Service
 * Machine learning system that learns user preferences from behavior and interactions
 */
class UserPreferenceLearningService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Learning parameters
    this.learningRates = {
      high: 0.8,      // Strong preference signals
      medium: 0.5,    // Moderate preference signals
      low: 0.2        // Weak preference signals
    };

    // Preference confidence thresholds
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };

    // Decay factors for old preferences
    this.decayRates = {
      weekly: 0.95,   // 5% decay per week
      monthly: 0.9,   // 10% decay per month
      yearly: 0.8     // 20% decay per year
    };

    // Preference categories
    this.preferenceCategories = {
      skill_categories: 'Skill Categories',
      skill_difficulty: 'Skill Difficulty',
      learning_style: 'Learning Style',
      communication: 'Communication Preferences',
      scheduling: 'Scheduling Preferences',
      pricing: 'Pricing Preferences',
      location: 'Location Preferences',
      language: 'Language Preferences',
      skill_duration: 'Skill Duration',
      skill_mode: 'Skill Mode',
      skill_provider: 'Skill Provider Preferences',
      notification: 'Notification Preferences'
    };
  }

  /**
   * Learn user preferences from their behavior
   * @param {number} userId - User ID
   * @param {object} behaviorData - User behavior data
   * @returns {object} Learning result
   */
  async learnFromBehavior(userId, behaviorData) {
    try {
      const {
        action,           // 'view', 'click', 'like', 'request', 'complete', 'rate'
        resource,         // 'skill', 'user', 'category'
        resourceId,
        metadata,         // Additional context
        timestamp = new Date()
      } = behaviorData;

      // Determine preference category based on action
      const preferenceKey = this.extractPreferenceKey(behaviorData);
      if (!preferenceKey) {
        return { success: false, message: 'Could not extract preference key' };
      }

      // Calculate learning strength based on action
      const learningStrength = this.calculateLearningStrength(action, metadata);
      
      // Extract preference value from behavior
      const preferenceValue = this.extractPreferenceValue(behaviorData);
      if (!preferenceValue) {
        return { success: false, message: 'Could not extract preference value' };
      }

      // Update or create preference
      const preference = await this.updateUserPreference(
        userId, 
        preferenceKey.category, 
        preferenceKey.key, 
        preferenceValue, 
        learningStrength
      );

      // Learn contextual preferences
      await this.learnContextualPreferences(userId, behaviorData);

      // Update preference confidence
      await this.updatePreferenceConfidence(userId, preferenceKey);

      return {
        success: true,
        preference,
        learningStrength,
        message: 'Preference learned successfully'
      };

    } catch (error) {
      console.error('Behavior learning error:', error);
      throw error;
    }
  }

  /**
   * Learn from negative feedback (dislikes, skips, etc.)
   * @param {number} userId - User ID
   * @param {object} feedbackData - Negative feedback data
   * @returns {object} Learning result
   */
  async learnFromNegativeFeedback(userId, feedbackData) {
    try {
      const {
        action,           // 'dismiss', 'skip', 'dislike', 'hide'
        resource,         // 'skill', 'recommendation', 'user'
        resourceId,
        reason,           // 'not_interested', 'too_expensive', 'wrong_level'
        metadata
      } = feedbackData;

      // Extract negative preference indicators
      const negativeSignals = this.extractNegativeSignals(feedbackData);
      
      for (const signal of negativeSignals) {
        // Reduce confidence for negative signals
        await this.adjustPreferenceConfidence(
          userId,
          signal.category,
          signal.key,
          signal.value,
          -0.3 // Negative adjustment
        );
      }

      // Learn what to avoid
      await this.learnAvoidancePatterns(userId, feedbackData);

      return {
        success: true,
        negativeSignals: negativeSignals.length,
        message: 'Negative feedback processed'
      };

    } catch (error) {
      console.error('Negative feedback learning error:', error);
      throw error;
    }
  }

  /**
   * Get learned user preferences
   * @param {number} userId - User ID
   * @param {object} options - Query options
   * @returns {object} User preferences
   */
  async getUserPreferences(userId, options = {}) {
    try {
      const {
        category = null,
        minConfidence = 0.3,
        includeMetadata = false
      } = options;

      const whereClause = {
        userId,
        confidence: { gte: minConfidence }
      };

      if (category) {
        whereClause.category = category;
      }

      const preferences = await this.prisma.userPreference.findMany({
        where: whereClause,
        orderBy: [
          { confidence: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      // Group preferences by category
      const groupedPreferences = this.groupPreferencesByCategory(preferences);

      // Calculate overall preference profile
      const preferenceProfile = await this.calculatePreferenceProfile(userId, preferences);

      return {
        preferences: groupedPreferences,
        profile: preferenceProfile,
        totalPreferences: preferences.length,
        highConfidencePreferences: preferences.filter(p => p.confidence > 0.7).length
      };

    } catch (error) {
      console.error('Get preferences error:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations based on learned preferences
   * @param {number} userId - User ID
   * @param {object} options - Recommendation options
   * @returns {object} Personalized recommendations
   */
  async getPreferenceBasedRecommendations(userId, options = {}) {
    try {
      const {
        categories = [],
        limit = 20,
        minConfidence = 0.5,
        includeExplanation = true
      } = options;

      // Get user's learned preferences
      const preferences = await this.getUserPreferences(userId, {
        minConfidence,
        includeMetadata: true
      });

      // Generate recommendations based on preferences
      const recommendations = await this.generatePreferenceBasedRecommendations(
        userId,
        preferences,
        categories,
        limit
      );

      // Add explanations if requested
      if (includeExplanation) {
        recommendations.forEach(rec => {
          rec.reasons = this.generateRecommendationReasons(rec, preferences);
        });
      }

      return {
        recommendations,
        preferenceSignals: preferences.preferences,
        confidence: this.calculateOverallConfidence(preferences.preferences)
      };

    } catch (error) {
      console.error('Preference recommendations error:', error);
      throw error;
    }
  }

  /**
   * Update or create user preference
   * @param {number} userId - User ID
   * @param {string} category - Preference category
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @param {number} strength - Learning strength
   * @returns {object} Updated preference
   */
  async updateUserPreference(userId, category, key, value, strength = 0.5) {
    try {
      // Check if preference exists
      const existingPreference = await this.prisma.userPreference.findUnique({
        where: {
          userId_category_preferenceKey: {
            userId,
            category,
            preferenceKey: key
          }
        }
      });

      if (existingPreference) {
        // Update existing preference
        const newConfidence = this.calculateNewConfidence(
          existingPreference.confidence,
          strength,
          existingPreference.preferenceValue
        );

        return await this.prisma.userPreference.update({
          where: { id: existingPreference.id },
          data: {
            preferenceValue: value,
            confidence: newConfidence,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new preference
        return await this.prisma.userPreference.create({
          data: {
            userId,
            category,
            preferenceKey: key,
            preferenceValue: value,
            confidence: Math.max(0.1, strength) // Minimum confidence for new preferences
          }
        });
      }

    } catch (error) {
      console.error('Update preference error:', error);
      throw error;
    }
  }

  /**
   * Learn contextual preferences (time, location, device, etc.)
   * @param {number} userId - User ID
   * @param {object} behaviorData - Behavior data
   */
  async learnContextualPreferences(userId, behaviorData) {
    try {
      const { metadata } = behaviorData;
      
      if (!metadata) return;

      // Learn time-based preferences
      if (metadata.timestamp) {
        await this.learnTimePreferences(userId, metadata.timestamp, behaviorData);
      }

      // Learn location-based preferences
      if (metadata.location) {
        await this.learnLocationPreferences(userId, metadata.location, behaviorData);
      }

      // Learn device-based preferences
      if (metadata.device) {
        await this.learnDevicePreferences(userId, metadata.device, behaviorData);
      }

      // Learn session-based preferences
      if (metadata.sessionId) {
        await this.learnSessionPreferences(userId, metadata.sessionId, behaviorData);
      }

    } catch (error) {
      console.error('Contextual learning error:', error);
    }
  }

  /**
   * Learn time-based preferences
   * @param {number} userId - User ID
   * @param {Date} timestamp - Action timestamp
   * @param {object} behaviorData - Behavior data
   */
  async learnTimePreferences(userId, timestamp, behaviorData) {
    try {
      const date = new Date(timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Learn preferred hours for skill activities
      if (behaviorData.action === 'request' || behaviorData.action === 'complete') {
        await this.updateUserPreference(
          userId,
          'scheduling',
          'preferred_hours',
          { hour, weight: 1 },
          0.3
        );

        // Learn weekend vs weekday preferences
        await this.updateUserPreference(
          userId,
          'scheduling',
          'weekend_preference',
          isWeekend,
          0.2
        );
      }

      // Learn peak activity times
      await this.updateUserPreference(
        userId,
        'scheduling',
        'active_hours',
        { hour, count: 1 },
        0.1
      );

    } catch (error) {
      console.error('Time preference learning error:', error);
    }
  }

  /**
   * Learn location-based preferences
   * @param {number} userId - User ID
   * @param {string} location - User location
   * @param {object} behaviorData - Behavior data
   */
  async learnLocationPreferences(userId, location, behaviorData) {
    try {
      // Learn preferred locations for in-person skills
      if (behaviorData.resource === 'skill' && behaviorData.metadata?.mode === 'in-person') {
        await this.updateUserPreference(
          userId,
          'location',
          'preferred_locations',
          location,
          0.4
        );
      }

      // Learn geographic preferences
      await this.updateUserPreference(
        userId,
        'location',
        'search_location',
        location,
        0.2
      );

    } catch (error) {
      console.error('Location preference learning error:', error);
    }
  }

  /**
   * Learn device-based preferences
   * @param {number} userId - User ID
   * @param {string} device - Device type
   * @param {object} behaviorData - Behavior data
   */
  async learnDevicePreferences(userId, device, behaviorData) {
    try {
      await this.updateUserPreference(
        userId,
        'communication',
        'preferred_device',
        device,
        0.3
      );

      // Learn platform preferences
      if (behaviorData.action === 'complete') {
        await this.updateUserPreference(
          userId,
          'communication',
          'platform_preference',
          device,
          0.2
        );
      }

    } catch (error) {
      console.error('Device preference learning error:', error);
    }
  }

  /**
   * Learn session-based preferences
   * @param {number} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {object} behaviorData - Behavior data
   */
  async learnSessionPreferences(userId, sessionId, behaviorData) {
    try {
      // Track session engagement
      const sessionData = {
        sessionId,
        action: behaviorData.action,
        duration: behaviorData.metadata?.duration || 0,
        interactions: behaviorData.metadata?.interactions || 1
      };

      await this.updateUserPreference(
        userId,
        'learning_style',
        'session_patterns',
        sessionData,
        0.2
      );

    } catch (error) {
      console.error('Session preference learning error:', error);
    }
  }

  /**
   * Extract preference key from behavior data
   * @param {object} behaviorData - Behavior data
   * @returns {object|null} Preference key
   */
  extractPreferenceKey(behaviorData) {
    const { action, resource, resourceId, metadata } = behaviorData;

    switch (resource) {
      case 'skill':
        if (metadata?.category) {
          return {
            category: 'skill_categories',
            key: metadata.category
          };
        }
        if (metadata?.difficulty) {
          return {
            category: 'skill_difficulty',
            key: metadata.difficulty
          };
        }
        if (metadata?.mode) {
          return {
            category: 'skill_mode',
            key: metadata.mode
          };
        }
        if (metadata?.duration) {
          return {
            category: 'skill_duration',
            key: this.categorizeDuration(metadata.duration)
          };
        }
        break;

      case 'user':
        if (metadata?.personalityType) {
          return {
            category: 'skill_provider',
            key: `personality_${metadata.personalityType}`
          };
        }
        break;

      case 'pricing':
        if (metadata?.priceRange) {
          return {
            category: 'pricing',
            key: metadata.priceRange
          };
        }
        break;

      default:
        break;
    }

    return null;
  }

  /**
   * Extract preference value from behavior data
   * @param {object} behaviorData - Behavior data
   * @returns {any} Preference value
   */
  extractPreferenceValue(behaviorData) {
    const { action, metadata } = behaviorData;

    // Map action strength to preference value
    const actionValues = {
      'view': 0.1,
      'click': 0.3,
      'like': 0.5,
      'request': 0.7,
      'complete': 0.9,
      'rate': 0.8
    };

    return actionValues[action] || 0.2;
  }

  /**
   * Calculate learning strength based on action and context
   * @param {string} action - User action
   * @param {object} metadata - Additional context
   * @returns {number} Learning strength (0-1)
   */
  calculateLearningStrength(action, metadata) {
    let strength = 0.2; // Base strength

    // Action-based strength
    const actionMultipliers = {
      'view': 0.2,
      'click': 0.4,
      'like': 0.6,
      'request': 0.8,
      'complete': 1.0,
      'rate': 0.9
    };

    strength = actionMultipliers[action] || 0.2;

    // Context-based adjustments
    if (metadata?.timeSpent > 300) strength *= 1.2; // 5+ minutes
    if (metadata?.repeatedAction) strength *= 1.1; // Repeated behavior
    if (metadata?.intensity === 'high') strength *= 1.3;

    return Math.min(1.0, strength);
  }

  /**
   * Calculate new confidence based on existing confidence and learning strength
   * @param {number} currentConfidence - Current confidence level
   * @param {number} learningStrength - New learning strength
   * @param {any} currentValue - Current preference value
   * @returns {number} New confidence
   */
  calculateNewConfidence(currentConfidence, learningStrength, currentValue) {
    // Exponential moving average approach
    const alpha = learningStrength; // Learning rate
    const baseConfidence = 0.1; // Minimum confidence

    return baseConfidence + (1 - baseConfidence) * (1 - Math.pow(1 - alpha, currentConfidence + 0.1));
  }

  /**
   * Extract negative signals from feedback
   * @param {object} feedbackData - Feedback data
   * @returns {Array} Negative signals
   */
  extractNegativeSignals(feedbackData) {
    const signals = [];
    const { action, reason, metadata } = feedbackData;

    // Map negative actions to preference reductions
    switch (action) {
      case 'dismiss':
        if (metadata?.category) {
          signals.push({
            category: 'skill_categories',
            key: metadata.category,
            value: -0.3
          });
        }
        break;

      case 'skip':
        if (metadata?.difficulty) {
          signals.push({
            category: 'skill_difficulty',
            key: metadata.difficulty,
            value: -0.2
          });
        }
        break;

      case 'dislike':
        if (reason === 'too_expensive' && metadata?.priceRange) {
          signals.push({
            category: 'pricing',
            key: metadata.priceRange,
            value: -0.4
          });
        }
        break;

      case 'hide':
        // Strong negative signal
        if (metadata?.category) {
          signals.push({
            category: 'skill_categories',
            key: metadata.category,
            value: -0.5
          });
        }
        break;
    }

    return signals;
  }

  /**
   * Learn avoidance patterns from negative feedback
   * @param {number} userId - User ID
   * @param {object} feedbackData - Feedback data
   */
  async learnAvoidancePatterns(userId, feedbackData) {
    try {
      const { reason, metadata } = feedbackData;

      // Learn specific avoidance reasons
      const avoidanceReasons = {
        'not_interested': { category: 'skill_categories', key: 'avoid_interest' },
        'too_expensive': { category: 'pricing', key: 'price_sensitivity' },
        'wrong_level': { category: 'skill_difficulty', key: 'difficulty_mismatch' },
        'bad_timing': { category: 'scheduling', key: 'timing_issues' },
        'location_issue': { category: 'location', key: 'location_constraints' }
      };

      const avoidance = avoidanceReasons[reason];
      if (avoidance) {
        await this.updateUserPreference(
          userId,
          avoidance.category,
          avoidance.key,
          true,
          0.4
        );
      }

    } catch (error) {
      console.error('Avoidance learning error:', error);
    }
  }

  /**
   * Adjust preference confidence
   * @param {number} userId - User ID
   * @param {string} category - Preference category
   * @param {string} key - Preference key
   * @param {number} adjustment - Confidence adjustment
   */
  async adjustPreferenceConfidence(userId, category, key, adjustment) {
    try {
      const preference = await this.prisma.userPreference.findUnique({
        where: {
          userId_category_preferenceKey: { userId, category, preferenceKey: key }
        }
      });

      if (preference) {
        const newConfidence = Math.max(0, Math.min(1, preference.confidence + adjustment));
        
        await this.prisma.userPreference.update({
          where: { id: preference.id },
          data: { confidence: newConfidence }
        });
      }

    } catch (error) {
      console.error('Confidence adjustment error:', error);
    }
  }

  /**
   * Categorize skill duration into buckets
   * @param {number} duration - Duration in minutes
   * @returns {string} Duration category
   */
  categorizeDuration(duration) {
    if (duration < 30) return 'short';
    if (duration < 60) return 'medium';
    if (duration < 120) return 'long';
    return 'extended';
  }

  /**
   * Group preferences by category
   * @param {Array} preferences - User preferences
   * @returns {object} Grouped preferences
   */
  groupPreferencesByCategory(preferences) {
    const grouped = {};
    
    preferences.forEach(preference => {
      if (!grouped[preference.category]) {
        grouped[preference.category] = [];
      }
      grouped[preference.category].push(preference);
    });

    return grouped;
  }

  /**
   * Calculate overall preference profile for user
   * @param {number} userId - User ID
   * @param {Array} preferences - User preferences
   * @returns {object} Preference profile
   */
  async calculatePreferenceProfile(userId, preferences) {
    try {
      const profile = {
        dominantCategories: [],
        learningStyle: null,
        communicationStyle: null,
        confidence: 0,
        profileCompleteness: 0
      };

      // Find dominant preference categories
      const categoryScores = {};
      preferences.forEach(pref => {
        categoryScores[pref.category] = (categoryScores[pref.category] || 0) + pref.confidence;
      });

      profile.dominantCategories = Object.entries(categoryScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, score]) => ({ category, score }));

      // Infer learning style from preferences
      profile.learningStyle = this.inferLearningStyle(preferences);
      
      // Infer communication style
      profile.communicationStyle = this.inferCommunicationStyle(preferences);

      // Calculate overall confidence
      profile.confidence = preferences.length > 0 
        ? preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length
        : 0;

      // Calculate profile completeness (based on number of categories with preferences)
      const categoriesWithPreferences = new Set(preferences.map(p => p.category)).size;
      const totalCategories = Object.keys(this.preferenceCategories).length;
      profile.profileCompleteness = (categoriesWithPreferences / totalCategories) * 100;

      return profile;

    } catch (error) {
      console.error('Preference profile calculation error:', error);
      return {
        dominantCategories: [],
        learningStyle: null,
        communicationStyle: null,
        confidence: 0,
        profileCompleteness: 0
      };
    }
  }

  /**
   * Infer learning style from preferences
   * @param {Array} preferences - User preferences
   * @returns {string} Inferred learning style
   */
  inferLearningStyle(preferences) {
    const learningPreferences = preferences.filter(p => p.category === 'learning_style');
    
    if (learningPreferences.length === 0) return 'unknown';

    // Count different learning style indicators
    const styleCounts = {};
    learningPreferences.forEach(pref => {
      const style = this.extractLearningStyleFromPreference(pref);
      if (style) {
        styleCounts[style] = (styleCounts[style] || 0) + pref.confidence;
      }
    });

    const dominantStyle = Object.entries(styleCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return dominantStyle ? dominantStyle[0] : 'unknown';
  }

  /**
   * Extract learning style from preference
   * @param {object} preference - User preference
   * @returns {string} Learning style
   */
  extractLearningStyleFromPreference(preference) {
    const { preferenceKey, preferenceValue } = preference;
    
    // Map preference keys to learning styles
    const styleMappings = {
      'session_duration': preferenceValue > 60 ? 'extended' : 'focused',
      'interaction_type': preferenceValue > 0.7 ? 'collaborative' : 'independent',
      'content_type': preferenceValue === 'practical' ? 'hands-on' : 'theoretical',
      'pace': preferenceValue > 0.6 ? 'self-paced' : 'structured'
    };

    return styleMappings[preferenceKey] || null;
  }

  /**
   * Infer communication style from preferences
   * @param {Array} preferences - User preferences
   * @returns {string} Inferred communication style
   */
  inferCommunicationStyle(preferences) {
    const commPreferences = preferences.filter(p => p.category === 'communication');
    
    if (commPreferences.length === 0) return 'balanced';

    // Analyze communication preferences
    const hasHighResponseTime = commPreferences.some(p => 
      p.preferenceKey === 'response_time' && p.preferenceValue < 24
    );
    
    const hasDetailedCommunication = commPreferences.some(p => 
      p.preferenceKey === 'detail_level' && p.preferenceValue > 0.7
    );

    if (hasHighResponseTime && hasDetailedCommunication) return 'detailed';
    if (hasHighResponseTime) return 'responsive';
    if (hasDetailedCommunication) return 'thorough';
    
    return 'balanced';
  }

  /**
   * Generate preference-based recommendations
   * @param {number} userId - User ID
   * @param {object} preferences - User preferences
   * @param {Array} categories - Category filters
   * @param {number} limit - Number of recommendations
   * @returns {Array} Recommendations
   */
  async generatePreferenceBasedRecommendations(userId, preferences, categories, limit) {
    try {
      // Build query based on learned preferences
      const queryConditions = this.buildQueryFromPreferences(preferences, categories);
      
      // Get candidate skills
      const candidateSkills = await this.prisma.skill.findMany({
        where: {
          isActive: true,
          userId: { not: userId },
          ...queryConditions
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

      // Score skills based on preference match
      const scoredSkills = candidateSkills.map(skill => {
        const preferenceScore = this.calculatePreferenceMatchScore(skill, preferences.preferences);
        return {
          ...skill,
          preferenceScore
        };
      });

      return scoredSkills
        .filter(skill => skill.preferenceScore > 0.3)
        .sort((a, b) => b.preferenceScore - a.preferenceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Preference recommendations generation error:', error);
      return [];
    }
  }

  /**
   * Build query conditions from preferences
   * @param {object} preferences - User preferences
   * @param {Array} categories - Category filters
   * @returns {object} Query conditions
   */
  buildQueryFromPreferences(preferences, categories) {
    const conditions = {};
    
    // Add category filters
    if (categories.length > 0) {
      conditions.category = { in: categories };
    } else {
      // Use learned category preferences
      const categoryPrefs = preferences.preferences.skill_categories || [];
      if (categoryPrefs.length > 0) {
        const preferredCategories = categoryPrefs
          .filter(p => p.confidence > 0.5)
          .map(p => p.preferenceKey);
        
        if (preferredCategories.length > 0) {
          conditions.category = { in: preferredCategories };
        }
      }
    }

    // Add difficulty preferences
    const difficultyPrefs = preferences.preferences.skill_difficulty || [];
    if (difficultyPrefs.length > 0) {
      const preferredDifficulties = difficultyPrefs
        .filter(p => p.confidence > 0.6)
        .map(p => p.preferenceKey);
      
      if (preferredDifficulties.length > 0) {
        conditions.difficulty = { in: preferredDifficulties };
      }
    }

    return conditions;
  }

  /**
   * Calculate preference match score for a skill
   * @param {object} skill - Skill to evaluate
   * @param {object} userPreferences - User preferences
   * @returns {number} Preference match score (0-1)
   */
  calculatePreferenceMatchScore(skill, userPreferences) {
    let totalScore = 0;
    let totalWeight = 0;

    // Category match
    const categoryPrefs = userPreferences.skill_categories || [];
    const categoryMatch = categoryPrefs.find(p => p.preferenceKey === skill.category);
    if (categoryMatch) {
      totalScore += categoryMatch.confidence * 0.4;
      totalWeight += 0.4;
    }

    // Difficulty match
    if (skill.difficulty) {
      const difficultyPrefs = userPreferences.skill_difficulty || [];
      const difficultyMatch = difficultyPrefs.find(p => p.preferenceKey === skill.difficulty);
      if (difficultyMatch) {
        totalScore += difficultyMatch.confidence * 0.3;
        totalWeight += 0.3;
      }
    }

    // Mode match
    if (skill.mode) {
      const modePrefs = userPreferences.skill_mode || [];
      const modeMatch = modePrefs.find(p => p.preferenceKey === skill.mode);
      if (modeMatch) {
        totalScore += modeMatch.confidence * 0.2;
        totalWeight += 0.2;
      }
    }

    // Duration match
    if (skill.duration) {
      const durationCategory = this.categorizeDuration(skill.duration);
      const durationPrefs = userPreferences.skill_duration || [];
      const durationMatch = durationPrefs.find(p => p.preferenceKey === durationCategory);
      if (durationMatch) {
        totalScore += durationMatch.confidence * 0.1;
        totalWeight += 0.1;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Generate recommendation reasons
   * @param {object} recommendation - Recommendation object
   * @param {object} preferences - User preferences
   * @returns {Array} Explanation reasons
   */
  generateRecommendationReasons(recommendation, preferences) {
    const reasons = [];

    // Category match reason
    const categoryPrefs = preferences.preferences.skill_categories || [];
    const categoryMatch = categoryPrefs.find(p => p.preferenceKey === recommendation.category);
    if (categoryMatch && categoryMatch.confidence > 0.5) {
      reasons.push(`You frequently search for ${recommendation.category} skills`);
    }

    // Difficulty match reason
    if (recommendation.difficulty) {
      const difficultyPrefs = preferences.preferences.skill_difficulty || [];
      const difficultyMatch = difficultyPrefs.find(p => p.preferenceKey === recommendation.difficulty);
      if (difficultyMatch && difficultyMatch.confidence > 0.6) {
        reasons.push(`This ${recommendation.difficulty} level matches your preferences`);
      }
    }

    // Provider match reason
    if (recommendation.user?.personalityType) {
      const providerPrefs = preferences.preferences.skill_provider || [];
      const providerMatch = providerPrefs.find(p => 
        p.preferenceKey === `personality_${recommendation.user.personalityType}`
      );
      if (providerMatch) {
        reasons.push(`This instructor's personality matches your learning style`);
      }
    }

    return reasons;
  }

  /**
   * Calculate overall confidence in preferences
   * @param {object} preferences - User preferences
   * @returns {number} Overall confidence (0-1)
   */
  calculateOverallConfidence(preferences) {
    const allPreferences = Object.values(preferences).flat();
    
    if (allPreferences.length === 0) return 0;

    const highConfidencePrefs = allPreferences.filter(p => p.confidence > 0.7);
    return highConfidencePrefs.length / allPreferences.length;
  }

  /**
   * Decay old preferences over time
   * @param {number} userId - User ID
   * @param {number} daysToDecay - Number of days before decay starts
   */
  async decayOldPreferences(userId, daysToDecay = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToDecay);

      const oldPreferences = await this.prisma.userPreference.findMany({
        where: {
          userId,
          updatedAt: { lt: cutoffDate }
        }
      });

      for (const preference of oldPreferences) {
        const daysOld = Math.floor(
          (Date.now() - preference.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const decayRate = this.calculateDecayRate(daysOld);
        const newConfidence = preference.confidence * decayRate;

        if (newConfidence < 0.1) {
          // Remove very low confidence preferences
          await this.prisma.userPreference.delete({
            where: { id: preference.id }
          });
        } else {
          // Update confidence
          await this.prisma.userPreference.update({
            where: { id: preference.id },
            data: { confidence: newConfidence }
          });
        }
      }

    } catch (error) {
      console.error('Preference decay error:', error);
    }
  }

  /**
   * Calculate decay rate based on age
   * @param {number} daysOld - Days since last update
   * @returns {number} Decay rate (0-1)
   */
  calculateDecayRate(daysOld) {
    const weeks = daysOld / 7;
    const months = daysOld / 30;
    const years = daysOld / 365;

    // Apply appropriate decay rate
    if (years >= 1) return Math.pow(this.decayRates.yearly, years);
    if (months >= 1) return Math.pow(this.decayRates.monthly, months);
    if (weeks >= 1) return Math.pow(this.decayRates.weekly, weeks);
    
    return 1.0; // No decay for recent preferences
  }

  /**
   * Get preference learning statistics
   * @param {number} userId - User ID
   * @returns {object} Learning statistics
   */
  async getPreferenceLearningStats(userId) {
    try {
      const preferences = await this.prisma.userPreference.findMany({
        where: { userId }
      });

      const stats = {
        totalPreferences: preferences.length,
        averageConfidence: 0,
        categoriesCovered: new Set(preferences.map(p => p.category)).size,
        highConfidencePreferences: preferences.filter(p => p.confidence > 0.7).length,
        recentLearning: preferences.filter(p => {
          const daysOld = Math.floor(
            (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysOld <= 7;
        }).length,
        learningVelocity: 0
      };

      if (preferences.length > 0) {
        stats.averageConfidence = preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length;
      }

      // Calculate learning velocity (preferences learned per week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentPrefs = preferences.filter(p => p.updatedAt > oneWeekAgo);
      stats.learningVelocity = recentPrefs.length;

      return stats;

    } catch (error) {
      console.error('Preference learning stats error:', error);
      return {
        totalPreferences: 0,
        averageConfidence: 0,
        categoriesCovered: 0,
        highConfidencePreferences: 0,
        recentLearning: 0,
        learningVelocity: 0
      };
    }
  }
}

module.exports = new UserPreferenceLearningService();