/**
 * ============================================================================
 * CSRF PROTECTION — Double-submit cookie pattern
 * ============================================================================
 * Since we use httpOnly cookies for auth, we're exposed to CSRF.
 * This middleware:
 * 1. Sets SameSite=Lax on all auth cookies
 * 2. Generates a CSRF token on login/register
 * 3. Validates X-CSRF-Token header on state-changing requests
 * ============================================================================
 */
import crypto from 'crypto';

/**
 * Generate a CSRF token and set it as a non-httpOnly cookie
 * so the frontend JS can read it and send in headers.
 */
export function generateCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');

  res.cookie('csrf-token', token, {
    httpOnly: false,      // Frontend needs to READ this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}

/**
 * Middleware: Validate CSRF token on state-changing requests
 * Skips GET, HEAD, OPTIONS (safe methods) and webhook routes.
 */
export function csrfProtection(req, res, next) {
  // Skip safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip webhook routes (they use their own signature verification)
  if (req.path.startsWith('/api/webhooks')) return next();

  // Skip auth routes that generate CSRF tokens (login, register, refresh)
  const csrfExemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
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
