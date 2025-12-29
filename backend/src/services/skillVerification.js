const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Skill Verification Service
 * Handles the verification process for user skills with multiple verification methods
 */
class SkillVerificationService {
  constructor() {
    this.prisma = new PrismaClient();
    this.verificationTypes = {
      PORTFOLIO: 'portfolio',
      CERTIFICATION: 'certification',
      INTERVIEW: 'interview',
      PEER_REVIEW: 'peer_review',
      DEMONSTRATION: 'demonstration',
      PORTFOLIO_REVIEW: 'portfolio_review',
      ASSESSMENT: 'assessment'
    };

    this.verificationStatus = {
      PENDING: 'pending',
      IN_REVIEW: 'in_review',
      VERIFIED: 'verified',
      REJECTED: 'rejected',
      EXPIRED: 'expired'
    };

    this.maxAttemptsPerSkill = 3;
    this.verificationExpiryDays = 365; // 1 year
  }

  /**
   * Submit a skill for verification
   * @param {number} skillId - Skill ID
   * @param {number} userId - User ID
   * @param {object} verificationData - Verification submission data
   * @returns {object} Verification submission result
   */
  async submitSkillForVerification(skillId, userId, verificationData) {
    try {
      // Validate skill ownership
      const skill = await this.prisma.skill.findFirst({
        where: { id: skillId, userId }
      });

      if (!skill) {
        throw new Error('Skill not found or not owned by user');
      }

      // Check if skill is already verified
      if (skill.isVerified) {
        throw new Error('Skill is already verified');
      }

      // Check recent verification attempts
      const recentAttempts = await this.prisma.skillVerification.findMany({
        where: {
          skillId,
          status: { in: ['pending', 'in_review'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      });

      if (recentAttempts.length >= this.maxAttemptsPerSkill) {
        throw new Error(`Maximum verification attempts (${this.maxAttemptsPerSkill}) reached. Please wait before submitting again.`);
      }

      // Create verification record
      const verification = await this.prisma.skillVerification.create({
        data: {
          skillId,
          verificationType: verificationData.type,
          submittedAt: new Date(),
          evidence: verificationData.evidence || {},
          notes: verificationData.notes || '',
          expiresAt: this.calculateExpiryDate()
        }
      });

      // Update skill status
      await this.prisma.skill.update({
        where: { id: skillId },
        data: {
          verificationStatus: 'pending'
        }
      });

      // Create notification for admins
      await this.createAdminNotification(skill, verification);

      console.log(`Skill verification submitted: ${skillId} by user ${userId}`);
      
      return {
        verificationId: verification.id,
        status: 'pending',
        message: 'Verification submitted successfully. You will be notified once the review is complete.',
        estimatedReviewTime: this.getEstimatedReviewTime(verificationData.type)
      };

    } catch (error) {
      console.error('Skill verification submission error:', error);
      throw error;
    }
  }

  /**
   * Process verification by admin
   * @param {number} verificationId - Verification ID
   * @param {number} adminId - Admin ID
   * @param {object} reviewData - Review data
   * @returns {object} Review result
   */
  async processVerification(verificationId, adminId, reviewData) {
    try {
      const verification = await this.prisma.skillVerification.findUnique({
        where: { id: verificationId },
        include: {
          skill: {
            include: {
              user: true
            }
          }
        }
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      if (verification.status !== 'pending') {
        throw new Error('Verification has already been processed');
      }

      // Update verification status
      const updatedVerification = await this.prisma.skillVerification.update({
        where: { id: verificationId },
        data: {
          status: reviewData.approved ? 'verified' : 'rejected',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          reviewerNotes: reviewData.notes || '',
          score: reviewData.score || null,
          evidenceVerified: reviewData.evidenceVerified || {}
        }
      });

      // Update skill verification status
      await this.prisma.skill.update({
        where: { id: verification.skillId },
        data: {
          isVerified: reviewData.approved,
          verificationStatus: reviewData.approved ? 'verified' : 'rejected'
        }
      });

      // Create notification for user
      await this.createUserNotification(
        verification.skill.userId,
        verification.skill,
        updatedVerification
      );

      // Award badge if verified
      if (reviewData.approved) {
        await this.awardVerificationBadge(verification.skill.userId, verification.skill);
      }

      console.log(`Verification ${reviewData.approved ? 'approved' : 'rejected'}: ${verificationId}`);

      return {
        verificationId,
        status: updatedVerification.status,
        approved: reviewData.approved,
        message: reviewData.approved 
          ? 'Skill verification approved successfully'
          : 'Skill verification rejected'
      };

    } catch (error) {
      console.error('Verification processing error:', error);
      throw error;
    }
  }

  /**
   * Get verification queue for admin
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} status - Filter by status
   * @returns {object} Verification queue
   */
  async getVerificationQueue(page = 1, limit = 20, status = 'pending') {
    try {
      const skip = (page - 1) * limit;

      const [verifications, total] = await Promise.all([
        this.prisma.skillVerification.findMany({
          where: { status },
          include: {
            skill: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profilePhoto: true,
                    reputation: true
                  }
                }
              }
            }
          },
          orderBy: { submittedAt: 'asc' },
          skip,
          take: limit
        }),
        this.prisma.skillVerification.count({ where: { status } })
      ]);

      return {
        verifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get verification queue:', error);
      throw error;
    }
  }

  /**
   * Verify skill through portfolio review
   * @param {number} skillId - Skill ID
   * @param {object} portfolioData - Portfolio evidence
   * @returns {object} Verification result
   */
  async verifyPortfolio(skillId, portfolioData) {
    try {
      const { portfolioUrl, description, screenshots, testimonials } = portfolioData;

      // Validate portfolio data
      if (!portfolioUrl || !description) {
        throw new Error('Portfolio URL and description are required');
      }

      // AI-powered portfolio analysis (placeholder)
      const portfolioScore = await this.analyzePortfolio(portfolioUrl, description);

      const verification = await this.prisma.skillVerification.create({
        data: {
          skillId,
          verificationType: 'portfolio',
          evidence: {
            portfolioUrl,
            description,
            screenshots: screenshots || [],
            testimonials: testimonials || [],
            aiScore: portfolioScore
          },
          score: portfolioScore,
          status: 'in_review',
          submittedAt: new Date(),
          expiresAt: this.calculateExpiryDate()
        }
      });

      return {
        verificationId: verification.id,
        score: portfolioScore,
        message: 'Portfolio review initiated. AI analysis completed.'
      };

    } catch (error) {
      console.error('Portfolio verification error:', error);
      throw error;
    }
  }

  /**
   * Schedule skill demonstration
   * @param {number} skillId - Skill ID
   * @param {object} demonstrationData - Demonstration details
   * @returns {object} Scheduled demonstration
   */
  async scheduleDemonstration(skillId, demonstrationData) {
    try {
      const { preferredDateTime, timezone, type, requirements } = demonstrationData;

      // Create demonstration record
      const demonstration = await this.prisma.skillDemonstration.create({
        data: {
          skillId,
          type,
          scheduledFor: new Date(preferredDateTime),
          timezone,
          requirements: requirements || {},
          status: 'scheduled'
        }
      });

      // Update verification record
      await this.prisma.skillVerification.create({
        data: {
          skillId,
          verificationType: 'demonstration',
          evidence: {
            demonstrationId: demonstration.id,
            scheduledFor: demonstration.scheduledFor,
            type
          },
          status: 'pending',
          submittedAt: new Date(),
          expiresAt: this.calculateExpiryDate()
        }
      });

      return {
        demonstrationId: demonstration.id,
        scheduledFor: demonstration.scheduledFor,
        status: 'scheduled',
        message: 'Demonstration scheduled successfully'
      };

    } catch (error) {
      console.error('Demonstration scheduling error:', error);
      throw error;
    }
  }

  /**
   * Conduct AI-powered assessment
   * @param {number} skillId - Skill ID
   * @param {object} assessmentData - Assessment configuration
   * @returns {object} Assessment result
   */
  async conductAssessment(skillId, assessmentData) {
    try {
      const { questions, timeLimit, difficulty } = assessmentData;

      // Generate assessment questions based on skill
      const questionsSet = await this.generateAssessmentQuestions(skillId, questions, difficulty);

      const assessment = await this.prisma.skillAssessment.create({
        data: {
          skillId,
          questions: questionsSet,
          timeLimit,
          difficulty,
          status: 'pending',
          createdAt: new Date()
        }
      });

      return {
        assessmentId: assessment.id,
        questions: questionsSet,
        timeLimit,
        message: 'Assessment generated successfully'
      };

    } catch (error) {
      console.error('Assessment creation error:', error);
      throw error;
    }
  }

  /**
   * Get user's verification statistics
   * @param {number} userId - User ID
   * @returns {object} Verification statistics
   */
  async getUserVerificationStats(userId) {
    try {
      const stats = await this.prisma.skillVerification.groupBy({
        by: ['status'],
        where: {
          skill: { userId }
        },
        _count: {
          id: true
        }
      });

      const totalSkills = await this.prisma.skill.count({
        where: { userId }
      });

      const verifiedSkills = await this.prisma.skill.count({
        where: { userId, isVerified: true }
      });

      const verificationRate = totalSkills > 0 ? (verifiedSkills / totalSkills) * 100 : 0;

      return {
        totalSkills,
        verifiedSkills,
        verificationRate: Math.round(verificationRate * 100) / 100,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {})
      };

    } catch (error) {
      console.error('Failed to get verification stats:', error);
      return {
        totalSkills: 0,
        verifiedSkills: 0,
        verificationRate: 0,
        statusBreakdown: {}
      };
    }
  }

  /**
   * Get verification history for skill
   * @param {number} skillId - Skill ID
   * @returns {Array} Verification history
   */
  async getVerificationHistory(skillId) {
    try {
      return await this.prisma.skillVerification.findMany({
        where: { skillId },
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to get verification history:', error);
      return [];
    }
  }

  /**
   * Analyze portfolio using AI (placeholder implementation)
   * @param {string} portfolioUrl - Portfolio URL
   * @param {string} description - Portfolio description
   * @returns {number} Portfolio score (0-100)
   */
  async analyzePortfolio(portfolioUrl, description) {
    try {
      // This would integrate with AI services for portfolio analysis
      // For now, we'll implement a basic scoring algorithm

      let score = 0;

      // Basic scoring based on description quality
      if (description.length > 100) score += 20;
      if (description.length > 300) score += 10;
      
      // Check for key technical terms
      const technicalKeywords = ['project', 'development', 'design', 'implementation', 'code', 'framework'];
      const keywordMatches = technicalKeywords.filter(keyword => 
        description.toLowerCase().includes(keyword)
      ).length;
      score += keywordMatches * 5;

      // URL validation
      if (portfolioUrl.includes('.com') || portfolioUrl.includes('.org')) {
        score += 10;
      }

      // Random factor for demonstration (in real implementation, this would be AI analysis)
      score += Math.random() * 30;

      return Math.min(100, Math.max(0, Math.round(score)));
    } catch (error) {
      console.error('Portfolio analysis error:', error);
      return 0;
    }
  }

  /**
   * Generate assessment questions based on skill
   * @param {number} skillId - Skill ID
   * @param {number} count - Number of questions
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Assessment questions
   */
  async generateAssessmentQuestions(skillId, count = 10, difficulty = 'intermediate') {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId }
      });

      if (!skill) {
        throw new Error('Skill not found');
      }

      // This would integrate with AI services to generate relevant questions
      // For now, we'll return sample questions based on skill category
      
      const sampleQuestions = {
        'Programming': [
          {
            id: 1,
            question: 'Explain the difference between synchronous and asynchronous programming.',
            type: 'short_answer',
            difficulty: 'intermediate',
            points: 10
          },
          {
            id: 2,
            question: 'What is the time complexity of binary search?',
            type: 'multiple_choice',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
            correctAnswer: 1,
            difficulty: 'easy',
            points: 5
          }
        ],
        'Design': [
          {
            id: 1,
            question: 'What are the main principles of good UI design?',
            type: 'short_answer',
            difficulty: 'intermediate',
            points: 10
          }
        ]
      };

      const categoryQuestions = sampleQuestions[skill.category] || sampleQuestions['Programming'];
      return categoryQuestions.slice(0, count);
    } catch (error) {
      console.error('Question generation error:', error);
      return [];
    }
  }

  /**
   * Create admin notification for new verification
   * @param {object} skill - Skill object
   * @param {object} verification - Verification object
   */
  async createAdminNotification(skill, verification) {
    try {
      // This would create a notification in the admin system
      console.log(`New skill verification submitted: ${skill.title} by ${skill.user.name}`);
    } catch (error) {
      console.error('Failed to create admin notification:', error);
    }
  }

  /**
   * Create user notification for verification result
   * @param {number} userId - User ID
   * @param {object} skill - Skill object
   * @param {object} verification - Verification object
   */
  async createUserNotification(userId, skill, verification) {
    try {
      const isApproved = verification.status === 'verified';
      
      await this.prisma.notification.create({
        data: {
          userId,
          title: isApproved ? 'Skill Verified!' : 'Verification Update',
          message: isApproved 
            ? `Your skill "${skill.title}" has been successfully verified!`
            : `Your skill "${skill.title}" verification has been reviewed.`,
          type: isApproved ? 'success' : 'info',
          category: 'verification',
          actionUrl: `/skills/${skill.id}`,
          metadata: {
            skillId: skill.id,
            verificationId: verification.id,
            status: verification.status
          }
        }
      });
    } catch (error) {
      console.error('Failed to create user notification:', error);
    }
  }

  /**
   * Award verification badge to user
   * @param {number} userId - User ID
   * @param {object} skill - Skill object
   */
  async awardVerificationBadge(userId, skill) {
    try {
      const badgeName = `Verified ${skill.category} Skill`;
      
      await this.prisma.badge.create({
        data: {
          userId,
          badgeName,
          description: `Verified skill in ${skill.category}`,
          badgeType: 'verification',
          rarity: skill.category === 'Programming' ? 'epic' : 'rare'
        }
      });
    } catch (error) {
      console.error('Failed to award verification badge:', error);
    }
  }

  /**
   * Calculate verification expiry date
   * @returns {Date} Expiry date
   */
  calculateExpiryDate() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.verificationExpiryDays);
    return expiryDate;
  }

  /**
   * Get estimated review time based on verification type
   * @param {string} verificationType - Type of verification
   * @returns {string} Estimated time
   */
  getEstimatedReviewTime(verificationType) {
    const timeEstimates = {
      'portfolio': '2-3 business days',
      'certification': '1-2 business days',
      'interview': '3-5 business days',
      'peer_review': '5-7 business days',
      'demonstration': '2-4 business days',
      'assessment': '1 business day'
    };

    return timeEstimates[verificationType] || '3-5 business days';
  }

  /**
   * Check if verification needs renewal
   * @param {number} skillId - Skill ID
   * @returns {boolean} Whether renewal is needed
   */
  async needsRenewal(skillId) {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId }
      });

      if (!skill || !skill.isVerified) {
        return false;
      }

      const verification = await this.prisma.skillVerification.findFirst({
        where: {
          skillId,
          status: 'verified'
        },
        orderBy: { reviewedAt: 'desc' }
      });

      if (!verification) {
        return false;
      }

      const daysSinceVerification = Math.floor(
        (Date.now() - new Date(verification.reviewedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceVerification > this.verificationExpiryDays * 0.9; // Renew at 90% of expiry
    } catch (error) {
      console.error('Renewal check error:', error);
      return false;
    }
  }

  /**
   * Auto-expire old verifications
   */
  async autoExpireVerifications() {
    try {
      const expiredVerifications = await this.prisma.skillVerification.updateMany({
        where: {
          status: 'verified',
          expiresAt: {
            lt: new Date()
          }
        },
        data: {
          status: 'expired'
        }
      });

      // Update corresponding skills
      const expiredSkillIds = expiredVerifications.map(v => v.skillId);
      if (expiredSkillIds.length > 0) {
        await this.prisma.skill.updateMany({
          where: {
            id: { in: expiredSkillIds }
          },
          data: {
            isVerified: false,
            verificationStatus: 'expired'
          }
        });
      }

      console.log(`Auto-expired ${expiredVerifications.count} verifications`);
    } catch (error) {
      console.error('Auto-expiration error:', error);
    }
  }
}

module.exports = new SkillVerificationService();