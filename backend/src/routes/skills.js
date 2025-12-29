const express = require('express');
const {
  getSkills,
  getSkillById,
  getSkillWithVerification,
  createSkill,
  updateSkill,
  deleteSkill,
  getCategories,
  getUserSkills,
  getPopularSkills
} = require('../controllers/skillController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Public routes
router.get('/', getSkills);
router.get('/categories', getCategories);
router.get('/popular', getPopularSkills);
router.get('/:id', getSkillById);
router.get('/user/:userId', getUserSkills);
router.get('/with-verification/:id', getSkillWithVerification);

// Protected routes
router.post('/', authenticateToken, createSkill);
router.put('/:id', authenticateToken, updateSkill);
router.delete('/:id', authenticateToken, deleteSkill);

module.exports = router;