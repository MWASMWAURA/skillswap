const express = require('express');
const {
  submitVerification,
  getVerificationStatus,
  getVerificationHistory,
  getUserVerificationStats,
  processVerification,
  getVerificationQueue,
  verifyPortfolio,
  scheduleDemonstration,
  conductAssessment,
  checkRenewal,
  autoExpireVerifications
} = require('../controllers/skillVerificationController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Public routes
router.get('/status/:skillId', getVerificationStatus);
router.get('/renewal/:skillId', checkRenewal);

// Protected routes
router.post('/submit/:skillId', authenticateToken, submitVerification);
router.get('/history/:skillId', authenticateToken, getVerificationHistory);
router.get('/stats', authenticateToken, getUserVerificationStats);
router.post('/portfolio/:skillId', authenticateToken, verifyPortfolio);
router.post('/demonstration/:skillId', authenticateToken, scheduleDemonstration);
router.post('/assessment/:skillId', authenticateToken, conductAssessment);

// Admin routes
router.get('/admin/queue', authenticateToken, getVerificationQueue);
router.patch('/admin/process/:verificationId', authenticateToken, processVerification);
router.post('/admin/auto-expire', authenticateToken, autoExpireVerifications);

module.exports = router;