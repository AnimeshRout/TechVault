// AUTH CONTROLLER
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} from '../utils/generateToken.js';
import { generateCsrfToken } from '../middleware/csrf.js';
import jwt from 'jsonwebtoken';

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // 1. Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // 2. Create user (password is auto-hashed by pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
    role: 'user', // Force role to 'user' — admin must be promoted via DB/admin endpoint
  });

  // 3. Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // 4. Store hashed refresh token in DB (for rotation validation)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // 5. Set httpOnly cookies + CSRF token
  setTokenCookies(res, accessToken, refreshToken);
  const csrfToken = generateCsrfToken(res);

  // 6. Respond (exclude sensitive fields)
  res.status(201).json({
    status: 'success',
    message: 'Account created successfully',
    csrfToken,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
      },
    },
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Find user and explicitly select password + lockout fields
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    return next(new AppError('Invalid email or password.', 401));
  }

  // 2. Check if account is locked
  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return next(
      new AppError(`Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`, 423)
    );
  }

  // 3. Check if account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 403));
  }

  // 4. Compare password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    // Increment failed login attempts
    await user.incrementLoginAttempts();
    return next(new AppError('Invalid email or password.', 401));
  }

  // 5. Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // 6. Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // 7. Store refresh token for rotation
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // 8. Set httpOnly cookies + CSRF token
  setTokenCookies(res, accessToken, refreshToken);
  const csrfToken = generateCsrfToken(res);

  // 9. Respond
  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    csrfToken,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        addresses: user.addresses || [],
      },
    },
  });
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
export const logout = catchAsync(async (req, res, next) => {
  // 1. Get refresh token from cookie to identify user
  const refreshTokenCookie = req.cookies?.refreshToken;

  if (refreshTokenCookie) {
    // Invalidate refresh token in DB
    try {
      const decoded = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: '' });
    } catch {
      // Token invalid/expired — still clear cookies
    }
  }

  // 2. Clear all token cookies
  clearTokenCookies(res);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// ─── REFRESH TOKEN ───────────────────────────────────────────────────────────
/**
 * Refresh Token Rotation Flow:
 * 1. Client sends expired access token + valid refresh token (in cookie)
 * 2. Server validates refresh token
 * 3. Server issues NEW access + refresh tokens
 * 4. Server INVALIDATES the old refresh token (rotation)
 * 5. If the old refresh token was already used → possible token theft → invalidate all
 */
export const refreshAccessToken = catchAsync(async (req, res, next) => {
  // 1. Get refresh token from cookie
  const refreshTokenCookie = req.cookies?.refreshToken;
  if (!refreshTokenCookie) {
    return next(new AppError('No refresh token provided. Please log in again.', 401));
  }

  // 2. Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    clearTokenCookies(res);
    return next(new AppError('Invalid or expired refresh token. Please log in again.', 401));
  }

  // 3. Find user and check if refresh token matches (rotation check)
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user) {
    clearTokenCookies(res);
    return next(new AppError('User not found. Please log in again.', 401));
  }

  // 4. Check if the refresh token matches the stored one
  //    If it doesn't match, someone may have stolen the old token
  if (user.refreshToken !== refreshTokenCookie) {
    // Possible token reuse attack — invalidate all refresh tokens
    user.refreshToken = '';
    await user.save({ validateBeforeSave: false });
    clearTokenCookies(res);
    return next(
      new AppError('Token reuse detected. All sessions invalidated. Please log in again.', 401)
    );
  }

  // 5. Generate new token pair (ROTATION)
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // 6. Store new refresh token (old one is now invalid)
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  // 7. Set new cookies + refresh CSRF token
  setTokenCookies(res, newAccessToken, newRefreshToken);
  const csrfToken = generateCsrfToken(res);

  res.status(200).json({
    status: 'success',
    message: 'Tokens refreshed successfully',
    csrfToken,
  });
});

