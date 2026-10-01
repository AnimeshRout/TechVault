/**
 * Auth Routes
 * POST /api/auth/register           — Create new user account
 * POST /api/auth/login              — Login & get tokens
 * POST /api/auth/logout             — Clear token cookies
 * POST /api/auth/refresh            — Rotate refresh token
 * GET  /api/auth/me                 — Get current user profile
 * POST /api/auth/forgot-password    — Send password reset email
 * POST /api/auth/reset-password/:t  — Reset password with token
 * GET  /api/auth/verify-email/:t    — Verify email address
 * GET  /api/auth/google             — Google OAuth2 login
 * GET  /api/auth/google/callback    — Google OAuth2 callback
 */
import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  deleteAccount,
} from '../controllers/authController.js';
import {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/passwordController.js';
import { googleCallback } from '../controllers/googleAuthController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router = express.Router();

// Public routes (rate-limited)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshAccessToken);

// Password reset (strict rate limit — prevents email bombing)
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

// Email verification
router.get('/verify-email/:token', verifyEmail);

// ─── Google OAuth2 ───────────────────────────────────────────────────────────
// Initiate Google login (accepts ?from=admin for admin dashboard login)
router.get('/google', (req, res, next) => {
  const state = JSON.stringify({ from: req.query.from || 'user' });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
});

// Google callback — Passport handles auth, then we issue JWTs
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=google_auth_failed',
    session: false,
  }),
  googleCallback
);

// Protected routes
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteAccount);
router.post('/resend-verification', protect, resendVerificationEmail);

export default router;

