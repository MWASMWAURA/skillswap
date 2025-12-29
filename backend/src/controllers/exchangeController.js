const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Exchange statuses
const EXCHANGE_STATUSES = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'];

// Validation helpers
const validateExchangeData = (data) => {
  const { skillId, timeCredits, message } = data;
  
  if (!skillId || typeof skillId !== 'number') {
    throw new Error('Valid skill ID is required');
  }
  
  if (!timeCredits || typeof timeCredits !== 'number' || timeCredits <= 0) {
    throw new Error('Valid time credits (positive number) is required');
  }
  
  if (timeCredits > 100) {
    throw new Error('Time credits cannot exceed 100 hours');
  }
  
  if (message && message.trim().length > 500) {
    throw new Error('Message cannot exceed 500 characters');
  }
  
  return {
    skillId,
    timeCredits,
    message: message ? message.trim() : null
  };
};

// Create exchange request
const createExchange = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const exchangeData = validateExchangeData(req.body);
    
    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: exchangeData.skillId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Prevent self-requests
    if (skill.user.id === requesterId) {
      return res.status(400).json({ error: 'Cannot request your own skill' });
    }
    
    // Check for existing active exchange
    const existingExchange = await prisma.exchange.findFirst({
      where: {
        skillId: exchangeData.skillId,
        requesterId,
        status: { in: ['pending', 'accepted', 'in_progress'] }
      }
    });
    
    if (existingExchange) {
      return res.status(400).json({ 
        error: 'You already have an active exchange request for this skill' 
      });
    }
    
    // Create exchange
    const exchange = await prisma.exchange.create({
      data: {
        skillId: exchangeData.skillId,
        timeCredits: exchangeData.timeCredits,
        requesterId,
        providerId: skill.user.id,
        status: 'pending'
      },
      include: {
        skill: {
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
        },
        requester: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        },
        provider: {
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
      message: 'Exchange request created successfully',
      exchange
    });
    
  } catch (error) {
    console.error('Create exchange error:', error);
    res.status(400).json({ error: error.message || 'Failed to create exchange request' });
  }
};

