const express = require('express');
const {
  createExchange,
  getUserExchanges,
  getExchangeById,
  updateExchangeStatus,
  cancelExchange,
  getExchangeStats
} = require('../controllers/exchangeController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Protected routes
router.post('/', authenticateToken, createExchange);
router.get('/', authenticateToken, getUserExchanges);
router.get('/stats', authenticateToken, getExchangeStats);
router.get('/:id', authenticateToken, getExchangeById);
router.patch('/:id/status', authenticateToken, updateExchangeStatus);
router.delete('/:id', authenticateToken, cancelExchange);

module.exports = router;