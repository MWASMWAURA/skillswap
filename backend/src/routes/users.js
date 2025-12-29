const express = require('express');
const {
  getUserProfile,
  updateProfile,
  changePassword,
  searchUsers,
  getUserStats,
  deleteAccount
} = require('../controllers/userController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Public routes (no authentication required)
router.get('/search', searchUsers);
router.get('/:userId', getUserProfile);

// Protected routes (authentication required)
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.get('/me/stats', authenticateToken, getUserStats);
router.delete('/account', authenticateToken, deleteAccount);

module.exports = router;