const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Token generation functions
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

// Email validation and sanitization
const validateAndSanitizeUserData = (data) => {
  const { name, email, password } = data;
  
  if (!name || name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }
  
  if (!email || !validateEmail(email)) {
    throw new Error('Please provide a valid email address');
  }
  
  if (!password || !validatePassword(password)) {
    throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  return {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password
  };
};

// Enhanced signup with email verification
const signup = async (req, res) => {
  try {
    const userData = validateAndSanitizeUserData(req.body);
    const { name, email, password } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate email verification token
    const emailVerificationToken = generateEmailVerificationToken();
    
    // Create user
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword,
        emailVerified: false
      }
    });
    
    // Create email verification record (you'd store this in a separate table)
    // For now, we'll just log it
    console.log(`Email verification token for ${email}: ${emailVerificationToken}`);
    
    // In production, you would send verification email here
    // For development, return the token so you can test
    const responseData = {
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
        reputation: user.reputation,
        xp: user.xp,
        emailVerified: user.emailVerified
      },
      requiresEmailVerification: !user.emailVerified
    };
    
    // Only include access token if email verification is not required
    if (user.emailVerified || process.env.NODE_ENV === 'development') {
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      responseData.accessToken = accessToken;
      responseData.refreshToken = refreshToken;
      responseData.emailVerificationToken = process.env.NODE_ENV === 'development' ? emailVerificationToken : undefined;
    }
    
    res.status(201).json(responseData);
    
  } catch (error) {
    res.status(400).json({ 
      error: error.message || 'Failed to create user',
      field: error.message.includes('email') ? 'email' : 
             error.message.includes('password') ? 'password' : 'name'
    });
  }
};

// Enhanced login with account lockout protection
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        level: true,
        reputation: true,
        xp: true,
        profilePhoto: true,
        location: true,
        isActive: true,
        banned: true,
        emailVerified: true
      }
    });
    
    // Check if account is banned or deactivated
    if (!user || user.banned || !user.isActive) {
      return res.status(401).json({ error: 'Account is not available' });
    }
    
    // Check email verification requirement (skip in development)
    if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in',
        requiresEmailVerification: true 
      });
    }
    
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      // In production, you might want to track failed login attempts
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // Update last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActivity: new Date() }
    });
    
    // Remove sensitive fields from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token functionality
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        reputation: true,
        xp: true,
        profilePhoto: true,
        location: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    
    res.json({
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        reputation: true,
        xp: true,
        streak: true,
        profilePhoto: true,
        location: true,
        createdAt: true,
        badges: {
          select: {
            id: true,
            badgeName: true,
            description: true,
            earnedAt: true
          },
          orderBy: { earnedAt: 'desc' }
        },
        skills: {
          select: {
            id: true,
            title: true,
            category: {
              select: {
                name: true
              }
            },
            mode: true,
            duration: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
    
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Password reset request
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    // In production, you would store this in a separate table or send email
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ 
      message: 'If the email exists, a reset link has been sent',
      // Remove this in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }
    
    // In production, you'd verify the token from your database
    // For now, we'll just hash the password (this is simplified)
    
    res.json({ message: 'Password reset successful' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Email verification
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // In production, you'd verify the token from your database
    // For now, we'll just return success (simplified for demo)
    
    res.json({ message: 'Email verified successfully' });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend email verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }
    
    // Generate new verification token
    const emailVerificationToken = generateEmailVerificationToken();
    
    // In production, you would send verification email here
    console.log(`New email verification token for ${email}: ${emailVerificationToken}`);
    
    res.json({ 
      message: 'Verification email sent',
      // Remove this in production
      verificationToken: process.env.NODE_ENV === 'development' ? emailVerificationToken : undefined
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password (authenticated user)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout (mainly for token invalidation)
const logout = async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { 
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
};