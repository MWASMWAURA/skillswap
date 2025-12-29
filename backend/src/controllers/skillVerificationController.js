const { PrismaClient } = require('@prisma/client');
const skillVerificationService = require('../services/skillVerification');
const { authenticateToken } = require('../utils/auth');

const prisma = new PrismaClient();

// Submit skill for verification
const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;
    const { type, evidence, notes } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Verification type is required' });
    }

    const result = await skillVerificationService.submitSkillForVerification(
      parseInt(skillId),
      userId,
      { type, evidence, notes }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit verification' });
  }
};

// Get verification status for a skill
const getVerificationStatus = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(skillId) },
      include: {
        skillVerifications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const latestVerification = skill.skillVerifications[0];

    res.json({
      skillId: skill.id,
      isVerified: skill.isVerified,
      verificationStatus: skill.verificationStatus,
      latestVerification: latestVerification ? {
        id: latestVerification.id,
        type: latestVerification.verificationType,
        status: latestVerification.status,
        submittedAt: latestVerification.submittedAt,
        reviewedAt: latestVerification.reviewedAt,
        reviewerNotes: latestVerification.reviewerNotes,
        score: latestVerification.score
      } : null
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
};

// Get user's verification history
const getVerificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;

    const history = await skillVerificationService.getVerificationHistory(parseInt(skillId));

    res.json(history);
  } catch (error) {
    console.error('Get verification history error:', error);
    res.status(500).json({ error: 'Failed to get verification history' });
  }
};

// Get user's verification statistics
const getUserVerificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await skillVerificationService.getUserVerificationStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({ error: 'Failed to get verification statistics' });
  }
};

// Process verification (Admin only)
const processVerification = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { verificationId } = req.params;
    const { approved, notes, score, evidenceVerified } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await skillVerificationService.processVerification(
      parseInt(verificationId),
      adminId,
      { approved, notes, score, evidenceVerified }
    );

    res.json(result);
  } catch (error) {
    console.error('Process verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to process verification' });
  }
};

// Get verification queue for admin
const getVerificationQueue = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status = 'pending' } = req.query;

    const queue = await skillVerificationService.getVerificationQueue(
      parseInt(page),
      parseInt(limit),
      status
    );

    res.json(queue);
  } catch (error) {
    console.error('Get verification queue error:', error);
    res.status(500).json({ error: 'Failed to get verification queue' });
  }
};

// Portfolio verification
const verifyPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;
    const { portfolioUrl, description, screenshots, testimonials } = req.body;

    if (!portfolioUrl || !description) {
      return res.status(400).json({ error: 'Portfolio URL and description are required' });
    }

    const result = await skillVerificationService.verifyPortfolio(
      parseInt(skillId),
      { portfolioUrl, description, screenshots, testimonials }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Portfolio verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify portfolio' });
  }
};

// Schedule demonstration
const scheduleDemonstration = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;
    const { preferredDateTime, timezone, type, requirements } = req.body;

    if (!preferredDateTime || !type) {
      return res.status(400).json({ error: 'Preferred date/time and type are required' });
    }

    const result = await skillVerificationService.scheduleDemonstration(
      parseInt(skillId),
      { preferredDateTime, timezone, type, requirements }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Schedule demonstration error:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule demonstration' });
  }
};

// Conduct assessment
const conductAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;
    const { questions, timeLimit, difficulty } = req.body;

    const result = await skillVerificationService.conductAssessment(
      parseInt(skillId),
      { questions, timeLimit, difficulty }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Conduct assessment error:', error);
    res.status(500).json({ error: error.message || 'Failed to conduct assessment' });
  }
};

// Check if verification needs renewal
const checkRenewal = async (req, res) => {
  try {
    const { skillId } = req.params;

    const needsRenewal = await skillVerificationService.needsRenewal(parseInt(skillId));

    res.json({ needsRenewal });
  } catch (error) {
    console.error('Check renewal error:', error);
    res.status(500).json({ error: 'Failed to check renewal status' });
  }
};

// Auto-expire old verifications (Admin only)
const autoExpireVerifications = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await skillVerificationService.autoExpireVerifications();

    res.json({ message: 'Auto-expire process completed' });
  } catch (error) {
    console.error('Auto-expire error:', error);
    res.status(500).json({ error: 'Failed to auto-expire verifications' });
  }
};

module.exports = {
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
};