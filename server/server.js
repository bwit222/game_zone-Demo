const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust first proxy if running behind reverse proxy
if (isProduction) {
  app.set('trust proxy', 1);
}

// Allowed CORS origins for local development (Live Server, Vite, file, localhost)
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid CORS friction
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session Setup
app.use(
  session({
    name: 'roxy_gamezone_sid',
    secret: process.env.SESSION_SECRET || 'roxy_arcade_ultra_secure_session_key_2026',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session with each request
    cookie: {
      httpOnly: true, // Mitigate XSS attacks
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000 // 1 day default
    }
  })
);

// Serve Frontend Static Files (Game Zone root directory)
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// API Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Roxy Game Zone Backend',
    timestamp: new Date().toISOString()
  });
});

// Fallback route: serve index.html for unknown routes if requested by browser
app.get('*', (req, res, next) => {
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(staticPath, 'index.html'));
  }
  next();
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🎮 Roxy Game Zone Server Running`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);

  // Initialize MySQL database connection & tables
  await initDatabase();
});
