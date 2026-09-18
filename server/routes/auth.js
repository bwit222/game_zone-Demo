const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { signInLimiter, signUpLimiter } = require('../middleware/authMiddleware');

// Sign Up
router.post('/signup', signUpLimiter, authController.signup);

// Sign In
router.post('/signin', signInLimiter, authController.signin);

// Logout
router.post('/logout', authController.logout);

// Current Authenticated User Check
router.get('/me', authController.getMe);

module.exports = router;