// Get user's exchanges
const getUserExchanges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      role, // 'requester' or 'provider'
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
    
    if (role === 'requester') {
      where.requesterId = userId;
    } else if (role === 'provider') {
      where.providerId = userId;
    } else {
      // If no role specified, show both as requester and provider
      where.OR = [
        { requesterId: userId },
        { providerId: userId }
      ];
    }
    
    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    
    const [exchanges, totalCount] = await Promise.all([
      prisma.exchange.findMany({
        where,
        include: {
          skill: {
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
          },
          requester: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
              level: true,
              reputation: true
            }
          },
          provider: {
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
              messages: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.exchange.count({ where })
    ]);
    
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    res.json({
      exchanges,
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
    console.error('Get user exchanges error:', error);
    res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
};

// Get exchange by ID
const getExchangeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const exchange = await prisma.exchange.findUnique({
      where: { id: parseInt(id) },
      include: {
        skill: {
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
        },
        requester: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Check if user is part of this exchange
    if (exchange.requesterId !== userId && exchange.providerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this exchange' });
    }
    
    res.json(exchange);
    
  } catch (error) {
    console.error('Get exchange by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange' });
  }
};

// Update exchange status
const updateExchangeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledDate } = req.body;
    const userId = req.user.id;
    
    const exchangeId = parseInt(id);
    
    if (!status || !EXCHANGE_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Valid status is required: ${EXCHANGE_STATUSES.join(', ')}` 
      });
    }
    
    // Get existing exchange
    const existingExchange = await prisma.exchange.findUnique({
      where: { id: exchangeId }
    });
    
    if (!existingExchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Determine who can update status based on current status and requested status
    let updateData = { status };
    
    if (scheduledDate) {
      if (new Date(scheduledDate) <= new Date()) {
        return res.status(400).json({ error: 'Scheduled date must be in the future' });
      }
      updateData.scheduledDate = new Date(scheduledDate);
    }
    
    // Status transition logic
    if (status === 'accepted') {
      // Only provider can accept
      if (existingExchange.providerId !== userId) {
        return res.status(403).json({ error: 'Only the provider can accept this exchange' });
      }
      if (existingExchange.status !== 'pending') {
        return res.status(400).json({ error: 'Can only accept pending exchanges' });
      }
      
    } else if (status === 'rejected') {
      // Only provider can reject
      if (existingExchange.providerId !== userId) {
        return res.status(403).json({ error: 'Only the provider can reject this exchange' });
      }
      if (existingExchange.status !== 'pending') {
        return res.status(400).json({ error: 'Can only reject pending exchanges' });
      }
      
    } else if (status === 'in_progress') {
      // Both parties can mark as in progress
      if (![existingExchange.requesterId, existingExchange.providerId].includes(userId)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      if (!['accepted'].includes(existingExchange.status)) {
        return res.status(400).json({ error: 'Can only start accepted exchanges' });
      }
      
    } else if (status === 'completed') {
      // Both parties can complete
      if (![existingExchange.requesterId, existingExchange.providerId].includes(userId)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      if (!['accepted', 'in_progress'].includes(existingExchange.status)) {
        return res.status(400).json({ error: 'Can only complete accepted or in-progress exchanges' });
      }
      updateData.completedAt = new Date();
      
    } else if (status === 'cancelled') {
      // Either party can cancel
      if (![existingExchange.requesterId, existingExchange.providerId].includes(userId)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      if (!['pending', 'accepted'].includes(existingExchange.status)) {
        return res.status(400).json({ error: 'Can only cancel pending or accepted exchanges' });
      }
      
    }
    
    const exchange = await prisma.exchange.update({
      where: { id: exchangeId },
      data: updateData,
      include: {
        skill: {
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
        },
        requester: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        },
        provider: {
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
      message: 'Exchange status updated successfully',
      exchange
    });
    
  } catch (error) {
    console.error('Update exchange status error:', error);
    res.status(400).json({ error: error.message || 'Failed to update exchange status' });
  }
};

// Cancel exchange
const cancelExchange = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const exchangeId = parseInt(id);
    
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId }
    });
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Check if user is part of this exchange
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to cancel this exchange' });
    }
    
    // Check if exchange can be cancelled
    if (!['pending', 'accepted'].includes(exchange.status)) {
      return res.status(400).json({ error: 'Can only cancel pending or accepted exchanges' });
    }
    
    const updatedExchange = await prisma.exchange.update({
      where: { id: exchangeId },
      data: { status: 'cancelled' },
      include: {
        skill: {
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
        },
        requester: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            level: true,
            reputation: true
          }
        },
        provider: {
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
      message: 'Exchange cancelled successfully',
      exchange: updatedExchange
    });
    
  } catch (error) {
    console.error('Cancel exchange error:', error);
    res.status(500).json({ error: 'Failed to cancel exchange' });
  }
};

// Get exchange statistics
const getExchangeStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await prisma.exchange.groupBy({
      by: ['status'],
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ]
      },
      _count: {
        status: true
      }
    });
    
    const totalExchanges = await prisma.exchange.count({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ]
      }
    });
    
    const completedExchanges = await prisma.exchange.count({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ],
        status: 'completed'
      }
    });
    
    // Calculate success rate
    const successRate = totalExchanges > 0 ? (completedExchanges / totalExchanges * 100).toFixed(1) : 0;
    
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {});
    
    res.json({
      totalExchanges,
      completedExchanges,
      successRate: parseFloat(successRate),
      statusBreakdown: statusCounts
    });
    
  } catch (error) {
    console.error('Get exchange stats error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange statistics' });
  }
};

module.exports = {
  createExchange,
  getUserExchanges,
  getExchangeById,
  updateExchangeStatus,
  cancelExchange,
  getExchangeStats,
  EXCHANGE_STATUSES
};