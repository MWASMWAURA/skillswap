const express = require('express');
const { 
  signup, 
  login, 
  refreshToken, 
  getMe, 
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  logout 
} = require('../controllers/authController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

module.exports = router;