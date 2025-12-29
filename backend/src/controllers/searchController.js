const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Enhanced search with multiple criteria and filters
const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      limit = 20,
      category,
      subcategory,
      mode,
      difficulty,
      minPrice,
      maxPrice,
      minRating,
      location,
      tags,
      skillsRequired,
      availability,
      sortBy = 'relevance',
      sortOrder = 'desc',
      radius = 50, // km radius for location-based search
      excludeUserId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build complex search query
    let whereConditions = {
      isActive: true,
      verificationStatus: { in: ['approved', 'verified'] }
    };

    // Text search across multiple fields
    if (query) {
      whereConditions.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { tags: { hasSome: query.split(' ') } }
      ];
    }

    // Category filters
    if (category) {
      whereConditions.category = category;
    }

    if (subcategory) {
      whereConditions.subcategory = subcategory;
    }

    // Mode filter
    if (mode) {
      whereConditions.mode = mode;
    }

    // Difficulty filter
    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price.gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        whereConditions.price.lte = parseFloat(maxPrice);
      }
    }

    // Rating filter
    if (minRating) {
      whereConditions.rating = { gte: parseFloat(minRating) };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      whereConditions.tags = { hasEvery: tagArray };
    }

    // Skills required filter
    if (skillsRequired) {
      const skillsArray = skillsRequired.split(',').map(skill => skill.trim());
      whereConditions.requirements = { hasSome: skillsArray };
    }

    // Exclude specific user
    if (excludeUserId) {
      whereConditions.userId = { not: parseInt(excludeUserId) };
    }

    // Build orderBy clause based on sort criteria
    let orderBy = {};
    switch (sortBy) {
      case 'relevance':
        // For text search, order by relevance score (simulated)
        if (query) {
          orderBy = { createdAt: 'desc' };
        } else {
          orderBy = { viewCount: 'desc' };
        }
        break;
      case 'rating':
        orderBy = { rating: sortOrder };
        break;
      case 'price':
        orderBy = { price: sortOrder };
        break;
      case 'duration':
        orderBy = { duration: sortOrder };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        orderBy = { requestCount: 'desc' };
        break;
      case 'completion':
        orderBy = { completionRate: sortOrder };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Perform search
    const [skills, totalCount] = await Promise.all([
      prisma.skill.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
              level: true,
              reputation: true,
              location: true
            }
          },
          _count: {
            select: {
              exchanges: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.skill.count({ where: whereConditions })
    ]);

    // Calculate search analytics
    const searchAnalytics = {
      totalResults: totalCount,
      queryTime: Date.now(), // Would be actual query time in production
      filters: {
        category: category || null,
        subcategory: subcategory || null,
        mode: mode || null,
        difficulty: difficulty || null,
        priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
        minRating: minRating || null,
        tags: tags ? tags.split(',') : null
      }
    };

    // Log search for analytics
    if (req.user) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id,
          searchQuery: query || '',
          filters: whereConditions,
          resultsCount: skills.length
        }
      });
    }

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      skills,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      searchAnalytics,
      suggestions: await getSearchSuggestions(query)
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (query) => {
  if (!query || query.length < 2) return [];

  try {
    // Get title suggestions
    const titleSuggestions = await prisma.skill.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        title: true,
        category: true
      },
      distinct: ['title'],
      take: 5
    });

    // Get category suggestions
    const categorySuggestions = await prisma.skill.groupBy({
      by: ['category'],
      where: {
        category: {
          contains: query,
          mode: 'insensitive'
        }
      },
      _count: {
        category: true
      },
      take: 3
    });

    // Get tag suggestions
    const skillsWithTags = await prisma.skill.findMany({
      where: {
        tags: {
          hasSome: [query]
        }
      },
      select: {
        tags: true
      },
      take: 10
    });

    const allTags = skillsWithTags
      .flatMap(skill => skill.tags)
      .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return {
      titles: titleSuggestions.map(s => s.title),
      categories: categorySuggestions.map(c => c.category),
      tags: [...new Set(allTags)]
    };

  } catch (error) {
    console.error('Search suggestions error:', error);
    return { titles: [], categories: [], tags: [] };
  }
};

