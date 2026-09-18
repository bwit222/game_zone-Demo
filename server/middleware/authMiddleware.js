const rateLimit = require('express-rate-limit');

/**
 * Authentication check middleware.
 * Verifies that the user has an active, valid session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in.'
  });
}

/**
 * Rate limiter for Sign In endpoint to prevent brute-force attacks.
 * Allows 10 attempts per 15 minutes per IP.
 */
const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sign-in attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for Sign Up endpoint to prevent bot account spamming.
 * Allows 10 accounts per hour per IP.
 */
const signUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many account creation attempts. Please try again after an hour.'
  }
});

module.exports = {
  requireAuth,
  signInLimiter,
  signUpLimiter
};
