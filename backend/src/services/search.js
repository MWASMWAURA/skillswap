const { Client } = require('@elastic/elasticsearch');
const { PrismaClient } = require('@prisma/client');

/**
 * Advanced Search Service with Elasticsearch
 * Provides powerful search capabilities for skills, users, and exchanges
 */
class AdvancedSearchService {
  constructor() {
    this.prisma = new PrismaClient();
    this.elasticsearch = null;
    this.indices = {
      skills: 'skillswap-skills',
      users: 'skillswap-users',
      exchanges: 'skillswap-exchanges',
      messages: 'skillswap-messages'
    };

    this.initializeElasticsearch();
  }

  /**
   * Initialize Elasticsearch connection
   */
  async initializeElasticsearch() {
    try {
      const node = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
      
      this.elasticsearch = new Client({
        node,
        maxRetries: 5,
        requestTimeout: 60000,
        pingTimeout: 3000,
        sniffInterval: 300000
      });

      // Test connection
      await this.elasticsearch.info();
      console.log('Elasticsearch connection established');

      // Create indices if they don't exist
      await this.createIndices();
    } catch (error) {
      console.warn('Elasticsearch not available, falling back to database search:', error.message);
      this.elasticsearch = null;
    }
  }

  /**
   * Create Elasticsearch indices with proper mappings
   */
  async createIndices() {
    if (!this.elasticsearch) return;

    try {
      // Skills index mapping
      const skillsMapping = {
        mappings: {
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            title: { 
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            description: { 
              type: 'text',
              analyzer: 'standard'
            },
            category: { 
              type: 'keyword',
              fields: {
                suggest: { type: 'completion' }
              }
            },
            subcategory: { type: 'keyword' },
            mode: { type: 'keyword' },
            duration: { type: 'integer' },
            price: { type: 'float' },
            difficulty: { type: 'keyword' },
            tags: { type: 'keyword' },
            requirements: { type: 'text' },
            rating: { type: 'float' },
            reviewCount: { type: 'integer' },
            viewCount: { type: 'integer' },
            requestCount: { type: 'integer' },
            completionRate: { type: 'float' },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            // Aggregated fields for better search
            searchText: { type: 'text', analyzer: 'english' },
            popularity: { type: 'float' },
            quality: { type: 'float' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              skills_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'stemmer', 'synonym']
              }
            },
            filter: {
              synonym: {
                type: 'synonym',
                synonyms: [
                  'coding,programming,development',
                  'design,graphic,art',
                  'music,instrument,singing',
                  'language,linguistic,communication'
                ]
              }
            }
          }
        }
      };

