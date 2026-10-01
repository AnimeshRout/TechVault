/**
 * ============================================================================
 * PASSWORD CONTROLLER — Forgot/Reset Password Flow
 * ============================================================================
 * POST /api/auth/forgot-password — Send reset link
 * POST /api/auth/reset-password/:token — Reset with token
 * POST /api/auth/verify-email/:token — Verify email
 * ============================================================================
 */
import crypto from 'crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { clearTokenCookies } from '../utils/generateToken.js';
import {
  sendEmail,
  passwordResetEmail,
  emailVerificationEmail,
} from '../services/emailService.js';

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address.', 400));
  }

  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Build reset URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // Send email
  await sendEmail({
    to: user.email,
    subject: 'TechVault — Reset Your Password (expires in 15 min)',
    html: passwordResetEmail(user, resetUrl),
  });

  res.status(200).json({
    status: 'success',
    message: 'If an account with that email exists, a reset link has been sent.',
  });
});

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
export const resetPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password || password.length < 8) {
    return next(new AppError('Password must be at least 8 characters.', 400));
  }

  // Hash the token from URL to match against DB
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return next(new AppError('Reset token is invalid or has expired.', 400));
  }

  // Update password (triggers pre-save bcrypt hook)
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate ALL refresh tokens (security measure)
  user.refreshToken = '';
  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  // Clear cookies
  clearTokenCookies(res);

  res.status(200).json({
    status: 'success',
    message: 'Password has been reset. Please log in with your new password.',
  });
});

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────
export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return next(new AppError('Verification token is invalid or has expired.', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully!',
  });
});

// ─── RESEND VERIFICATION EMAIL ───────────────────────────────────────────────
export const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      status: 'success',
      message: 'Email is already verified.',
    });
  }

  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;

  await sendEmail({
    to: user.email,
    subject: 'TechVault — Verify Your Email Address',
    html: emailVerificationEmail(user, verifyUrl),
  });

  res.status(200).json({
    status: 'success',
    message: 'Verification email sent.',
  });
});
