const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get messages for an exchange with enhanced features
const getExchangeMessages = async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { page = 1, limit = 50, includeDeleted = false } = req.query;
    const userId = req.user.id;
    
    const exchangeIdNum = parseInt(exchangeId);
    
    // Verify user is part of this exchange
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeIdNum },
      select: {
        id: true,
        requesterId: true,
        providerId: true,
        status: true,
        skill: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
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
      }
    });
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to view messages for this exchange' });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Build message query
    const messageWhere = { 
      exchangeId: exchangeIdNum,
      deleted: includeDeleted === 'true' ? undefined : false
    };
    
    const messages = await prisma.message.findMany({
      where: messageWhere,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profilePhoto: true
          }
        },
        reactions: {
          select: {
            id: true,
            emoji: true,
            userId: true
          }
        },
        threadReplies: {
          where: { deleted: false },
          select: {
            id: true,
            message: true,
            sender: {
              select: {
                id: true,
                name: true,
                profilePhoto: true
              }
            },
            createdAt: true
          },
          orderBy: { createdAt: 'asc' },
          take: 3 // Limit thread replies
        }
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take
    });
    
    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        exchangeId: exchangeIdNum,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true, readAt: new Date() }
    });
    
    // Get conversation statistics
    const totalMessages = await prisma.message.count({
      where: { exchangeId: exchangeIdNum, deleted: false }
    });
    
    const unreadCount = await prisma.message.count({
      where: {
        exchangeId: exchangeIdNum,
        senderId: { not: userId },
        isRead: false
      }
    });
    
    // Get last message
    const lastMessage = await prisma.message.findFirst({
      where: { exchangeId: exchangeIdNum, deleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      }
    });
    
    res.json({
      messages,
      conversation: {
        ...exchange,
        lastMessage,
        totalMessages,
        unreadCount,
        isArchived: false // You could add this field to the database
      },
      pagination: {
        currentPage: parseInt(page),
        hasMore: messages.length === take,
        totalPages: Math.ceil(totalMessages / take)
      }
    });
    
  } catch (error) {
    console.error('Get exchange messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a message in an exchange
const sendMessage = async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { message: messageText } = req.body;
    const userId = req.user.id;
    
    const exchangeIdNum = parseInt(exchangeId);
    
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    if (messageText.length > 1000) {
      return res.status(400).json({ error: 'Message cannot exceed 1000 characters' });
    }
    
    // Verify user is part of this exchange
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeIdNum },
      select: {
        id: true,
        requesterId: true,
        providerId: true,
        status: true
      }
    });
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to send messages for this exchange' });
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        exchangeId: exchangeIdNum,
        senderId: userId,
        message: messageText.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profilePhoto: true
          }
        },
        exchange: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    
    // Emit real-time message via WebSocket if available
    // This will be handled by the WebSocket handler
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;
    
    const exchangeIdNum = parseInt(exchangeId);
    
    // Verify user is part of this exchange
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeIdNum },
      select: {
        requesterId: true,
        providerId: true
      }
    });
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await prisma.message.updateMany({
      where: {
        exchangeId: exchangeIdNum,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.json({
      message: 'Messages marked as read',
      markedAsRead: result.count
    });
    
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Get unread message count
const getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all exchanges where user is participant
    const userExchanges = await prisma.exchange.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ]
      },
      select: { id: true }
    });
    
    const exchangeIds = userExchanges.map(ex => ex.id);
    
    if (exchangeIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }
    
    const unreadCount = await prisma.message.count({
      where: {
        exchangeId: { in: exchangeIds },
        senderId: { not: userId },
        isRead: false
      }
    });
    
    res.json({ unreadCount });
    
  } catch (error) {
    console.error('Get unread message count error:', error);
    res.status(500).json({ error: 'Failed to get unread message count' });
  }
};