// User discovery and matching
const discoverUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      skillsWanted,
      skillsOffered,
      location,
      radius = 50,
      minReputation,
      minLevel,
      availability,
      personalityType,
      sortBy = 'relevance'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build user discovery query
    let whereConditions = {
      isActive: true,
      banned: false
    };

    // Location-based filtering
    if (location) {
      // This would require more sophisticated location filtering in production
      whereConditions.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    // Reputation filtering
    if (minReputation) {
      whereConditions.reputation = { gte: parseInt(minReputation) };
    }

    // Level filtering
    if (minLevel) {
      whereConditions.level = { gte: parseInt(minLevel) };
    }

    // Personality type filtering
    if (personalityType) {
      whereConditions.personalityType = personalityType;
    }

    // Find users based on skills they offer
    let userSkillsFilter = {};
    if (skillsOffered) {
      const skillsArray = skillsOffered.split(',').map(s => s.trim());
      userSkillsFilter = {
        some: {
          title: {
            contains: skillsArray[0],
            mode: 'insensitive'
          },
          isActive: true
        }
      };
    }

    // Discovery scoring algorithm
    const users = await prisma.user.findMany({
      where: whereConditions,
      include: {
        skills: {
          where: {
            isActive: true,
            verificationStatus: 'approved'
          },
          take: 3,
          select: {
            id: true,
            title: true,
            category: true,
            mode: true,
            rating: true
          }
        },
        _count: {
          select: {
            skills: true,
            exchanges: true,
            badges: true
          }
        }
      },
      skip,
      take
    });

    // Calculate match scores
    const usersWithScores = users.map(user => {
      let score = 0;

      // Base score from reputation and level
      score += (user.reputation / 100) * 30; // 0-30 points
      score += Math.min(user.level * 2, 20); // 0-20 points

      // Skills match score
      if (skillsOffered) {
        const offeredSkills = skillsOffered.toLowerCase().split(',');
        const userSkills = user.skills.map(s => s.title.toLowerCase());
        const matches = offeredSkills.filter(skill => 
          userSkills.some(userSkill => userSkill.includes(skill))
        );
        score += (matches.length / offeredSkills.length) * 25; // 0-25 points
      }

      // Activity score
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(user.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity <= 7) {
        score += 15; // Active in last week
      } else if (daysSinceActivity <= 30) {
        score += 10; // Active in last month
      }

      // Badge bonus
      score += Math.min(user._count.badges * 2, 10); // 0-10 points

      // Response rate (simulated - would need message data)
      score += 10; // Default response rate score

      return {
        ...user,
        matchScore: Math.round(score)
      };
    });

    // Sort by match score or other criteria
    let sortedUsers;
    switch (sortBy) {
      case 'relevance':
        sortedUsers = usersWithScores.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'reputation':
        sortedUsers = usersWithScores.sort((a, b) => b.reputation - a.reputation);
        break;
      case 'level':
        sortedUsers = usersWithScores.sort((a, b) => b.level - a.level);
        break;
      case 'recent':
        sortedUsers = usersWithScores.sort((a, b) => 
          new Date(b.lastActivity) - new Date(a.lastActivity)
        );
        break;
      default:
        sortedUsers = usersWithScores;
    }

    const totalCount = await prisma.user.count({ where: whereConditions });
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      users: sortedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      searchCriteria: {
        skillsOffered,
        skillsWanted,
        location,
        minReputation,
        minLevel,
        personalityType
      }
    });

  } catch (error) {
    console.error('User discovery error:', error);
    res.status(500).json({ error: 'User discovery failed' });
  }
};

// Get similar skills recommendations
const getSimilarSkills = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { limit = 10 } = req.query;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(skillId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            reputation: true
          }
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Find similar skills based on category, tags, and difficulty
    const similarSkills = await prisma.skill.findMany({
      where: {
        id: { not: skill.id },
        category: skill.category,
        isActive: true,
        verificationStatus: { in: ['approved', 'verified'] },
        OR: [
          { subcategory: skill.subcategory },
          { mode: skill.mode },
          { difficulty: skill.difficulty },
          { tags: { hasSome: skill.tags } }
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
        },
        _count: {
          select: {
            exchanges: true
          }
        }
      },
      take: parseInt(limit)
    });

    res.json({
      originalSkill: skill,
      similarSkills,
      recommendationReason: `Based on category (${skill.category})${skill.subcategory ? ` and subcategory (${skill.subcategory})` : ''}${skill.tags.length > 0 ? ` and shared tags (${skill.tags.slice(0, 2).join(', ')})` : ''}`
    });

  } catch (error) {
    console.error('Similar skills error:', error);
    res.status(500).json({ error: 'Failed to get similar skills' });
  }
};

