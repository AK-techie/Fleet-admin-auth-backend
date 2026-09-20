const express = require('express');
const router = express.Router();
const { adminLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    Admin Login
// @access  Public
router.post('/login', adminLogin);

// @route   GET /api/auth/me
// @desc    Get current logged-in admin
// @access  Private
router.get('/me', protect, getMe);

module.exports = router;