// Add reaction to a message
const addMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    const messageIdNum = parseInt(messageId);
    
    if (!emoji || emoji.length === 0) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    // Verify message exists and user has access
    const message = await prisma.message.findUnique({
      where: { id: messageIdNum },
      include: {
        exchange: {
          select: {
            requesterId: true,
            providerId: true
          }
        }
      }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (![message.exchange.requesterId, message.exchange.providerId].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to react to this message' });
    }
    
    // Check if reaction already exists (one reaction per user per message)
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId: messageIdNum,
        userId: userId
      }
    });
    
    if (existingReaction) {
      // Update existing reaction
      await prisma.messageReaction.update({
        where: { id: existingReaction.id },
        data: { emoji }
      });
    } else {
      // Create new reaction
      await prisma.messageReaction.create({
        data: {
          messageId: messageIdNum,
          userId: userId,
          emoji: emoji
        }
      });
    }
    
    // Get updated reactions
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: messageIdNum },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true
          }
        }
      }
    });
    
    res.json({
      message: 'Reaction added successfully',
      reactions
    });
    
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Remove reaction from a message
const removeMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const messageIdNum = parseInt(messageId);
    
    await prisma.messageReaction.deleteMany({
      where: {
        messageId: messageIdNum,
        userId: userId
      }
    });
    
    res.json({ message: 'Reaction removed successfully' });
    
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
};

// Edit a message (only sender can edit)
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message: newMessage } = req.body;
    const userId = req.user.id;
    
    const messageIdNum = parseInt(messageId);
    
    if (!newMessage || newMessage.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    if (newMessage.length > 1000) {
      return res.status(400).json({ error: 'Message cannot exceed 1000 characters' });
    }
    
    const message = await prisma.message.findUnique({
      where: { id: messageIdNum },
      include: {
        exchange: {
          select: {
            requesterId: true,
            providerId: true
          }
        }
      }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }
    
    if (message.deleted) {
      return res.status(400).json({ error: 'Cannot edit deleted message' });
    }
    
    // Check if message is too old to edit (older than 1 hour)
    const messageAge = Date.now() - message.createdAt.getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (messageAge > maxAge) {
      return res.status(400).json({ error: 'Cannot edit messages older than 1 hour' });
    }
    
    const updatedMessage = await prisma.message.update({
      where: { id: messageIdNum },
      data: {
        message: newMessage.trim(),
        edited: true,
        editedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profilePhoto: true
          }
        }
      }
    });
    
    res.json({
      message: 'Message edited successfully',
      message: updatedMessage
    });
    
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

// Delete a message (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const messageIdNum = parseInt(messageId);
    
    const message = await prisma.message.findUnique({
      where: { id: messageIdNum },
      include: {
        exchange: {
          select: {
            requesterId: true,
            providerId: true
          }
        }
      }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only sender can delete their own message
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }
    
    // Soft delete instead of hard delete
    await prisma.message.update({
      where: { id: messageIdNum },
      data: {
        deleted: true,
        deletedAt: new Date()
      }
    });
    
    res.json({ message: 'Message deleted successfully' });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Get user's conversation list
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Get all exchanges where user is participant
    const exchanges = await prisma.exchange.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ]
      },
      include: {
        skill: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
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
        },
        messages: {
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take
    });
    
    // Format conversations with additional metadata
    const conversations = exchanges.map(exchange => {
      const otherUser = exchange.requesterId === userId ? exchange.provider : exchange.requester;
      const lastMessage = exchange.messages[0];
      
      return {
        id: exchange.id,
        skill: exchange.skill,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          profilePhoto: otherUser.profilePhoto
        },
        status: exchange.status,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          message: lastMessage.message.length > 100 ? 
            lastMessage.message.substring(0, 100) + '...' : 
            lastMessage.message,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt
        } : null,
        updatedAt: exchange.updatedAt,
        createdAt: exchange.createdAt
      };
    });
    
    // Get total count for pagination
    const totalConversations = await prisma.exchange.count({
      where: {
        OR: [
          { requesterId: userId },
          { providerId: userId }
        ]
      }
    });
    
    res.json({
      conversations,
      pagination: {
        currentPage: parseInt(page),
        hasMore: conversations.length === take,
        totalPages: Math.ceil(totalConversations / take)
      }
    });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

module.exports = {
  getExchangeMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  addMessageReaction,
  removeMessageReaction,
  editMessage,
  deleteMessage,
  getUserConversations
};