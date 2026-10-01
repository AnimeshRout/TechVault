/**
 * ============================================================================
 * GOOGLE AUTH CONTROLLER
 * ============================================================================
 * Handles the Google OAuth callback — issues our own JWT tokens.
 * Supports both user and admin login flows via a `state` param.
 * 
 * Fixed:
 * - Issues CSRF token (same as regular login path)
 * - Admin role check rejects non-admins cleanly
 * ============================================================================
 */
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} from '../utils/generateToken.js';
import { generateCsrfToken } from '../middleware/csrf.js';

/**
 * Google OAuth callback handler.
 * After Passport authenticates, this issues JWTs and redirects to frontend.
 */
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }

    // Parse the state to determine redirect target (admin or user)
    let redirectBase = process.env.CLIENT_URL || 'http://localhost:5175';
    let redirectPath = '/';

    try {
      const state = JSON.parse(req.query.state || '{}');
      if (state.from === 'admin') {
        // Admin login — verify user is actually admin
        if (user.role !== 'admin') {
          return res.redirect(`${process.env.ADMIN_URL}/login?error=not_admin`);
        }
        redirectBase = process.env.ADMIN_URL || 'http://localhost:5176';
        redirectPath = '/dashboard';
      }
    } catch {
      // Invalid state, use default redirect
    }

    // Generate our own JWT tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token for rotation (single-session model, matches regular login)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set httpOnly cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Issue CSRF token (Gap 1 fix: same as regular login path)
    generateCsrfToken(res);

    // Redirect to frontend
    res.redirect(`${redirectBase}${redirectPath}?google_auth=success`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};
