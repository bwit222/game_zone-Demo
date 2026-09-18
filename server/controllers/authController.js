const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// Helper to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper to validate username format (3-30 characters, alphanumeric and underscores)
function isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

// Helper to validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
function isValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

/**
 * Handles user sign-up / registration.
 */
async function signup(req, res) {
  try {
    let { full_name, username, email, password, confirm_password } = req.body;

    // 1. Trim inputs
    full_name = typeof full_name === 'string' ? full_name.trim() : '';
    username = typeof username === 'string' ? username.trim() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // 2. Validate Full Name
    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot be empty.'
      });
    }
    if (full_name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be 100 characters or fewer.'
      });
    }

    // 3. Validate Username
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username cannot be empty.'
      });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.'
      });
    }

    // 4. Validate Email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address cannot be empty.'
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // 5. Validate Password and Confirm Password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot be empty.'
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
      });
    }
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // 6. Check if username or email already exists using parameterized queries
    const [existingUsers] = await pool.execute(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'Username is already in use.'
        });
      }
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already registered.'
        });
      }
    }

    // 7. Hash password securely with bcrypt (12 salt rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 8. Insert new user into MySQL
    const [insertResult] = await pool.execute(
      'INSERT INTO users (full_name, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [full_name, username, email, passwordHash]
    );

    const newUserId = insertResult.insertId;

    // 9. Establish session (regenerate session for security)
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Auth] Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          message: 'Account created, but failed to initialize session. Please sign in.'
        });
      }

      req.session.userId = newUserId;

      return res.status(201).json({
        success: true,
        message: 'Account created successfully. Welcome to Game Zone!',
        user: {
          id: newUserId,
          full_name,
          username,
          email
        }
      });
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating your account. Please try again later.'
    });
  }
}

/**
 * Handles user sign-in.
 */
async function signin(req, res) {
  try {
    let { identifier, password, remember_me } = req.body;

    identifier = typeof identifier === 'string' ? identifier.trim() : '';

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your email/username and password.'
      });
    }

    // Look up user by email or username using parameterized query
    const [rows] = await pool.execute(
      'SELECT id, full_name, username, email, password_hash, created_at FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier.toLowerCase(), identifier]
    );

    if (rows.length === 0) {
      // Do not reveal whether user or email exists
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    const user = rows[0];

    // Verify password against stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    // Regenerate session to protect against session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Auth] Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create session. Please try again.'
        });
      }

      req.session.userId = user.id;

      // Handle "Remember Me" option
      if (remember_me) {
        // Extended 30-day session
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // Standard 1-day session
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
      }

      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.username}!`,
        user: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        }
      });
    });
  } catch (error) {
    console.error('[Auth] Signin error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during sign in. Please try again later.'
    });
  }
}

/**
 * Handles user logout.
 */
function logout(req, res) {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: 'You have been logged out successfully.'
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'Could not log out at this moment. Please try again.'
      });
    }

    res.clearCookie('connect.sid', { path: '/' });
    return res.status(200).json({
      success: true,
      message: 'You have been logged out successfully.'
    });
  });
}

/**
 * Fetches the currently authenticated user's session profile.
 */
async function getMe(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        user: null
      });
    }

    const [rows] = await pool.execute(
      'SELECT id, full_name, username, email, created_at FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (rows.length === 0) {
      // User ID in session does not exist in DB (e.g., account was deleted)
      req.session.destroy(() => {});
      return res.status(200).json({
        success: true,
        authenticated: false,
        user: null
      });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[Auth] Me check error:', error.message);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Error verifying authentication status.'
    });
  }
}

module.exports = {
  signup,
  signin,
  logout,
  getMe
};
