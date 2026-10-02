// CSRF PROTECTION — Cross-origin safe, double-submit pattern
import crypto from 'crypto';

/**
 * Generate a CSRF token, set it as a cookie, and return the value
 * so the caller can include it in the response body.
 */
export function generateCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('csrf-token', token, {
    httpOnly: false,           // Frontend needs to READ this (same-origin dev)
    secure: isProduction,      // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-origin in production
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}

/**
 * Middleware: Validate CSRF token on state-changing requests.
 * Compares the cookie value with the X-CSRF-Token header.
 * Skips GET, HEAD, OPTIONS (safe methods) and webhook routes.
 */
export function csrfProtection(req, res, next) {
  // Skip safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip webhook routes (they use their own signature verification)
  if (req.path.startsWith('/api/webhooks')) return next();

  // Skip auth routes that generate CSRF tokens (login, register, refresh, logout)
  const csrfExemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/google',
    '/api/auth/google/callback',
  ];
  if (csrfExemptPaths.includes(req.path)) return next();

  // In development, optionally skip CSRF for easier testing
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_CSRF === 'true') {
    return next();
  }

  // Validate: cookie token must match header token
  const cookieToken = req.cookies?.['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      status: 'fail',
      message: 'Invalid or missing CSRF token.',
    });
  }

  next();
}