      // Users index mapping
      const usersMapping = {
        mappings: {
          properties: {
            id: { type: 'integer' },
            name: { 
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            email: { type: 'keyword' },
            bio: { type: 'text', analyzer: 'standard' },
            location: { type: 'keyword' },
            interests: { type: 'keyword' },
            personalityType: { type: 'keyword' },
            timezone: { type: 'keyword' },
            reputation: { type: 'integer' },
            xp: { type: 'integer' },
            level: { type: 'integer' },
            streak: { type: 'integer' },
            skillsCount: { type: 'integer' },
            completedExchanges: { type: 'integer' },
            averageRating: { type: 'float' },
            responseTime: { type: 'integer' },
            isOnline: { type: 'boolean' },
            lastActivity: { type: 'date' },
            createdAt: { type: 'date' },
            searchText: { type: 'text', analyzer: 'english' },
            popularity: { type: 'float' }
          }
        }
      };

      // Create indices
      for (const [indexName, mapping] of [
        [this.indices.skills, skillsMapping],
        [this.indices.users, usersMapping]
      ]) {
        const exists = await this.elasticsearch.indices.exists({ index: indexName });
        if (!exists) {
          await this.elasticsearch.indices.create({
            index: indexName,
            body: mapping
          });
          console.log(`Created Elasticsearch index: ${indexName}`);
        }
      }
    } catch (error) {
      console.error('Failed to create Elasticsearch indices:', error);
    }
  }

  /**
   * Search skills with advanced filtering and ranking
   * @param {object} searchParams - Search parameters
   * @returns {object} Search results with pagination
   */
  async searchSkills(searchParams) {
    const {
      query = '',
      category = null,
      subcategory = null,
      mode = null,
      difficulty = null,
      minPrice = null,
      maxPrice = null,
      minRating = null,
      minDuration = null,
      maxDuration = null,
      tags = [],
      location = null,
      verified = null,
      online = null,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      filters = {}
    } = searchParams;

    try {
      if (this.elasticsearch) {
        return await this.elasticsearchSearch(searchParams);
      } else {
        return await this.databaseSearch(searchParams);
      }
    } catch (error) {
      console.error('Skill search error:', error);
      throw error;
    }
  }

  /**
   * Elasticsearch-based skill search
   */
  async elasticsearchSearch(searchParams) {
    const {
      query, category, subcategory, mode, difficulty, minPrice, maxPrice,
      minRating, minDuration, maxDuration, tags, location, verified, online,
      sortBy, sortOrder, page, limit, filters
    } = searchParams;

    const mustClauses = [];
    const filterClauses = [];

    // Text search
    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: [
            'title^3',
            'description^2',
            'tags^2',
            'category^2',
            'subcategory',
            'requirements',
            'searchText'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });
    }

    // Filters
    if (category) filterClauses.push({ term: { category } });
    if (subcategory) filterClauses.push({ term: { subcategory } });
    if (mode) filterClauses.push({ term: { mode } });
    if (difficulty) filterClauses.push({ term: { difficulty } });
    if (verified !== null) filterClauses.push({ term: { isVerified: verified } });
    if (online !== null) filterClauses.push({ term: { isActive: true } });

    // Price range
    if (minPrice !== null || maxPrice !== null) {
      const range = {};
      if (minPrice !== null) range.gte = minPrice;
      if (maxPrice !== null) range.lte = maxPrice;
      filterClauses.push({ range: { price: range } });
    }

    // Rating filter
    if (minRating !== null) {
      filterClauses.push({ range: { rating: { gte: minRating } } });
    }

    // Duration filter
    if (minDuration !== null || maxDuration !== null) {
      const range = {};
      if (minDuration !== null) range.gte = minDuration;
      if (maxDuration !== null) range.lte = maxDuration;
      filterClauses.push({ range: { duration: range } });
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filterClauses.push({ terms: { tags } });
    }

    // Custom filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        filterClauses.push({ term: { [key]: value } });
      }
    }

    // Build sort
    let sortClause = [];
    if (sortBy === 'relevance') {
      sortClause = ['_score'];
    } else {
      const order = sortOrder === 'desc' ? 'desc' : 'asc';
      sortClause = [{ [sortBy]: { order } }];
    }

    // Add secondary sort for relevance
    if (sortBy !== 'relevance') {
      sortClause.push('_score');
    }

    const searchBody = {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses
        }
      },
      sort: sortClause,
      from: (page - 1) * limit,
      size: limit,
      highlight: {
        fields: {
          title: {},
          description: {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      aggs: {
        categories: { terms: { field: 'category' } },
        subcategories: { terms: { field: 'subcategory' } },
        modes: { terms: { field: 'mode' } },
        difficulties: { terms: { field: 'difficulty' } },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 0 },
              { from: 0, to: 25 },
              { from: 25, to: 50 },
              { from: 50, to: 100 },
              { from: 100 }
            ]
          }
        },
        avg_rating: { avg: { field: 'rating' } },
        total_skills: { value_count: { field: 'id' } }
      }
    };

    const response = await this.elasticsearch.search({
      index: this.indices.skills,
      body: searchBody
    });

    return {
      skills: response.body.hits.hits.map(hit => ({
        id: hit._source.id,
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight
      })),
      total: response.body.hits.total.value,
      page,
      limit,
      aggregations: response.body.aggregations,
      maxScore: response.body.hits.max_score,
      took: response.body.took
    };
  }

  /**
   * Database-based skill search (fallback)
   */
  async databaseSearch(searchParams) {
    const {
      query, category, subcategory, mode, difficulty, minPrice, maxPrice,
      minRating, minDuration, maxDuration, tags, verified, page, limit
    } = searchParams;

    const where = {
      isActive: true
    };

    // Build WHERE conditions
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (mode) where.mode = mode;
    if (difficulty) where.difficulty = difficulty;
    if (verified !== null) where.isVerified = verified;

    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price.gte = minPrice;
      if (maxPrice !== null) where.price.lte = maxPrice;
    }

    if (minDuration !== null || maxDuration !== null) {
      where.duration = {};
      if (minDuration !== null) where.duration.gte = minDuration;
      if (maxDuration !== null) where.duration.lte = maxDuration;
    }

    if (minRating !== null) {
      where.rating = { gte: minRating };
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const [skills, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.skill.count({ where })
    ]);

    return {
      skills,
      total,
      page,
      limit,
      aggregations: null
    };
  }

  /**
   * Index skill in Elasticsearch
   * @param {object} skill - Skill to index
   */
  async indexSkill(skill) {
    if (!this.elasticsearch) return;

    try {
      const searchText = `${skill.title} ${skill.description} ${skill.category} ${skill.tags?.join(' ') || ''}`;
      const popularity = this.calculateSkillPopularity(skill);
      const quality = this.calculateSkillQuality(skill);

      const doc = {
        ...skill,
        searchText,
        popularity,
        quality,
        updatedAt: new Date().toISOString()
      };

      await this.elasticsearch.index({
        index: this.indices.skills,
        id: skill.id,
        body: doc
      });

      console.log(`Indexed skill ${skill.id} in Elasticsearch`);
    } catch (error) {
      console.error('Failed to index skill:', error);
    }
  }

  /**
   * Index user in Elasticsearch
   * @param {object} user - User to index
   */
  async indexUser(user) {
    if (!this.elasticsearch) return;

    try {
      const searchText = `${user.name} ${user.bio || ''} ${user.interests?.join(' ') || ''}`;
      const popularity = this.calculateUserPopularity(user);

      const doc = {
        ...user,
        searchText,
        popularity,
        updatedAt: new Date().toISOString()
      };

      await this.elasticsearch.index({
        index: this.indices.users,
        id: user.id,
        body: doc
      });

      console.log(`Indexed user ${user.id} in Elasticsearch`);
    } catch (error) {
      console.error('Failed to index user:', error);
    }
  }

  /**
   * Get search suggestions
   * @param {string} query - Query string
   * @param {string} type - Suggestion type (skills, users, categories)
   * @returns {Array} Suggestions
   */
  async getSuggestions(query, type = 'skills') {
    if (!this.elasticsearch) return [];

    try {
      const index = type === 'skills' ? this.indices.skills : 
                   type === 'users' ? this.indices.users : 
                   this.indices.skills;

      const response = await this.elasticsearch.search({
        index,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: 10
              }
            }
          }
        }
      });

      return response.body.suggest.title_suggest[0].options.map(option => ({
        text: option.text,
        score: option._score
      }));
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Search users with advanced filtering
   * @param {object} searchParams - Search parameters
   * @returns {object} Search results
   */
  async searchUsers(searchParams) {
    const {
      query = '',
      location = null,
      skills = [],
      interests = [],
      personality = null,
      minRating = null,
      minReputation = null,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = searchParams;

    try {
      if (this.elasticsearch) {
        return await this.elasticsearchUserSearch(searchParams);
      } else {
        return await this.databaseUserSearch(searchParams);
      }
    } catch (error) {
      console.error('User search error:', error);
      throw error;
    }
  }

  /**
   * Elasticsearch user search
   */
  async elasticsearchUserSearch(searchParams) {
    const { query, location, skills, interests, personality, minRating, minReputation, sortBy, page, limit } = searchParams;

    const mustClauses = [];
    const filterClauses = [{ term: { isActive: true } }];

    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['name^3', 'bio^2', 'interests', 'searchText'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    if (location) filterClauses.push({ term: { location } });
    if (personality) filterClauses.push({ term: { personalityType: personality } });
    if (minRating) filterClauses.push({ range: { averageRating: { gte: minRating } } });
    if (minReputation) filterClauses.push({ range: { reputation: { gte: minReputation } } });
    if (skills.length > 0) filterClauses.push({ terms: { 'skills.name': skills } });
    if (interests.length > 0) filterClauses.push({ terms: { interests } });

    const response = await this.elasticsearch.search({
      index: this.indices.users,
      body: {
        query: {
          bool: {
            must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
            filter: filterClauses
          }
        },
        sort: sortBy === 'relevance' ? ['_score'] : [{ [sortBy]: 'desc' }, '_score'],
        from: (page - 1) * limit,
        size: limit
      }
    });

    return {
      users: response.body.hits.hits.map(hit => ({
        id: hit._source.id,
        ...hit._source,
        score: hit._score
      })),
      total: response.body.hits.total.value,
      page,
      limit
    };
  }

  /**
   * Database user search (fallback)
   */
  async databaseUserSearch(searchParams) {
    const { query, location, skills, interests, personality, minRating, minReputation, page, limit } = searchParams;

    const where = { isActive: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (location) where.location = location;
    if (personality) where.personalityType = personality;
    if (minRating) where.averageRating = { gte: minRating };
    if (minReputation) where.reputation = { gte: minReputation };
    if (interests.length > 0) where.interests = { hasSome: interests };

    // Note: Skills filtering would require more complex joins in a real implementation

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, bio: true, location: true,
          interests: true, personalityType: true, reputation: true,
          xp: true, level: true, profilePhoto: true, isActive: true,
          averageRating: true, responseTime: true, lastActivity: true,
          createdAt: true
        },
        orderBy: { reputation: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      users,
      total,
      page,
      limit
    };
  }

  /**
   * Calculate skill popularity score
   * @param {object} skill - Skill object
   * @returns {number} Popularity score (0-100)
   */
  calculateSkillPopularity(skill) {
    const { viewCount = 0, requestCount = 0, completionRate = 0 } = skill;
    return Math.min(100, (viewCount * 0.1 + requestCount * 2 + completionRate * 0.5));
  }

  /**
   * Calculate skill quality score
   * @param {object} skill - Skill object
   * @returns {number} Quality score (0-100)
   */
  calculateSkillQuality(skill) {
    const { rating = 0, reviewCount = 0, isVerified = false } = skill;
    const baseScore = rating * 20; // Convert 0-5 rating to 0-100
    const reviewBonus = Math.min(20, reviewCount * 0.5); // Max 20 points from reviews
    const verifiedBonus = isVerified ? 10 : 0;
    
    return Math.min(100, baseScore + reviewBonus + verifiedBonus);
  }

  /**
   * Calculate user popularity score
   * @param {object} user - User object
   * @returns {number} Popularity score (0-100)
   */
  calculateUserPopularity(user) {
    const { reputation = 0, completedExchanges = 0, responseTime = 24 } = user;
    const reputationScore = Math.min(50, reputation / 10); // Max 50 points
    const exchangeScore = Math.min(30, completedExchanges * 0.1); // Max 30 points
    const responseScore = Math.max(0, 20 - responseTime); // Max 20 points
    
    return Math.min(100, reputationScore + exchangeScore + responseScore);
  }

  /**
   * Get search analytics
   * @param {number} userId - User ID (optional)
   * @returns {object} Search analytics
   */
  async getSearchAnalytics(userId = null) {
    try {
      const where = userId ? { userId } : {};
      
      const analytics = await this.prisma.searchHistory.groupBy({
        by: ['searchQuery'],
        where,
        _count: {
          id: true
        },
        _avg: {
          resultsCount: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 20
      });

      return {
        topSearches: analytics.map(item => ({
          query: item.searchQuery,
          count: item._count.id,
          avgResults: item._avg.resultsCount || 0
        })),
        totalSearches: await this.prisma.searchHistory.count({ where })
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return { topSearches: [], totalSearches: 0 };
    }
  }

  /**
   * Cleanup old search history
   * @param {number} days - Number of days to keep
   */
  async cleanupSearchHistory(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      await this.prisma.searchHistory.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up search history older than ${days} days`);
    } catch (error) {
      console.error('Failed to cleanup search history:', error);
    }
  }
}

module.exports = new AdvancedSearchService();