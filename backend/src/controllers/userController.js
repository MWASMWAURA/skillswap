const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get user profile by ID
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    const userIdNum = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        location: true,
        reputation: true,
        xp: true,
        level: true,
        streak: true,
        createdAt: true,
        skills: {
          select: {
            id: true,
            title: true,
            category: {
              select: {
                name: true
              }
            },
            mode: true,
            duration: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        badges: {
          select: {
            id: true,
            badgeName: true,
            description: true,
            earnedAt: true
          },
          orderBy: { earnedAt: 'desc' }
        },
        requests: {
          select: {
            id: true,
            status: true,
            timeCredits: true,
            createdAt: true,
            skill: {
              select: {
                id: true,
                title: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            skills: true,
            exchanges: true,
            messages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If viewing another user's profile, exclude email and add basic stats
    if (requestingUserId !== userIdNum) {
      const { email, ...publicProfile } = user;
      
      // Calculate some public stats
      const stats = {
        totalSkills: user._count.skills,
        completedExchanges: user.exchanges.filter(ex => ex.status === 'completed').length,
        teachingHours: user.exchanges
          .filter(ex => ex.status === 'completed')
          .reduce((total, ex) => total + ex.timeCredits, 0),
        joinDate: user.createdAt.toISOString().split('T')[0]
      };

      res.json({
        ...publicProfile,
        stats
      });
    } else {
      // If viewing own profile, include sensitive data
      res.json(user);
    }

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, location, profilePhoto, bio, phone, website } = req.body;

    // Validate data
    if (name && (name.trim().length < 2 || name.trim().length > 50)) {
      return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
    }

    if (location && location.trim().length > 100) {
      return res.status(400).json({ error: 'Location cannot exceed 100 characters' });
    }

    if (bio && bio.trim().length > 500) {
      return res.status(400).json({ error: 'Bio cannot exceed 500 characters' });
    }

    if (phone && phone.trim().length > 20) {
      return res.status(400).json({ error: 'Phone cannot exceed 20 characters' });
    }

    if (website && website.trim().length > 200) {
      return res.status(400).json({ error: 'Website cannot exceed 200 characters' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (location) updateData.location = location.trim();
    if (profilePhoto) updateData.profilePhoto = profilePhoto;
    if (bio !== undefined) updateData.bio = bio.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (website !== undefined) updateData.website = website.trim();

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        location: true,
        bio: true,
        phone: true,
        website: true,
        reputation: true,
        xp: true,
        level: true,
        streak: true,
        createdAt: true,
        emailVerified: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { 
      query, 
      category, 
      location, 
      minLevel = 1, 
      maxLevel = 100,
      page = 1, 
      limit = 20,
      sortBy = 'reputation',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build search conditions
    const where = {
      AND: [
        { level: { gte: parseInt(minLevel) } },
        { level: { lte: parseInt(maxLevel) } }
      ]
    };

    // Text search
    if (query) {
      where.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } }
        ]
      });
    }

    // Location filter
    if (location) {
      where.AND.push({
        location: { contains: location, mode: 'insensitive' }
      });
    }

    // Category filter (users who have skills in this category)
    if (category) {
      where.AND.push({
        skills: {
          some: {
            categoryId: parseInt(category)
          }
        }
      });
    }

    // Build orderBy
    const orderBy = {};
    if (sortBy === 'reputation') {
      orderBy.reputation = sortOrder;
    } else if (sortBy === 'level') {
      orderBy.level = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'recent') {
      orderBy.createdAt = sortOrder;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          profilePhoto: true,
          location: true,
          reputation: true,
          xp: true,
          level: true,
          streak: true,
          createdAt: true,
          skills: {
            select: {
              id: true,
              title: true,
              category: {
                select: {
                  name: true
                }
              }
            },
            take: 3,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              skills: true,
              exchanges: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.$transaction([
      // Basic user info
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          reputation: true,
          xp: true,
          level: true,
          streak: true
        }
      }),
      // Skill statistics
      prisma.skill.aggregate({
        where: { userId },
        _count: { id: true }
      }),
      // Exchange statistics
      prisma.exchange.groupBy({
        by: ['status'],
        where: {
          OR: [
            { requesterId: userId },
            { providerId: userId }
          ]
        },
        _count: { status: true }
      }),
      // Monthly activity (last 6 months)
      prisma.exchange.findMany({
        where: {
          OR: [
            { requesterId: userId },
            { providerId: userId }
          ],
          status: 'completed',
          completedAt: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months ago
          }
        },
        select: {
          completedAt: true,
          timeCredits: true
        }
      })
    ]);

    const [user, skillCount, exchangeStats, recentActivity] = stats;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process exchange stats
    const exchangeCounts = exchangeStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {});

    // Process recent activity for monthly chart
    const monthlyActivity = {};
    recentActivity.forEach(activity => {
      const month = activity.completedAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyActivity[month]) {
        monthlyActivity[month] = { exchanges: 0, hours: 0 };
      }
      monthlyActivity[month].exchanges += 1;
      monthlyActivity[month].hours += activity.timeCredits;
    });

    // Get review statistics for rating calculation
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true }
    });

    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Return data in format expected by frontend
    res.json({
      totalExchanges: Object.values(exchangeCounts).reduce((sum, count) => sum + count, 0),
      rating: avgRating,
      reviewCount: reviews.length,
      xp: user.xp,
      level: user.level,
      badges: [], // TODO: Get actual badges
      skillsTaught: skillCount._count.id,
      skillsLearned: exchangeCounts.completed || 0,
      streak: user.streak,
      reputation: user.reputation
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Check for active exchanges
    const activeExchanges = await prisma.exchange.count({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ],
        status: { in: ['pending', 'accepted', 'in_progress'] }
      }
    });

    if (activeExchanges > 0) {
      return res.status(400).json({
        error: 'Cannot delete account with active exchanges. Please complete or cancel all active exchanges first.'
      });
    }

    // In a real application, you might want to soft-delete instead
    // For now, we'll hard delete for demonstration
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword,
  searchUsers,
  getUserStats,
  deleteAccount
};