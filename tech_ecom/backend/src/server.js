/**
 * ============================================================================
 * TechVault — Express.js Server Entry Point (v2.0)
 * Full security middleware stack, route mounting, cron jobs, and graceful shutdown.
 * ============================================================================
 */
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import passport from 'passport';

import connectDB from './config/db.js';
import configureCloudinary from './config/cloudinary.js';
import validateEnv from './config/validateEnv.js';
import { gracefulShutdown } from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './middleware/csrf.js';
import { auditAuthDenied } from './middleware/auditLogger.js';
import AppError from './utils/AppError.js';
import { initCronJobs } from './services/cronJobs.js';
import configurePassport from './config/passport.js';

// Route imports
import webhookRoutes from './routes/webhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import returnRoutes from './routes/returnRoutes.js';

// ─── ENV CONFIG ──────────────────────────────────────────────────────────────
dotenv.config();
validateEnv();
configurePassport();

// ─── EXPRESS APP ─────────────────────────────────────────────────────────────
const app = express();

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK ROUTES — MUST be BEFORE express.json() for raw body access
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api/webhooks', webhookRoutes);

// ─── SECURITY MIDDLEWARE STACK ───────────────────────────────────────────────

// 1. Secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Cloudinary images
}));

// 2. CORS — allow both customer frontend and admin dashboard
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5175',
  process.env.ADMIN_URL || 'http://localhost:5176',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl) or from allowed list
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// 3. Cookie parser — read httpOnly cookies
app.use(cookieParser());

// 3.5 Passport.js — Google OAuth2 (sessionless — we use JWTs)
app.use(passport.initialize());

// 4. Body parsers — JSON and URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Compression — gzip API responses
app.use(compression());

// 6. NoSQL injection sanitization — Express 5 compatible
const sanitizeValue = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeValue(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  next();
});

// 7. CSRF Protection (double-submit cookie)
app.use(csrfProtection);

// 8. Audit logger for failed auth attempts
app.use(auditAuthDenied);

// 9. Rate limiting — general API limiter
app.use('/api', apiLimiter);

// 10. HTTP request logging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🟢 TechVault API is running (v2.0)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API ROUTES ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/returns', returnRoutes);

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.all('{*path}', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server.`, 404));
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── START SERVER ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  // Configure Cloudinary
  configureCloudinary();

  // Initialize cron jobs
  initCronJobs();

  const server = app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       🚀 TechVault API Server v2.0              ║');
    console.log(`║       📡 Port: ${PORT}                              ║`);
    console.log(`║       🌍 Env: ${(process.env.NODE_ENV || 'development').padEnd(14)}         ║`);
    console.log('║       🔒 CSRF: active                           ║');
    console.log('║       ⏰ Cron: jobs initialized                  ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION:', err.message);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err.message);
    server.close(() => process.exit(1));
  });

  // Graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();

export default app;
