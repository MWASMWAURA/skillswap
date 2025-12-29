const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an access token
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type. Access token required.' });
    }
    
    // Check if token has required fields
    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid token structure.' });
    }
    
    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    return res.status(500).json({ error: 'Token verification failed.' });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'access' && decoded.id) {
      req.user = decoded;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

// Admin role check middleware
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  
  // Check user role from database
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Specific role check middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });
      
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ 
          error: `Access denied. Required roles: ${roles.join(', ')}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Rate limiting middleware for auth endpoints
const authRateLimit = (req, res, next) => {
  // This would integrate with your rate limiting middleware
  // For now, it's just a placeholder
  next();
};

// Resource ownership check middleware
const requireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    try {
      const resourceId = req.params[resourceIdParam];
      
      // Get the current user
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });
      
      // Admin can access any resource
      if (user.role === 'admin') {
        return next();
      }
      
      // Check if user owns the resource
      if (req.user.id.toString() !== resourceId) {
        return res.status(403).json({ 
          error: 'Access denied. You can only access your own resources.' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = { 
  authenticateToken, 
  optionalAuth, 
  requireAdmin,
  requireRole,
  requireOwnership,
  authRateLimit 
};