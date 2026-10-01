/**
 * JWT Token Generator & Cookie Setter
 * Issues access + refresh tokens and sets them as httpOnly secure cookies.
 * Implements refresh token rotation pattern for security.
 */
import jwt from 'jsonwebtoken';

/**
 * Generate an access token (short-lived)
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
};

/**
 * Generate a refresh token (long-lived)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
};

/**
 * Parse expiry string (e.g., '15m', '7d') to milliseconds for cookie maxAge
 */
const parseExpiry = (expiryStr) => {
  const match = expiryStr.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // default 15 min

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

/**
 * Set both access and refresh token cookies on the response
 */
export const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token cookie — short-lived
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseExpiry(process.env.JWT_ACCESS_EXPIRES || '15m'),
    path: '/',
  });

  // Refresh token cookie — long-lived
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseExpiry(process.env.JWT_REFRESH_EXPIRES || '7d'),
    path: '/',
  });
};

/**
 * Clear both token cookies on logout
 */
export const clearTokenCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Must match the same attributes (secure, sameSite, path) that were used
  // when setting the cookie, otherwise the browser won't clear them.
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
  res.cookie('csrf-token', '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
};
