/**
 * JWT Authentication Middleware
 * Extracts access token from httpOnly cookie, verifies it,
 * and attaches the user document to req.user.
 *
 * Does NOT handle token refresh here — that's a separate endpoint.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Protect routes — Require valid access token
 */
export const protect = catchAsync(async (req, res, next) => {
  // 1. Extract token from httpOnly cookie
  let token = req.cookies?.accessToken;

  // Fallback: Check Authorization header (for API testing tools like Postman)
  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please refresh your token.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id).select('-password');
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Attach user to request
  req.user = currentUser;
  next();
});

/**
 * Optional auth — Attaches user if token exists, but doesn't block
 * Useful for pages that show different content for logged-in vs guest users
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    } catch {
      // Token invalid/expired — continue as guest
    }
  }

  next();
});