// Get trending and popular skills
const getTrendingSkills = async (req, res) => {
  try {
    const { timeframe = '7d', category, limit = 20 } = req.query;

    const timeFrames = {
      '1d': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    };

    const sinceDate = timeFrames[timeframe] || timeFrames['7d'];

    let whereConditions = {
      isActive: true,
      verificationStatus: { in: ['approved', 'verified'] },
      createdAt: { gte: sinceDate }
    };

    if (category) {
      whereConditions.category = category;
    }

    // Get trending skills based on view count, request count, and recent exchanges
    const trendingSkills = await prisma.skill.findMany({
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
        },
        _count: {
          select: {
            exchanges: true
          }
        }
      },
      orderBy: [
        { viewCount: 'desc' },
        { requestCount: 'desc' },
        { rating: 'desc' }
      ],
      take: parseInt(limit)
    });

    // Get popular categories
    const popularCategories = await prisma.skill.groupBy({
      by: ['category'],
      where: {
        createdAt: { gte: sinceDate },
        isActive: true
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: 10
    });

    res.json({
      trendingSkills,
      popularCategories,
      timeframe,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Trending skills error:', error);
    res.status(500).json({ error: 'Failed to get trending skills' });
  }
};

// Skill verification and quality scoring
const verifySkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { action, reason, notes } = req.body;
    const adminId = req.user.id;

    const validActions = ['approve', 'reject', 'verify', 'flag', 'request_changes'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid verification action' });
    }

    let updateData = {};
    let statusMessage = '';

    switch (action) {
      case 'approve':
        updateData = {
          verificationStatus: 'approved',
          isVerified: true
        };
        statusMessage = 'Skill approved successfully';
        break;
      
      case 'reject':
        updateData = {
          verificationStatus: 'rejected',
          isVerified: false,
          isActive: false
        };
        statusMessage = 'Skill rejected';
        break;
      
      case 'verify':
        updateData = {
          verificationStatus: 'verified',
          isVerified: true
        };
        statusMessage = 'Skill verified successfully';
        break;
      
      case 'flag':
        updateData = {
          verificationStatus: 'flagged'
        };
        statusMessage = 'Skill flagged for review';
        break;
      
      case 'request_changes':
        updateData = {
          verificationStatus: 'changes_requested'
        };
        statusMessage = 'Changes requested for skill';
        break;
    }

    const skill = await prisma.skill.update({
      where: { id: parseInt(skillId) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for skill owner
    await prisma.notification.create({
      data: {
        userId: skill.userId,
        title: 'Skill Verification Update',
        message: `Your skill "${skill.title}" has been ${action}. ${reason ? `Notes: ${reason}` : ''}`,
        type: action === 'approve' || action === 'verify' ? 'success' : 'warning',
        category: 'verification',
        actionUrl: `/skills/${skill.id}`
      }
    });

    // Log verification action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: `skill_${action}`,
        resource: 'skill',
        resourceId: parseInt(skillId),
        metadata: { reason, notes, previousStatus: skill.verificationStatus }
      }
    });

    res.json({
      message: statusMessage,
      skill: {
        id: skill.id,
        title: skill.title,
        verificationStatus: skill.verificationStatus,
        isVerified: skill.isVerified
      }
    });

  } catch (error) {
    console.error('Skill verification error:', error);
    res.status(500).json({ error: 'Failed to verify skill' });
  }
};

// Get search analytics for admins
const getSearchAnalytics = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const timeFrames = {
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    };

    const sinceDate = timeFrames[timeframe] || timeFrames['30d'];

    // Search queries analytics
    const searchQueries = await prisma.searchHistory.findMany({
      where: {
        createdAt: { gte: sinceDate }
      },
      select: {
        searchQuery: true,
        resultsCount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Popular search terms
    const searchTerms = searchQueries
      .filter(q => q.searchQuery)
      .reduce((acc, query) => {
        const terms = query.searchQuery.toLowerCase().split(' ');
        terms.forEach(term => {
          if (term.length > 2) {
            acc[term] = (acc[term] || 0) + 1;
          }
        });
        return acc;
      }, {});

    const topSearchTerms = Object.entries(searchTerms)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));

    // Category search distribution
    const categorySearches = await prisma.searchHistory.groupBy({
      by: ['searchQuery'],
      where: {
        createdAt: { gte: sinceDate },
        searchQuery: { not: '' }
      },
      _count: {
        searchQuery: true
      }
    });

    // Search performance metrics
    const avgResultsPerSearch = searchQueries.length > 0 
      ? searchQueries.reduce((sum, q) => sum + q.resultsCount, 0) / searchQueries.length
      : 0;

    const searchesWithNoResults = searchQueries.filter(q => q.resultsCount === 0).length;
    const noResultsRate = searchQueries.length > 0 
      ? (searchesWithNoResults / searchQueries.length) * 100 
      : 0;

    res.json({
      timeframe,
      totalSearches: searchQueries.length,
      topSearchTerms,
      categorySearches: categorySearches.slice(0, 10),
      avgResultsPerSearch: Math.round(avgResultsPerSearch * 100) / 100,
      noResultsRate: Math.round(noResultsRate * 100) / 100,
      searchesWithNoResults,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ error: 'Failed to get search analytics' });
  }
};

module.exports = {
  advancedSearch,
  discoverUsers,
  getSimilarSkills,
  getTrendingSkills,
  verifySkill,
  getSearchAnalytics
};