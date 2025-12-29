const { PrismaClient } = require('@prisma/client');

/**
 * Skill Categorization and Tagging Service
 * Advanced system for organizing skills with intelligent categorization and tagging
 */
class SkillCategorizationService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Predefined skill categories with subcategories
    this.skillCategories = {
      'Programming': {
        description: 'Software development and programming',
        subcategories: [
          'Web Development', 'Mobile Development', 'Desktop Applications', 
          'Game Development', 'Data Science', 'Machine Learning', 
          'DevOps', 'Cybersecurity', 'Database Management', 'API Development'
        ],
        color: '#3B82F6', // Blue
        icon: 'code',
        keywords: ['programming', 'coding', 'development', 'software', 'web', 'mobile', 'javascript', 'python', 'java', 'react', 'node']
      },
      'Design': {
        description: 'Visual design and creative skills',
        subcategories: [
          'Graphic Design', 'UI/UX Design', 'Web Design', 'Logo Design',
          'Brand Design', 'Print Design', 'Illustration', 'Animation',
          'Video Editing', 'Photography', '3D Modeling', 'Product Design'
        ],
        color: '#8B5CF6', // Purple
        icon: 'palette',
        keywords: ['design', 'graphic', 'ui', 'ux', 'visual', 'creative', 'art', 'illustration', 'layout', 'branding']
      },
      'Business': {
        description: 'Business and entrepreneurship skills',
        subcategories: [
          'Marketing', 'Sales', 'Management', 'Strategy', 'Finance',
          'Accounting', 'Project Management', 'Operations', 'Entrepreneurship',
          'Business Analysis', 'Consulting', 'Leadership'
        ],
        color: '#10B981', // Green
        icon: 'briefcase',
        keywords: ['business', 'marketing', 'sales', 'management', 'strategy', 'finance', 'entrepreneur', 'leadership']
      },
      'Language': {
        description: 'Language learning and translation',
        subcategories: [
          'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
          'Korean', 'Arabic', 'Hindi', 'Portuguese', 'Russian', 'Italian',
          'Translation', 'Interpretation', 'Language Teaching'
        ],
        color: '#F59E0B', // Yellow
        icon: 'globe',
        keywords: ['language', 'speaking', 'translation', 'teaching', 'communication', 'linguistic']
      },
      'Music': {
        description: 'Musical skills and instruments',
        subcategories: [
          'Guitar', 'Piano', 'Violin', 'Drums', 'Singing', 'Music Theory',
          'Composition', 'Music Production', 'Songwriting', 'Audio Engineering',
          'Performance', 'Music Education'
        ],
        color: '#EF4444', // Red
        icon: 'music',
        keywords: ['music', 'instrument', 'guitar', 'piano', 'singing', 'songwriting', 'production', 'performance']
      },
      'Academic': {
        description: 'Academic subjects and tutoring',
        subcategories: [
          'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History',
          'Geography', 'Economics', 'Psychology', 'Sociology', 'Philosophy',
          'Literature', 'Political Science', 'Statistics'
        ],
        color: '#6366F1', // Indigo
        icon: 'graduation-cap',
        keywords: ['math', 'science', 'history', 'literature', 'academic', 'tutoring', 'education', 'learning']
      },
      'Lifestyle': {
        description: 'Personal development and lifestyle skills',
        subcategories: [
          'Fitness', 'Cooking', 'Nutrition', 'Yoga', 'Meditation', 'Personal Development',
          'Time Management', 'Productivity', 'Public Speaking', 'Life Coaching',
          'Relationship', 'Parenting', 'Self Improvement'
        ],
        color: '#EC4899', // Pink
        icon: 'heart',
        keywords: ['fitness', 'cooking', 'wellness', 'personal', 'lifestyle', 'health', 'self-improvement']
      },
      'Creative': {
        description: 'Creative arts and crafts',
        subcategories: [
          'Writing', 'Poetry', 'Storytelling', 'Blogging', 'Content Creation',
          'Crafting', 'Woodworking', 'Pottery', 'Painting', 'Drawing',
          'Sewing', 'Knitting', 'Jewelry Making', 'Photography'
        ],
        color: '#F97316', // Orange
        icon: 'brush',
        keywords: ['creative', 'art', 'craft', 'writing', 'photography', 'handmade', 'artistic', 'crafting']
      },
      'Technology': {
        description: 'Technology and digital skills',
        subcategories: [
          'Digital Marketing', 'SEO', 'Social Media', 'Data Analysis',
          'Excel', 'PowerPoint', 'Google Analytics', 'Email Marketing',
          'Content Strategy', 'E-commerce', 'Cryptocurrency', 'Blockchain'
        ],
        color: '#06B6D4', // Cyan
        icon: 'cpu',
        keywords: ['technology', 'digital', 'marketing', 'analysis', 'data', 'online', 'tech', 'computer']
      }
    };

    // Common skill tags
    this.commonTags = [
      'beginner-friendly', 'intermediate', 'advanced', 'certification',
      'online', 'in-person', 'hybrid', 'group-class', 'individual',
      'structured', 'hands-on', 'project-based', 'theory',
      'professional', 'hobby', 'academic', 'practical'
    ];
  }

  /**
   * Automatically categorize and tag a skill
   * @param {object} skillData - Skill data to categorize
   * @returns {object} Categorized skill with suggested tags
   */
  async autoCategorizeSkill(skillData) {
    try {
      const { title, description, category } = skillData;
      
      // If category is already provided and valid, use it
      if (category && this.skillCategories[category]) {
        return {
          category: category,
          subcategory: this.suggestSubcategory(title, description, category),
          tags: this.generateTags(title, description, category),
          confidence: 1.0
        };
      }

      // Otherwise, analyze the content to determine category
      const analysis = this.analyzeSkillContent(title, description);
      
      return {
        category: analysis.category,
        subcategory: analysis.subcategory,
        tags: analysis.tags,
        confidence: analysis.confidence
      };

    } catch (error) {
      console.error('Skill categorization error:', error);
      throw error;
    }
  }

  /**
   * Analyze skill content to determine category
   * @param {string} title - Skill title
   * @param {string} description - Skill description
   * @returns {object} Category analysis result
   */
  analyzeSkillContent(title, description) {
    const content = `${title} ${description}`.toLowerCase();
    let bestMatch = { category: null, score: 0, subcategory: null };
    const tagScores = {};

    // Calculate relevance scores for each category
    for (const [categoryName, categoryData] of Object.entries(this.skillCategories)) {
      let score = 0;

      // Check keyword matches
      for (const keyword of categoryData.keywords) {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
        score += matches * 2; // Keyword matches are highly weighted
      }

      // Check subcategory relevance
      const subcategoryScore = this.calculateSubcategoryRelevance(content, categoryData.subcategories);
      score += subcategoryScore;

      if (score > bestMatch.score) {
        bestMatch = {
          category: categoryName,
          score: score,
          subcategory: this.suggestSubcategory(title, description, categoryName)
        };
      }

      // Store tag scores
      tagScores[categoryName] = score;
    }

    // Generate tags based on content analysis
    const tags = this.generateTags(title, description, bestMatch.category);

    // Calculate confidence based on score difference
    const scores = Object.values(tagScores).sort((a, b) => b - a);
    const confidence = scores.length > 1 
      ? Math.min(0.95, scores[0] / (scores[0] + scores[1]))
      : Math.min(0.8, scores[0] / 10);

    return {
      category: bestMatch.category || 'Programming', // Default fallback
      subcategory: bestMatch.subcategory,
      tags: tags,
      confidence: confidence
    };
  }

  /**
   * Calculate relevance to subcategories
   * @param {string} content - Content to analyze
   * @param {Array} subcategories - List of subcategories
   * @returns {number} Relevance score
   */
  calculateSubcategoryRelevance(content, subcategories) {
    let score = 0;
    
    for (const subcategory of subcategories) {
      const subcategoryLower = subcategory.toLowerCase();
      const words = subcategoryLower.split(' ');
      
      for (const word of words) {
        if (word.length > 3 && content.includes(word)) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  /**
   * Suggest appropriate subcategory
   * @param {string} title - Skill title
   * @param {string} description - Skill description
   * @param {string} category - Parent category
   * @returns {string} Suggested subcategory
   */
  suggestSubcategory(title, description, category) {
    const categoryData = this.skillCategories[category];
    if (!categoryData) return null;

    const content = `${title} ${description}`.toLowerCase();
    let bestMatch = { subcategory: null, score: 0 };

    for (const subcategory of categoryData.subcategories) {
      const score = this.calculateSubcategoryRelevance(content, [subcategory]);
      
      if (score > bestMatch.score) {
        bestMatch = { subcategory, score };
      }
    }

    return bestMatch.subcategory || categoryData.subcategories[0];
  }

  /**
   * Generate relevant tags for a skill
   * @param {string} title - Skill title
   * @param {string} description - Skill description
   * @param {string} category - Skill category
   * @returns {Array} Generated tags
   */
  generateTags(title, description, category) {
    const tags = new Set();
    const content = `${title} ${description}`.toLowerCase();

    // Add category-based tags
    tags.add(category.toLowerCase().replace(' ', '-'));

    // Add common skill tags based on content
    const tagPatterns = {
      'beginner-friendly': ['beginner', 'start', 'introduction', 'basics', 'fundamentals'],
      'intermediate': ['intermediate', 'moderate', 'some experience'],
      'advanced': ['advanced', 'expert', 'professional', 'complex'],
      'online': ['online', 'virtual', 'remote', 'zoom', 'video call'],
      'in-person': ['in-person', 'physical', 'location', 'face-to-face'],
      'certification': ['certificate', 'certification', 'diploma', 'accredited'],
      'hands-on': ['practical', 'hands-on', 'interactive', 'workshop'],
      'structured': ['course', 'curriculum', 'structured', 'program'],
      'project-based': ['project', 'portfolio', 'build', 'create']
    };

    for (const [tag, keywords] of Object.entries(tagPatterns)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.add(tag);
      }
    }

    // Add technology-specific tags
    if (category === 'Programming') {
      const techKeywords = {
        'javascript': ['javascript', 'js', 'node', 'react', 'vue'],
        'python': ['python', 'django', 'flask', 'data science'],
        'web-development': ['html', 'css', 'web', 'frontend', 'backend'],
        'mobile': ['android', 'ios', 'react native', 'flutter']
      };

      for (const [tag, keywords] of Object.entries(techKeywords)) {
        if (keywords.some(keyword => content.includes(keyword))) {
          tags.add(tag);
        }
      }
    }

    // Add creative tags for design and creative categories
    if (category === 'Design' || category === 'Creative') {
      const designKeywords = ['photoshop', 'illustrator', 'figma', 'sketch', 'canva'];
      for (const keyword of designKeywords) {
        if (content.includes(keyword)) {
          tags.add('design-software');
          break;
        }
      }
    }

    // Add difficulty and format tags based on description analysis
    if (content.includes('years') || content.includes('experience')) {
      tags.add('experience-required');
    }

    if (content.includes('group') || content.includes('class')) {
      tags.add('group-class');
    } else if (content.includes('one-on-one') || content.includes('individual')) {
      tags.add('individual');
    }

    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  /**
   * Get skill category statistics
   * @returns {object} Category statistics
   */
  async getCategoryStats() {
    try {
      const categories = await this.prisma.skill.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        _avg: {
          rating: true
        },
        _sum: {
          viewCount: true
        }
      });

      return categories.map(cat => ({
        category: cat.category,
        skillCount: cat._count.id,
        averageRating: cat._avg.rating || 0,
        totalViews: cat._sum.viewCount || 0,
        ...this.skillCategories[cat.category]
      }));

    } catch (error) {
      console.error('Failed to get category stats:', error);
      return [];
    }
  }

  /**
   * Get trending categories and tags
   * @param {number} days - Number of days to look back
   * @returns {object} Trending data
   */
  async getTrendingCategories(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trendingSkills = await this.prisma.skill.groupBy({
        by: ['category'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      // Get trending tags from the same period
      const allSkills = await this.prisma.skill.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          tags: true
        }
      });

      const tagCounts = {};
      allSkills.forEach(skill => {
        if (skill.tags) {
          skill.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const trendingTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

      return {
        categories: trendingSkills.map(skill => ({
          category: skill.category,
          newSkills: skill._count.id,
          ...this.skillCategories[skill.category]
        })),
        tags: trendingTags
      };

    } catch (error) {
      console.error('Failed to get trending categories:', error);
      return { categories: [], tags: [] };
    }
  }

  /**
   * Search skills by category and tags
   * @param {object} searchParams - Search parameters
   * @returns {object} Search results
   */
  async searchByCategory(searchParams) {
    try {
      const {
        category,
        subcategory,
        tags = [],
        minRating,
        isVerified,
        page = 1,
        limit = 20
      } = searchParams;

      const where = {};

      if (category) where.category = category;
      if (subcategory) where.subcategory = subcategory;
      if (minRating) where.rating = { gte: minRating };
      if (isVerified !== undefined) where.isVerified = isVerified;
      
      if (tags.length > 0) {
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
                profilePhoto: true,
                reputation: true
              }
            }
          },
          orderBy: [
            { isVerified: 'desc' },
            { rating: 'desc' },
            { createdAt: 'desc' }
          ],
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
        hasMore: (page * limit) < total
      };

    } catch (error) {
      console.error('Category search error:', error);
      throw error;
    }
  }

  /**
   * Get recommended skills based on user's interests and history
   * @param {number} userId - User ID
   * @param {number} limit - Number of recommendations
   * @returns {Array} Recommended skills
   */
  async getRecommendedSkills(userId, limit = 10) {
    try {
      // Get user's skill preferences and history
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          skills: true,
          exchanges: {
            where: { status: 'completed' },
            include: {
              skill: true
            }
          },
          preferences: {
            where: {
              category: 'skill_categories'
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get categories user is interested in
      const userCategories = new Set([
        ...user.skills.map(skill => skill.category),
        ...user.exchanges.map(exchange => exchange.skill.category),
        ...user.preferences.map(pref => pref.preferenceValue)
      ].filter(Boolean));

      // Find skills in user's preferred categories
      const recommendations = await this.prisma.skill.findMany({
        where: {
          category: { in: Array.from(userCategories) },
          isActive: true,
          userId: { not: userId }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
              reputation: true
            }
          }
        },
        orderBy: [
          { isVerified: 'desc' },
          { rating: 'desc' },
          { viewCount: 'desc' }
        ],
        take: limit
      });

      return recommendations;

    } catch (error) {
      console.error('Failed to get recommended skills:', error);
      return [];
    }
  }

  /**
   * Bulk categorize multiple skills
   * @param {Array} skills - Array of skills to categorize
   * @returns {Array} Categorized skills
   */
  async bulkCategorizeSkills(skills) {
    try {
      const results = [];
      
      for (const skill of skills) {
        try {
          const categorization = await this.autoCategorizeSkill(skill);
          
          // Update skill in database if needed
          if (skill.id && (skill.category !== categorization.category || skill.subcategory !== categorization.subcategory)) {
            await this.prisma.skill.update({
              where: { id: skill.id },
              data: {
                category: categorization.category,
                subcategory: categorization.subcategory,
                tags: categorization.tags
              }
            });
          }
          
          results.push({
            skillId: skill.id,
            success: true,
            categorization
          });
        } catch (error) {
          console.error(`Failed to categorize skill ${skill.id}:`, error);
          results.push({
            skillId: skill.id,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;

    } catch (error) {
      console.error('Bulk categorization error:', error);
      throw error;
    }
  }

  /**
   * Create or update skill category
   * @param {object} categoryData - Category data
   * @returns {object} Created/updated category
   */
  async createCategory(categoryData) {
    try {
      const { name, description, subcategories, color, icon } = categoryData;
      
      // Check if category already exists
      const existingCategory = await this.prisma.skillCategory.findUnique({
        where: { name }
      });

      if (existingCategory) {
        // Update existing category
        return await this.prisma.skillCategory.update({
          where: { name },
          data: {
            description,
            iconUrl: icon,
            color,
            subcategories: subcategories || []
          }
        });
      } else {
        // Create new category
        return await this.prisma.skillCategory.create({
          data: {
            name,
            description,
            iconUrl: icon,
            color,
            subcategories: subcategories || []
          }
        });
      }

    } catch (error) {
      console.error('Category creation error:', error);
      throw error;
    }
  }

  /**
   * Get all skill categories with metadata
   * @returns {Array} All categories
   */
  async getAllCategories() {
    try {
      const categories = await this.prisma.skillCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      return categories.map(category => ({
        ...category,
        metadata: this.skillCategories[category.name] || {}
      }));

    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  /**
   * Validate and suggest category corrections
   * @param {string} category - Category to validate
   * @param {string} subcategory - Subcategory to validate
   * @returns {object} Validation result
   */
  validateCategory(category, subcategory) {
    const isValidCategory = category && this.skillCategories[category];
    
    if (!isValidCategory) {
      return {
        valid: false,
        suggestions: Object.keys(this.skillCategories),
        message: 'Invalid category provided'
      };
    }

    const categoryData = this.skillCategories[category];
    const isValidSubcategory = !subcategory || categoryData.subcategories.includes(subcategory);

    if (!isValidSubcategory) {
      return {
        valid: true, // Category is valid
        correctedSubcategory: categoryData.subcategories[0], // Suggest first subcategory
        suggestions: categoryData.subcategories,
        message: 'Invalid subcategory, suggested correction applied'
      };
    }

    return {
      valid: true,
      message: 'Category and subcategory are valid'
    };
  }
}

module.exports = new SkillCategorizationService();