// ─── GET CURRENT USER ────────────────────────────────────────────────────────
export const getMe = catchAsync(async (req, res, next) => {
  // req.user is set by the protect middleware
  const user = await User.findById(req.user._id)
    .populate('wishlist', 'title slug images price discountPrice brand category');

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
export const updateProfile = catchAsync(async (req, res, next) => {
  // Prevent password update through this route
  if (req.body.password || req.body.role) {
    return next(
      new AppError('This route is not for password or role updates. Use the dedicated endpoints.', 400)
    );
  }

  const updateData = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.email) updateData.email = req.body.email;

  // Handle avatar file upload (if multer processed a file)
  if (req.file) {
    const { cloudinary } = await import('../config/cloudinary.js');
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'techvault/avatars',
          resource_type: 'image',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto:best', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    updateData.avatar = result.secure_url;
  } else if (req.body.avatar !== undefined) {
    // Allow setting avatar via URL string (for removal or external URLs)
    updateData.avatar = req.body.avatar;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user: updatedUser },
  });
});

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────
export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Get user with password
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // 2. Verify current password
  const isCorrect = await user.comparePassword(currentPassword);
  if (!isCorrect) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  // 3. Update password (triggers pre-save bcrypt hook)
  user.password = newPassword;
  await user.save();

  // 4. Issue new tokens (old ones are invalidated by password change)
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  setTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
  });
});

// ─── ADDRESS MANAGEMENT ─────────────────────────────────────────────────────

export const addAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // If this is set as default, unset all other defaults
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // If first address, make it default
  if (user.addresses.length === 0) {
    req.body.isDefault = true;
  }

  user.addresses.push(req.body);
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    message: 'Address added successfully',
    data: { addresses: user.addresses },
  });
});

export const updateAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return next(new AppError('Address not found.', 404));
  }

  // If setting as default, unset all others
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  Object.assign(address, req.body);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Address updated successfully',
    data: { addresses: user.addresses },
  });
});

export const deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return next(new AppError('Address not found.', 404));
  }

  address.deleteOne();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Address removed successfully',
    data: { addresses: user.addresses },
  });
});

// ─── WISHLIST MANAGEMENT ─────────────────────────────────────────────────────

export const getWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('wishlist', 'title slug images price discountPrice brand category rating stock');

  res.status(200).json({
    status: 'success',
    results: user.wishlist.length,
    data: { wishlist: user.wishlist },
  });
});

export const addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  // Atomic $addToSet prevents duplicates
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).populate('wishlist', 'title slug images price discountPrice brand category rating stock');

  res.status(200).json({
    status: 'success',
    message: 'Added to wishlist',
    data: { wishlist: user.wishlist },
  });
});

export const removeFromWishlist = catchAsync(async (req, res, next) => {
  // Atomic $pull
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: req.params.productId } },
    { new: true }
  ).populate('wishlist', 'title slug images price discountPrice brand category rating stock');

  res.status(200).json({
    status: 'success',
    message: 'Removed from wishlist',
    data: { wishlist: user.wishlist },
  });
});

// ─── DELETE ACCOUNT (Remove ALL user data) ───────────────────────────────────
export const deleteAccount = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Dynamically import models to avoid circular dependency issues
  const Order = (await import('../models/Order.js')).default;
  const Cart = (await import('../models/Cart.js')).default;
  const Review = (await import('../models/Review.js')).default;

  // Optional models that may or may not exist
  let Return, StockNotification, AuditLog;
  try { Return = (await import('../models/Return.js')).default; } catch {}
  try { StockNotification = (await import('../models/StockNotification.js')).default; } catch {}
  try { AuditLog = (await import('../models/AuditLog.js')).default; } catch {}

  // Delete all user data
  await Promise.all([
    Order.deleteMany({ user: userId }),
    Cart.deleteMany({ user: userId }),
    Review.deleteMany({ user: userId }),
    Return && Return.deleteMany({ user: userId }),
    StockNotification && StockNotification.deleteMany({ user: userId }),
    AuditLog && AuditLog.deleteMany({ user: userId }),
  ].filter(Boolean));

  // Delete the user itself
  await User.findByIdAndDelete(userId);

  // Clear auth cookies (using shared utility for consistency)
  clearTokenCookies(res);

  res.status(200).json({
    status: 'success',
    message: 'Account and all associated data deleted successfully.',
  });
});
