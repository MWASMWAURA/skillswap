const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Store active users and their typing status
const activeUsers = new Map();
const typingUsers = new Map();

// Store WebRTC peer connections
const peerConnections = new Map();

const handleSocketConnection = (socket, io) => {
  console.log('User connected:', socket.id);

  // Handle user authentication for WebSocket
  socket.on('authenticate', async (data) => {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('auth_error', { error: 'User ID required' });
        return;
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { id: true, name: true }
      });

      if (!user) {
        socket.emit('auth_error', { error: 'Invalid user' });
        return;
      }

      // Store user connection
      activeUsers.set(socket.id, { userId: parseInt(userId), name: user.name });
      socket.userId = parseInt(userId);
      
      socket.emit('authenticated', { success: true, user: user });
      console.log(`User ${user.name} authenticated via WebSocket`);
      
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
    }
  });

  // Join exchange room
  socket.on('joinExchange', async (exchangeId) => {
    try {
      const userId = socket.userId;
      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      const exchange = await prisma.exchange.findUnique({
        where: { id: parseInt(exchangeId) },
        select: { 
          id: true, 
          requesterId: true, 
          providerId: true,
          status: true 
        }
      });

      if (!exchange) {
        socket.emit('error', { error: 'Exchange not found' });
        return;
      }

      if (![exchange.requesterId, exchange.providerId].includes(userId)) {
        socket.emit('error', { error: 'Not authorized for this exchange' });
        return;
      }

      socket.join(`exchange_${exchangeId}`);
      socket.currentExchange = parseInt(exchangeId);
      
      // Notify others that user joined
      socket.to(`exchange_${exchangeId}`).emit('userJoined', {
        userId,
        timestamp: new Date()
      });

      console.log(`User ${userId} joined exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('Join exchange error:', error);
      socket.emit('error', { error: 'Failed to join exchange' });
    }
  });

  // Leave exchange room
  socket.on('leaveExchange', (exchangeId) => {
    socket.leave(`exchange_${exchangeId}`);
    if (socket.currentExchange === parseInt(exchangeId)) {
      socket.currentExchange = null;
    }
  });

  // Send message
  socket.on('sendMessage', async (data) => {
    try {
      const { exchangeId, message } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      if (!message || !message.trim()) {
        socket.emit('error', { error: 'Message cannot be empty' });
        return;
      }

      if (message.length > 1000) {
        socket.emit('error', { error: 'Message too long (max 1000 characters)' });
        return;
      }

      // Verify user is part of exchange
      const exchange = await prisma.exchange.findUnique({
        where: { id: parseInt(exchangeId) },
        select: { 
          requesterId: true, 
          providerId: true,
          status: true 
        }
      });

      if (!exchange) {
        socket.emit('error', { error: 'Exchange not found' });
        return;
      }

      if (![exchange.requesterId, exchange.providerId].includes(userId)) {
        socket.emit('error', { error: 'Not authorized for this exchange' });
        return;
      }

      // Create message in database
      const newMessage = await prisma.message.create({
        data: { 
          exchangeId: parseInt(exchangeId), 
          senderId: userId, 
          message: message.trim()
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

      // Broadcast to all users in the exchange
      io.to(`exchange_${exchangeId}`).emit('newMessage', {
        ...newMessage,
        timestamp: newMessage.createdAt
      });

      // Mark message as read by sender immediately
      await prisma.message.update({
        where: { id: newMessage.id },
        data: { isRead: true }
      });

      // Emit read receipt to sender
      socket.emit('messageDelivered', { 
        messageId: newMessage.id,
        timestamp: newMessage.createdAt 
      });

      console.log(`Message sent in exchange ${exchangeId} by user ${userId}`);
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { error: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typingStart', (exchangeId) => {
    const userId = socket.userId;
    if (!userId) return;

    const exchangeKey = `exchange_${exchangeId}`;
    if (!typingUsers.has(exchangeKey)) {
      typingUsers.set(exchangeKey, new Set());
    }
    
    typingUsers.get(exchangeKey).add(userId);
    
    // Notify other users in exchange
    socket.to(`exchange_${exchangeId}`).emit('userTyping', {
      userId,
      isTyping: true
    });
  });

  socket.on('typingStop', (exchangeId) => {
    const userId = socket.userId;
    if (!userId) return;

    const exchangeKey = `exchange_${exchangeId}`;
    if (typingUsers.has(exchangeKey)) {
      typingUsers.get(exchangeKey).delete(userId);
    }
    
    // Notify other users in exchange
    socket.to(`exchange_${exchangeId}`).emit('userTyping', {
      userId,
      isTyping: false
    });
  });

  // Mark messages as read
  socket.on('markAsRead', async (data) => {
    try {
      const { exchangeId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      const result = await prisma.message.updateMany({
        where: {
          exchangeId: parseInt(exchangeId),
          senderId: { not: userId },
          isRead: false
        },
        data: { isRead: true }
      });

      // Notify other users that messages were read
      socket.to(`exchange_${exchangeId}`).emit('messagesRead', {
        readerId: userId,
        count: result.count,
        timestamp: new Date()
      });

      console.log(`User ${userId} marked ${result.count} messages as read in exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('Mark as read error:', error);
      socket.emit('error', { error: 'Failed to mark messages as read' });
    }
  });

  // WebRTC Signaling
  // Handle WebRTC offer
  socket.on('webrtcOffer', async (data) => {
    try {
      const { exchangeId, offer, toUserId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      // Find the target user's socket
      const targetSocket = Array.from(activeUsers.entries())
        .find(([_, user]) => user.userId === toUserId)?.[0];

      if (targetSocket) {
        const targetSocketObj = io.sockets.sockets.get(targetSocket);
        if (targetSocketObj) {
          targetSocketObj.emit('webrtcOffer', {
            offer,
            fromUserId: userId,
            exchangeId,
            timestamp: new Date()
          });
        }
      }

      console.log(`WebRTC offer sent from user ${userId} to user ${toUserId} for exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('WebRTC offer error:', error);
      socket.emit('error', { error: 'Failed to send WebRTC offer' });
    }
  });

  // Handle WebRTC answer
  socket.on('webrtcAnswer', async (data) => {
    try {
      const { exchangeId, answer, toUserId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      // Find the target user's socket
      const targetSocket = Array.from(activeUsers.entries())
        .find(([_, user]) => user.userId === toUserId)?.[0];

      if (targetSocket) {
        const targetSocketObj = io.sockets.sockets.get(targetSocket);
        if (targetSocketObj) {
          targetSocketObj.emit('webrtcAnswer', {
            answer,
            fromUserId: userId,
            exchangeId,
            timestamp: new Date()
          });
        }
      }

      console.log(`WebRTC answer sent from user ${userId} to user ${toUserId} for exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('WebRTC answer error:', error);
      socket.emit('error', { error: 'Failed to send WebRTC answer' });
    }
  });

  // Handle ICE candidates
  socket.on('webrtcIceCandidate', async (data) => {
    try {
      const { exchangeId, candidate, toUserId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      // Find the target user's socket
      const targetSocket = Array.from(activeUsers.entries())
        .find(([_, user]) => user.userId === toUserId)?.[0];

      if (targetSocket) {
        const targetSocketObj = io.sockets.sockets.get(targetSocket);
        if (targetSocketObj) {
          targetSocketObj.emit('webrtcIceCandidate', {
            candidate,
            fromUserId: userId,
            exchangeId,
            timestamp: new Date()
          });
        }
      }

      console.log(`WebRTC ICE candidate sent from user ${userId} to user ${toUserId}`);
      
    } catch (error) {
      console.error('WebRTC ICE candidate error:', error);
      socket.emit('error', { error: 'Failed to send ICE candidate' });
    }
  });

  // Handle call start
  socket.on('callStart', async (data) => {
    try {
      const { exchangeId, callType = 'video' } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      // Notify all users in the exchange that a call has started
      socket.to(`exchange_${exchangeId}`).emit('callStarted', {
        exchangeId,
        initiatedBy: userId,
        callType,
        timestamp: new Date()
      });

      console.log(`Call started by user ${userId} for exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('Call start error:', error);
      socket.emit('error', { error: 'Failed to start call' });
    }
  });

  // Handle call end
  socket.on('callEnd', async (data) => {
    try {
      const { exchangeId, reason = 'user_end' } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      // Notify all users in the exchange that the call has ended
      socket.to(`exchange_${exchangeId}`).emit('callEnded', {
        exchangeId,
        endedBy: userId,
        reason,
        timestamp: new Date()
      });

      // Clean up peer connections
      peerConnections.delete(`${exchangeId}_${userId}`);

      console.log(`Call ended by user ${userId} for exchange ${exchangeId}`);
      
    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('error', { error: 'Failed to end call' });
    }
  });

  // Get online status of users in exchange
  socket.on('getOnlineStatus', (exchangeId) => {
    const onlineUsers = [];
    const exchangeKey = `exchange_${exchangeId}`;
    
    // Get all sockets in this exchange room
    const socketsInRoom = io.sockets.adapter.rooms.get(exchangeKey);
    
    if (socketsInRoom) {
      socketsInRoom.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
          onlineUsers.push(socket.userId);
        }
      });
    }

    socket.emit('onlineUsers', { exchangeId, onlineUsers });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      activeUsers.delete(socket.id);
      
      // Remove from typing users if present
      typingUsers.forEach((users, key) => {
        users.delete(socket.userId);
      });
      
      // Notify all exchanges the user was part of
      if (socket.currentExchange) {
        socket.to(`exchange_${socket.currentExchange}`).emit('userLeft', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

module.exports = { handleSocketConnection };