// ============================================
// Authentication Routes - Educational Example
// ============================================
// SYLLABUS: CO4 - REST API, JWT, Security
//
// These routes demonstrate:
// - User registration and login
// - JWT token authentication
// - Input validation with Joi
// - Password hashing with bcrypt
// ============================================

const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const auth = require('../middleware/auth');
const config = require('../config/constants');

const router = express.Router();

// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================
// Joi validates request body against a schema
// Returns 400 if validation fails
const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// ============================================
// VALIDATION SCHEMAS (Joi)
// ============================================
// Defines rules for input data
const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ============================================
// POST /api/auth/signup - Create new user
// ============================================
router.post('/signup', validateBody(signupSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user (password is hashed in User model)
    const user = new User({ name, email: email.toLowerCase(), password });
    await user.save();
    
    // Generate JWT token for authentication
    const token = jwt.sign(
      { userId: user._id },           // Payload: user ID
      config.JWT_SECRET,              // Secret key
      { expiresIn: config.JWT_EXPIRE } // Expiration time
    );

    // Return user data and token
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// POST /api/auth/login - Authenticate user
// ============================================
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password (uses bcrypt.compare)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRE }
    );

    // Return user data and token
    res.json({ user: { id: user._id, name: user.name, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// GET /api/auth/me - Get current user
// ============================================
// Protected route - requires valid JWT token
router.get('/me', auth, async (req, res) => {
  try {
    // req.userId is set by auth middleware
    const user = await User.findById(req.userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
