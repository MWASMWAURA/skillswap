const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get platform statistics and analytics
const getDashboardStats = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const timeFrames = {
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    };

    const sinceDate = timeFrames[timeframe] || timeFrames['30d'];

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalSkills,
      activeSkills,
      totalExchanges,
      completedExchanges,
      pendingExchanges,
      totalMessages,
      totalReports,
      pendingReports,
      recentReports
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActivity: {
            gte: sinceDate
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: sinceDate
          }
        }
      }),
      prisma.skill.count(),
      prisma.skill.count({
        where: {
          isActive: true
        }
      }),
      prisma.exchange.count(),
      prisma.exchange.count({
        where: {
          status: 'completed'
        }
      }),
      prisma.exchange.count({
        where: {
          status: 'pending'
        }
      }),
      prisma.message.count({
        where: {
          createdAt: {
            gte: sinceDate
          }
        }
      }),
      prisma.report.count(),
      prisma.report.count({
        where: {
          status: 'pending'
        }
      }),
      prisma.report.findMany({
        where: {
          status: 'pending'
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Get user growth data
    const userGrowthData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${sinceDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    // Get exchange status distribution
    const exchangeStats = await prisma.exchange.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
      where: {
        createdAt: {
          gte: sinceDate
        }
      }
    });

    // Get top skills by category
    const skillCategories = await prisma.skill.groupBy({
      by: ['category'],
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
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        totalSkills,
        activeSkills,
        totalExchanges,
        completedExchanges,
        pendingExchanges,
        totalMessages,
        totalReports,
        pendingReports
      },
      charts: {
        userGrowth: userGrowthData,
        exchangeStats,
        skillCategories
      },
      recentReports,
      timeframe,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

// Get all users with pagination and filtering
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          banned: true,
          level: true,
          xp: true,
          reputation: true,
          streak: true,
          lastActivity: true,
          createdAt: true,
          _count: {
            select: {
              skills: true,
              exchanges: true,
              badges: true,
              messages: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
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
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get user details for admin view
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        banned: true,
        banReason: true,
        bannedAt: true,
        profilePhoto: true,
        location: true,
        bio: true,
        level: true,
        xp: true,
        reputation: true,
        streak: true,
        longestStreak: true,
        lastActivity: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        skills: {
          select: {
            id: true,
            title: true,
            category: true,
            isActive: true,
            isVerified: true,
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
            completedAt: true
          }
        },
        badges: {
          select: {
            id: true,
            badgeName: true,
            description: true,
            badgeType: true,
            rarity: true,
            earnedAt: true
          }
        },
        messages: {
          select: {
            id: true,
            message: true,
            createdAt: true
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        },
        activityLogs: {
          select: {
            id: true,
            action: true,
            resource: true,
            createdAt: true
          },
          take: 20,
          orderBy: {
            createdAt: 'desc'
          }
        },
        reports: {
          where: {
            reportedUserId: parseInt(userId)
          },
          select: {
            id: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true
          }
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
};

// Ban/unban user
const toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { banReason, banDuration } = req.body;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateData = {
      banned: !user.banned,
      banReason: !user.banned ? banReason : null,
      bannedAt: !user.banned ? new Date() : null
    };

    // If banning, calculate ban expiration if duration is specified
    if (!user.banned && banDuration) {
      const banExpiration = new Date();
      banExpiration.setDate(banExpiration.getDate() + banDuration);
      updateData.banExpiresAt = banExpiration;
    } else {
      updateData.banExpiresAt = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: !user.banned ? 'user_banned' : 'user_unbanned',
        resource: 'user',
        resourceId: parseInt(userId),
        metadata: {
          banReason: banReason,
          banDuration: banDuration
        }
      }
    });

    // Create notification for user
    if (!user.banned) {
      await prisma.notification.create({
        data: {
          userId: parseInt(userId),
          title: 'Account Banned',
          message: `Your account has been banned. Reason: ${banReason}`,
          type: 'error',
          category: 'system'
        }
      });
    }

    res.json({
      message: `User ${!user.banned ? 'banned' : 'unbanned'} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        banned: updatedUser.banned,
        banReason: updatedUser.banReason,
        bannedAt: updatedUser.bannedAt
      }
    });

  } catch (error) {
    console.error('Toggle user ban error:', error);
    res.status(500).json({ error: 'Failed to toggle user ban' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { role }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'user_role_updated',
        resource: 'user',
        resourceId: parseInt(userId),
        metadata: { oldRole: user.role, newRole: role }
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        title: 'Role Updated',
        message: `Your role has been updated to ${role}`,
        type: 'info',
        category: 'system'
      }
    });

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Get all reports
const getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reportedContentType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (reportedContentType) {
      where.reportedContentType = reportedContentType;
    }

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          // Note: We can't do nested includes in Prisma, so we'll fetch basic data
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take
      }),
      prisma.report.count({ where })
    ]);

    // Manually fetch related data for each report
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        let reportedContent = null;
        
        try {
          switch (report.reportedContentType) {
            case 'user':
              reportedContent = await prisma.user.findUnique({
                where: { id: report.reportedContentId },
                select: { id: true, name: true, email: true }
              });
              break;
            case 'skill':
              reportedContent = await prisma.skill.findUnique({
                where: { id: report.reportedContentId },
                select: { id: true, title: true, description: true }
              });
              break;
            case 'message':
              reportedContent = await prisma.message.findUnique({
                where: { id: report.reportedContentId },
                select: { id: true, message: true, createdAt: true }
              });
              break;
          }
        } catch (error) {
          console.error('Error fetching reported content:', error);
        }

        return {
          ...report,
          reportedContent
        };
      })
    );

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      reports: reportsWithDetails,
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
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
};

// Review and resolve a report
const reviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, resolution, action } = req.body;
    const adminId = req.user.id;

    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status,
        resolution,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // Take action based on report resolution
    if (action && status === 'resolved') {
      switch (action) {
        case 'ban_user':
          await prisma.user.update({
            where: { id: report.reportedUserId },
            data: {
              banned: true,
              banReason: `Reported for: ${report.reason}`,
              bannedAt: new Date()
            }
          });
          break;
        case 'delete_content':
          // This would depend on the content type
          if (report.reportedContentType === 'skill') {
            await prisma.skill.update({
              where: { id: report.reportedContentId },
              data: { isActive: false }
            });
          }
          break;
        case 'warn_user':
          await prisma.notification.create({
            data: {
              userId: report.reportedUserId,
              title: 'Warning',
              message: `You have received a warning for: ${report.reason}`,
              type: 'warning',
              category: 'moderation'
            }
          });
          break;
      }
    }

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'report_reviewed',
        resource: 'report',
        resourceId: parseInt(reportId),
        metadata: { status, resolution, action }
      }
    });

    res.json({
      message: 'Report reviewed successfully',
      report: {
        id: report.id,
        status: report.status,
        resolution: report.resolution,
        reviewedAt: report.reviewedAt
      }
    });

  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
};

// Get skill reports
const getSkillReports = async (req, res) => {
  try {
    const { skillId } = req.params;
    
    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(skillId) },
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

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const reports = await prisma.report.findMany({
      where: {
        reportedContentType: 'skill',
        reportedContentId: parseInt(skillId)
      },
      include: {
        // Include reporter details if available
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      skill,
      reports
    });

  } catch (error) {
    console.error('Get skill reports error:', error);
    res.status(500).json({ error: 'Failed to get skill reports' });
  }
};

// Moderate skill (approve/reject/verify)
const moderateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user.id;

    const validActions = ['approve', 'reject', 'verify', 'unverify', 'deactivate'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    let updateData = {};
    
    switch (action) {
      case 'approve':
        updateData = { 
          verificationStatus: 'approved',
          isVerified: true,
          isActive: true
        };
        break;
      case 'reject':
        updateData = { 
          verificationStatus: 'rejected',
          isVerified: false,
          isActive: false
        };
        break;
      case 'verify':
        updateData = { 
          verificationStatus: 'verified',
          isVerified: true
        };
        break;
      case 'unverify':
        updateData = { 
          verificationStatus: 'unverified',
          isVerified: false
        };
        break;
      case 'deactivate':
        updateData = { isActive: false };
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
        title: 'Skill Moderation',
        message: `Your skill "${skill.title}" has been ${action}. ${reason ? `Reason: ${reason}` : ''}`,
        type: action === 'approve' || action === 'verify' ? 'success' : 'warning',
        category: 'moderation'
      }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: `skill_${action}ed`,
        resource: 'skill',
        resourceId: parseInt(skillId),
        metadata: { action, reason }
      }
    });

    res.json({
      message: `Skill ${action}ed successfully`,
      skill: {
        id: skill.id,
        title: skill.title,
        verificationStatus: skill.verificationStatus,
        isVerified: skill.isVerified,
        isActive: skill.isActive
      }
    });

  } catch (error) {
    console.error('Moderate skill error:', error);
    res.status(500).json({ error: 'Failed to moderate skill' });
  }
};

// Get system activity logs
const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resource,
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (userId) {
      where.userId = parseInt(userId);
    }
    
    if (action) {
      where.action = action;
    }
    
    if (resource) {
      where.resource = resource;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take
      }),
      prisma.activityLog.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      logs,
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
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
};

// Bulk user operations
const bulkUserOperations = async (req, res) => {
  try {
    const { userIds, operation, data } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (userIds.length > 100) {
      return res.status(400).json({ error: 'Cannot process more than 100 users at once' });
    }

    const validOperations = ['ban', 'unban', 'update_role', 'activate', 'deactivate'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation' });
    }

    const results = {
      successful: [],
      failed: [],
      total: userIds.length
    };

    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (userId) => {
        try {
          const numericUserId = parseInt(userId);
          
          let updateData = {};
          let action = '';
          
          switch (operation) {
            case 'ban':
              updateData = { 
                banned: true, 
                banReason: data.reason || 'Bulk ban operation',
                bannedAt: new Date()
              };
              action = 'bulk_banned';
              break;
            case 'unban':
              updateData = { 
                banned: false, 
                banReason: null,
                bannedAt: null
              };
              action = 'bulk_unbanned';
              break;
            case 'update_role':
              if (!data.role || !['user', 'admin', 'moderator'].includes(data.role)) {
                throw new Error('Invalid role');
              }
              updateData = { role: data.role };
              action = 'bulk_role_updated';
              break;
            case 'activate':
              updateData = { isActive: true };
              action = 'bulk_activated';
              break;
            case 'deactivate':
              updateData = { isActive: false };
              action = 'bulk_deactivated';
              break;
          }

          const updatedUser = await prisma.user.update({
            where: { id: numericUserId },
            data: updateData,
            select: { id: true, name: true }
          });

          // Log admin action
          await prisma.activityLog.create({
            data: {
              userId: adminId,
              action,
              resource: 'user',
              resourceId: numericUserId,
              metadata: { operation, bulk: true }
            }
          });

          // Send notification for ban/unban operations
          if (operation === 'ban' || operation === 'unban') {
            await prisma.notification.create({
              data: {
                userId: numericUserId,
                title: operation === 'ban' ? 'Account Banned' : 'Account Unbanned',
                message: operation === 'ban' 
                  ? 'Your account has been banned by an administrator.'
                  : 'Your account has been unbanned by an administrator.',
                type: operation === 'ban' ? 'error' : 'success',
                category: 'system'
              }
            });
          }

          results.successful.push({
            userId: numericUserId,
            name: updatedUser.name,
            operation
          });

        } catch (error) {
          results.failed.push({
            userId,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
    }

    res.json({
      message: `Bulk operation completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk user operations error:', error);
    res.status(500).json({ error: 'Failed to perform bulk user operations' });
  }
};

// Bulk skill moderation
const bulkSkillOperations = async (req, res) => {
  try {
    const { skillIds, operation, data } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({ error: 'Skill IDs array is required' });
    }

    if (skillIds.length > 100) {
      return res.status(400).json({ error: 'Cannot process more than 100 skills at once' });
    }

    const validOperations = ['approve', 'reject', 'verify', 'unverify', 'activate', 'deactivate'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation' });
    }

    const results = {
      successful: [],
      failed: [],
      total: skillIds.length
    };

    // Process skills in batches
    const batchSize = 10;
    for (let i = 0; i < skillIds.length; i += batchSize) {
      const batch = skillIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (skillId) => {
        try {
          const numericSkillId = parseInt(skillId);
          
          let updateData = {};
          let action = '';
          
          switch (operation) {
            case 'approve':
              updateData = { 
                verificationStatus: 'approved',
                isVerified: true,
                isActive: true
              };
              action = 'bulk_approved';
              break;
            case 'reject':
              updateData = { 
                verificationStatus: 'rejected',
                isVerified: false,
                isActive: false
              };
              action = 'bulk_rejected';
              break;
            case 'verify':
              updateData = { 
                verificationStatus: 'verified',
                isVerified: true
              };
              action = 'bulk_verified';
              break;
            case 'unverify':
              updateData = { 
                verificationStatus: 'unverified',
                isVerified: false
              };
              action = 'bulk_unverified';
              break;
            case 'activate':
              updateData = { isActive: true };
              action = 'bulk_activated';
              break;
            case 'deactivate':
              updateData = { isActive: false };
              action = 'bulk_deactivated';
              break;
          }

          const skill = await prisma.skill.update({
            where: { id: numericSkillId },
            data: updateData,
            select: { 
              id: true, 
              title: true, 
              userId: true 
            }
          });

          // Log admin action
          await prisma.activityLog.create({
            data: {
              userId: adminId,
              action,
              resource: 'skill',
              resourceId: numericSkillId,
              metadata: { operation, bulk: true }
            }
          });

          // Send notification to skill owner
          await prisma.notification.create({
            data: {
              userId: skill.userId,
              title: 'Skill Moderation',
              message: `Your skill "${skill.title}" has been ${operation} through bulk operation.`,
              type: operation === 'approve' || operation === 'verify' ? 'success' : 'warning',
              category: 'moderation'
            }
          });

          results.successful.push({
            skillId: numericSkillId,
            title: skill.title,
            operation
          });

        } catch (error) {
          results.failed.push({
            skillId,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
    }

    res.json({
      message: `Bulk skill operation completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk skill operations error:', error);
    res.status(500).json({ error: 'Failed to perform bulk skill operations' });
  }
};

// Bulk report handling
const bulkReportOperations = async (req, res) => {
  try {
    const { reportIds, operation, data } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'Report IDs array is required' });
    }

    if (reportIds.length > 100) {
      return res.status(400).json({ error: 'Cannot process more than 100 reports at once' });
    }

    const validOperations = ['resolve', 'dismiss', 'mark_reviewed'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation' });
    }

    const results = {
      successful: [],
      failed: [],
      total: reportIds.length
    };

    // Process reports in batches
    const batchSize = 10;
    for (let i = 0; i < reportIds.length; i += batchSize) {
      const batch = reportIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (reportId) => {
        try {
          const numericReportId = parseInt(reportId);
          
          let updateData = {};
          let status = '';
          
          switch (operation) {
            case 'resolve':
              status = 'resolved';
              updateData = {
                status,
                resolution: data.resolution || 'Bulk resolved',
                reviewedBy: adminId,
                reviewedAt: new Date()
              };
              break;
            case 'dismiss':
              status = 'dismissed';
              updateData = {
                status,
                resolution: data.resolution || 'Bulk dismissed',
                reviewedBy: adminId,
                reviewedAt: new Date()
              };
              break;
            case 'mark_reviewed':
              status = 'reviewed';
              updateData = {
                status,
                reviewedBy: adminId,
                reviewedAt: new Date()
              };
              break;
          }

          const report = await prisma.report.update({
            where: { id: numericReportId },
            data: updateData,
            select: { 
              id: true, 
              reason: true,
              reportedUserId: true
            }
          });

          // Log admin action
          await prisma.activityLog.create({
            data: {
              userId: adminId,
              action: `report_${operation}`,
              resource: 'report',
              resourceId: numericReportId,
              metadata: { operation, bulk: true }
            }
          });

          results.successful.push({
            reportId: numericReportId,
            reason: report.reason,
            operation
          });

        } catch (error) {
          results.failed.push({
            reportId,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
    }

    res.json({
      message: `Bulk report operation completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk report operations error:', error);
    res.status(500).json({ error: 'Failed to perform bulk report operations' });
  }
};

// Send bulk notifications
const bulkSendNotifications = async (req, res) => {
  try {
    const { userIds, title, message, type = 'info', category = 'system', actionUrl } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (userIds.length > 1000) {
      return res.status(400).json({ error: 'Cannot send notifications to more than 1000 users at once' });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const results = {
      successful: [],
      failed: [],
      total: userIds.length
    };

    // Process notifications in batches
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (userId) => {
        try {
          const numericUserId = parseInt(userId);
          
          await prisma.notification.create({
            data: {
              userId: numericUserId,
              title,
              message,
              type,
              category,
              actionUrl: actionUrl || null
            }
          });

          results.successful.push({ userId: numericUserId });

        } catch (error) {
          results.failed.push({
            userId,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
    }

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'bulk_notifications_sent',
        resource: 'notification',
        metadata: { 
          recipientCount: results.successful.length,
          title,
          type,
          category
        }
      }
    });

    res.json({
      message: `Bulk notifications sent. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk send notifications error:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserDetails,
  toggleUserBan,
  updateUserRole,
  getReports,
  reviewReport,
  getSkillReports,
  moderateSkill,
  getActivityLogs,
  bulkUserOperations,
  bulkSkillOperations,
  bulkReportOperations,
  bulkSendNotifications
};