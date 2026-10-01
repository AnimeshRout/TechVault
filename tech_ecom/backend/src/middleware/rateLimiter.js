/**
 * Rate Limiter Configurations
 * Different rate limits for different route sensitivity levels.
 * Prevents brute-force attacks, DDoS, and abuse.
 */
import rateLimit from 'express-rate-limit';

/**
 * Auth endpoints — strict limits to prevent brute-force login/register attempts
 * 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

/**
 * General API — moderate limits for regular endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Checkout — tight limits to prevent payment spam
 * 5 requests per minute per IP
 */
export const checkoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    status: 'fail',
    message: 'Too many checkout attempts. Please wait a minute before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Review submission — prevent review spam
 * 3 reviews per hour per IP
 */
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    status: 'fail',
    message: 'Too many reviews submitted. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search — prevent search abuse
 * 30 requests per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    status: 'fail',
    message: 'Too many search requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset — strict to prevent email bombing / enumeration
 * 3 requests per 15 minutes per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    status: 'fail',
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

