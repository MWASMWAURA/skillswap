const express = require('express');
const {
  getExchangeMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  addMessageReaction,
  removeMessageReaction,
  editMessage,
  deleteMessage,
  getUserConversations
} = require('../controllers/messageController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Protected routes
router.get('/exchanges/:exchangeId', authenticateToken, getExchangeMessages);
router.post('/exchanges/:exchangeId', authenticateToken, sendMessage);
router.patch('/exchanges/:exchangeId/read', authenticateToken, markMessagesAsRead);
router.get('/unread-count', authenticateToken, getUnreadMessageCount);
router.get('/conversations', authenticateToken, getUserConversations);

// Message-specific operations
router.patch('/:messageId', authenticateToken, editMessage);
router.delete('/:messageId', authenticateToken, deleteMessage);

// Message reactions
router.post('/:messageId/reactions', authenticateToken, addMessageReaction);
router.delete('/:messageId/reactions', authenticateToken, removeMessageReaction);

module.exports = router;