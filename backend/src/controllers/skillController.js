const { PrismaClient } = require('@prisma/client');
const { Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

// Predefined skill categories
const SKILL_CATEGORIES = [
  'Technology',
  'Creative Arts',
  'Languages',
  'Business & Finance',
  'Health & Fitness',
  'Cooking & Food',
  'Music',
  'Sports & Recreation',
  'Academic',
  'Life Skills'
];

const SKILL_MODES = ['online', 'in-person', 'hybrid'];

// Validation helpers
const validateSkillData = (data) => {
  const { title, description, categoryId, mode, duration } = data;
  
  if (!title || title.trim().length < 3) {
    throw new Error('Title must be at least 3 characters long');
  }
  
  if (!description || description.trim().length < 10) {
    throw new Error('Description must be at least 10 characters long');
  }
  
  if (!categoryId || typeof categoryId !== 'number') {
    throw new Error('Valid category ID is required');
  }
  
  if (!mode || !SKILL_MODES.includes(mode)) {
    throw new Error(`Mode must be one of: ${SKILL_MODES.join(', ')}`);
  }
  
  if (!duration || typeof duration !== 'number' || duration < 15 || duration > 480) {
    throw new Error('Duration must be a number between 15 and 480 minutes');
  }
  
  return {
    title: title.trim(),
    description: description.trim(),
    categoryId,
    mode,
    duration
  };
};

// Get all skills with filtering, sorting, and pagination
const getSkills = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      mode,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (category) {
      where.categoryId = parseInt(category);
    }
    
    if (mode) {
      where.mode = mode;
    }
    
    if (userId) {
      where.userId = parseInt(userId);
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy clause - validate sortBy field
    const validSortFields = ['id', 'userId', 'title', 'description', 'category', 'mode', 'duration', 'createdAt', 'rating', 'viewCount', 'requestCount'];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = {};
    orderBy[actualSortBy] = sortOrder;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get skills with user information
    const [skills, totalCount] = await Promise.all([
      prisma.skill.findMany({
        where,
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
      prisma.skill.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      skills,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

// Get skill by ID
const getSkillById = async (req, res) => {
  try {
    const { id } = req.params;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true,
            location: true,
            createdAt: true
          }
        },
        exchanges: {
          select: {
            id: true,
            status: true,
            timeCredits: true,
            payment: true,
            createdAt: true,
            completedAt: true,
            requester: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            },
            provider: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Increment view count (you might want to track this separately)
    // For now, we'll just return the skill data

    res.json(skill);

  } catch (error) {
    console.error('Get skill by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
};

// Create new skill
const createSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const skillData = validateSkillData(req.body);

    const skill = await prisma.skill.create({
      data: {
        ...skillData,
        userId
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
      }
    });

    res.status(201).json({
      message: 'Skill created successfully',
      skill
    });

  } catch (error) {
    console.error('Create skill error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A skill with this title already exists for this user' });
    }
    
    res.status(400).json({
      error: error.message || 'Failed to create skill'
    });
  }
};

// Update skill
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const skillId = parseInt(id);

    // Check if skill exists and belongs to user
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { userId: true }
    });

    if (!existingSkill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (existingSkill.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this skill' });
    }

    const skillData = validateSkillData(req.body);

    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: skillData,
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
      }
    });

    res.json({
      message: 'Skill updated successfully',
      skill
    });

  } catch (error) {
    console.error('Update skill error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A skill with this title already exists for this user' });
    }
    
    res.status(400).json({
      error: error.message || 'Failed to update skill'
    });
  }
};

// Delete skill
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const skillId = parseInt(id);

    // Check if skill exists and belongs to user
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { userId: true }
    });

    if (!existingSkill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (existingSkill.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this skill' });
    }

    // Check if skill has active exchanges
    const activeExchanges = await prisma.exchange.count({
      where: {
        skillId: skillId,
        status: { in: ['pending', 'accepted', 'in_progress'] }
      }
    });

    if (activeExchanges > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete skill with active exchanges. Please complete or cancel all exchanges first.' 
      });
    }

    await prisma.skill.delete({
      where: { id: skillId }
    });

    res.json({ message: 'Skill deleted successfully' });

  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
};

// Get skill categories
const getCategories = async (req, res) => {
  try {
    const categoriesWithCount = await prisma.skill.groupBy({
      by: ['categoryId'],
      _count: {
        categoryId: true
      },
      where: {
        categoryId: { not: null }
      },
      orderBy: {
        _count: {
          categoryId: 'desc'
        }
      }
    });

    // Get category names from SkillCategory table
    const categoryIds = categoriesWithCount.map(item => item.categoryId);
    const categoryNames = await prisma.skillCategory.findMany({
      where: {
        id: { in: categoryIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    const categories = categoriesWithCount.map(item => {
      const categoryName = categoryNames.find(cat => cat.id === item.categoryId);
      return {
        name: categoryName ? categoryName.name : 'Unknown',
        count: item._count.categoryId
      };
    });

    res.json({
      categories,
      availableCategories: SKILL_CATEGORIES
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get user's skills
const getUserSkills = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skills = await prisma.skill.findMany({
      where: { userId: parseInt(userId) },
      include: {
        _count: {
          select: {
            exchanges: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const totalCount = await prisma.skill.count({
      where: { userId: parseInt(userId) }
    });

    res.json({
      skills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ error: 'Failed to fetch user skills' });
  }
};

// Get popular skills (most requested)
const getPopularSkills = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularSkills = await prisma.skill.findMany({
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
      orderBy: {
        exchanges: {
          _count: 'desc'
        }
      },
      take: parseInt(limit)
    });

    res.json(popularSkills);

  } catch (error) {
    console.error('Get popular skills error:', error);
    res.status(500).json({ error: 'Failed to fetch popular skills' });
  }
};

// Get skill with verification status
const getSkillWithVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true,
            location: true,
            createdAt: true
          }
        },
        skillVerifications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            reviewer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        exchanges: {
          select: {
            id: true,
            status: true,
            timeCredits: true,
            payment: true,
            createdAt: true,
            completedAt: true,
            requester: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            },
            provider: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Add verification summary
    const verificationSummary = {
      isVerified: skill.isVerified,
      verificationStatus: skill.verificationStatus,
      latestVerification: skill.skillVerifications[0] || null,
      verificationCount: skill.skillVerifications.length,
      hasPendingVerification: skill.skillVerifications.some(v => v.status === 'pending'),
      hasRejectedVerification: skill.skillVerifications.some(v => v.status === 'rejected')
    };

    res.json({
      ...skill,
      verificationSummary
    });

  } catch (error) {
    console.error('Get skill with verification error:', error);
    res.status(500).json({ error: 'Failed to fetch skill with verification status' });
  }
};

module.exports = {
  getSkills,
  getSkillById,
  getSkillWithVerification,
  createSkill,
  updateSkill,
  deleteSkill,
  getCategories,
  getUserSkills,
  getPopularSkills,
  SKILL_CATEGORIES,
  SKILL_MODES
};